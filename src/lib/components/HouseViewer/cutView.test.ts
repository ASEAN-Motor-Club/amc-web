import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Plane } from 'three';
import { createCutView } from './cutView.ts';
import { CUT_ANIM_S, CUT_HEIGHT_M } from './constants.ts';

/** A box sitting on y = 0 with the given size, registering like a loaded building would. */
const building = (sizeY: number, offsetY = 0) => {
  const mesh = new Mesh(new BoxGeometry(2, sizeY, 2), new MeshStandardMaterial());
  mesh.position.y = offsetY + sizeY / 2;
  const group = new Group();
  group.add(mesh);
  return { group, mesh };
};

const run = (update: (dt: number) => void, seconds: number, step = 1 / 60) => {
  for (let t = 0; t < seconds; t += step) update(step);
};

const constantOf = (mesh: Mesh) =>
  ((mesh.material as MeshStandardMaterial).clippingPlanes?.[0] as Plane | undefined)?.constant;

describe('createCutView', () => {
  it('gives every registered mesh a clipping plane and a visible inside', () => {
    const cut = createCutView();
    const shell = building(3);
    const sofa = building(0.8);
    cut.register(shell.group);
    cut.register(sofa.group);

    for (const mesh of [shell.mesh, sofa.mesh]) {
      const material = mesh.material as MeshStandardMaterial;
      expect(material.clippingPlanes).toHaveLength(1);
      expect(material.side).toBe(2);
      expect(material.clipShadows).toBe(true);
    }
  });

  it('drops the plane to head height when enabled and back above the house when not', () => {
    const cut = createCutView();
    const house = building(7);
    cut.register(house.group);

    // Nothing is clipped before the toggle: the plane starts at the roof.
    expect(constantOf(house.mesh)).toBeCloseTo(7, 5);

    cut.setEnabled(true);
    run(cut.update, CUT_ANIM_S * 2);
    expect(constantOf(house.mesh)).toBeCloseTo(CUT_HEIGHT_M, 5);

    cut.setEnabled(false);
    run(cut.update, CUT_ANIM_S * 2);
    expect(constantOf(house.mesh)).toBeGreaterThanOrEqual(7);
  });

  it('cuts models that arrive after the toggle', () => {
    const cut = createCutView();
    cut.register(building(7).group);
    cut.setEnabled(true);
    run(cut.update, CUT_ANIM_S * 2);

    const late = building(6);
    cut.register(late.group);
    expect(constantOf(late.mesh)).toBeCloseTo(CUT_HEIGHT_M, 5);
  });
});
