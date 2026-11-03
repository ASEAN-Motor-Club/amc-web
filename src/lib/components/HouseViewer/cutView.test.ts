import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Plane } from 'three';
import { createCutView } from './cutView.ts';
import { CUT_ANIM_S, CUT_HEIGHT_M } from './constants.ts';

/** A box of the given size whose bottom sits at `bottomY` (plot level is y = 0). */
const building = (size: [number, number, number], bottomY = 0) => {
  const mesh = new Mesh(new BoxGeometry(...size), new MeshStandardMaterial());
  mesh.position.y = bottomY + size[1] / 2;
  const group = new Group();
  group.add(mesh);
  return { group, mesh };
};

/** 10 × 7 × 10 m — a house shell; far bigger than any piece of furniture. */
const house = (bottomY = 0) => building([10, 7, 10], bottomY);
const sofa = () => building([2, 0.8, 1]);

const run = (update: (dt: number) => void, seconds: number, step = 1 / 60) => {
  for (let t = 0; t < seconds; t += step) update(step);
};

const constantOf = (mesh: Mesh) =>
  ((mesh.material as MeshStandardMaterial).clippingPlanes?.[0] as Plane | undefined)?.constant;
const isClipped = (mesh: Mesh) => (mesh.material as MeshStandardMaterial).clippingPlanes != null;

describe('createCutView', () => {
  it('clips the shell only, never the furniture', () => {
    const cut = createCutView();
    const shell = house();
    const couch = sofa();
    cut.register(shell.group);
    cut.register(couch.group);

    expect(isClipped(shell.mesh)).toBe(true);
    // Cut walls have to show their inside, or they render as hollow paper.
    expect((shell.mesh.material as MeshStandardMaterial).side).toBe(2);
    expect((shell.mesh.material as MeshStandardMaterial).clipShadows).toBe(true);

    expect(isClipped(couch.mesh)).toBe(false);
    expect(couch.group.visible).toBe(true);
  });

  it('measures the cut from the shell base, so an elevated house cuts above its own floor', () => {
    const cut = createCutView();
    const shell = house(2.5); // stilted: the floor sits 2.5 m above plot level
    cut.register(shell.group);

    cut.setEnabled(true);
    run(cut.update, CUT_ANIM_S * 2);
    expect(constantOf(shell.mesh)).toBeCloseTo(2.5 + CUT_HEIGHT_M, 5);
  });

  it('hides what sits above the cut instead of leaving it floating', () => {
    const cut = createCutView();
    const shell = house();
    cut.register(shell.group);
    const upstairs = building([6, 3, 6], 7); // stacked on the roof
    cut.register(upstairs.group);
    const lamp = building([0.4, 0.2, 0.4], 3); // ceiling light
    cut.register(lamp.group);

    cut.setEnabled(true);
    run(cut.update, CUT_ANIM_S * 2);
    expect(upstairs.group.visible).toBe(false);
    expect(lamp.group.visible).toBe(false);

    cut.setEnabled(false);
    run(cut.update, CUT_ANIM_S * 2);
    expect(upstairs.group.visible).toBe(true);
    expect(lamp.group.visible).toBe(true);
  });

  it('is already cut when the shell arrives after the toggle', () => {
    const cut = createCutView();
    cut.setEnabled(true);

    const shell = house();
    cut.register(shell.group);
    expect(constantOf(shell.mesh)).toBeCloseTo(CUT_HEIGHT_M, 5);
  });

  it('puts the plane back above the roof when disabled', () => {
    const cut = createCutView();
    const shell = house();
    cut.register(shell.group);

    cut.setEnabled(true);
    run(cut.update, CUT_ANIM_S * 2);
    cut.setEnabled(false);
    run(cut.update, CUT_ANIM_S * 2);
    expect(constantOf(shell.mesh)).toBeGreaterThanOrEqual(7);
  });
});
