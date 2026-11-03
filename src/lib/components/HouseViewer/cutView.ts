import * as THREE from 'three';
import { CUT_ANIM_S, CUT_HEIGHT_M } from './constants.ts';

/**
 * Cut view ("dollhouse"): slice the house shell at head height so the inside is visible. Walls and
 * roof go, everything below the cut stays — furniture is never clipped, and nothing placed above
 * the cut (a building stacked on another, a ceiling lamp) is left floating in mid-air.
 *
 * The house API carries no row type, so the shell is elected by size: on a housing plot the shell
 * is the largest building by bounding-box volume by a wide margin (a house is hundreds of cubic
 * metres; a sofa roughly one, a parking bay a flat slab). The cut is measured from the shell's own
 * base, which is what makes stilted, sunken and stacked plots behave.
 */
export interface CutView {
  /** Every building instance as it lands in the scene. */
  register: (instance: THREE.Object3D) => void;
  /** Slice the house open (true) or put the roof back (false). */
  setEnabled: (on: boolean) => void;
  /** Advance the reveal animation. */
  update: (deltaSeconds: number) => void;
}

type MaterialOrMaterials = THREE.Material | THREE.Material[];
interface Entry {
  object: THREE.Object3D;
  box: THREE.Box3;
  volume: number;
  /** Materials as they were before clipping, so the shell can be re-elected as models stream in. */
  originals: Map<THREE.Mesh, MaterialOrMaterials>;
}

/** Above any house, so an "off" plane clips nothing. Finite: Infinity turns into NaN in the shader. */
const NO_CUT_Y = 1e6;

export function createCutView(): CutView {
  // Keeps geometry where `-y + constant > 0`, i.e. below `constant`: the constant *is* the cut height.
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), NO_CUT_Y);
  /** Source material → clipped clone. GLTF clones share materials, so one clone per source. */
  const clones = new Map<THREE.Material, THREE.Material>();
  const entries: Entry[] = [];

  let shell: Entry | undefined;
  /** Cut height, measured from the shell's own base rather than from plot level. */
  let cutY = CUT_HEIGHT_M;
  /** Top of the shell: where the plane starts before it drops to the cut height. */
  let roofY = CUT_HEIGHT_M;
  let current = NO_CUT_Y;
  let target = NO_CUT_Y;
  let enabled = false;

  function clipMaterial(material: THREE.Material): THREE.Material {
    const existing = clones.get(material);
    if (existing) return existing;
    const clone = material.clone();
    clone.clippingPlanes = [plane];
    clone.clipShadows = true;
    // A cut wall shows its inside; single-sided materials would render as hollow paper.
    clone.side = THREE.DoubleSide;
    clones.set(material, clone);
    return clone;
  }

  function clipEntry(entry: Entry) {
    entry.object.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      entry.originals.set(object, object.material);
      object.material = Array.isArray(object.material)
        ? object.material.map(clipMaterial)
        : clipMaterial(object.material);
    });
  }

  function unclipEntry(entry: Entry) {
    for (const [mesh, material] of entry.originals) mesh.material = material;
    entry.originals.clear();
  }

  function syncPlane() {
    plane.constant = current;
  }

  /** Elect the shell, re-derive the cut, and update what is hidden above it. */
  function retarget() {
    let largest: Entry | undefined;
    for (const entry of entries) {
      if (!largest || entry.volume > largest.volume) largest = entry;
    }

    if (largest !== shell) {
      if (shell) unclipEntry(shell);
      shell = largest;
      if (shell) clipEntry(shell);
    }

    if (shell) {
      roofY = Math.max(shell.box.max.y, shell.box.min.y + CUT_HEIGHT_M);
      cutY = shell.box.min.y + CUT_HEIGHT_M;
    } else {
      roofY = CUT_HEIGHT_M;
      cutY = CUT_HEIGHT_M;
    }

    // Anything sitting entirely above the cut is hidden rather than left hanging in the air.
    for (const entry of entries) {
      if (entry === shell) continue;
      entry.object.visible = !enabled || entry.box.min.y < cutY;
    }

    // Models stream in after the toggle: whatever arrives late is already cut.
    if (enabled) {
      current = target = cutY;
      syncPlane();
    } else if (current === NO_CUT_Y) {
      current = target = roofY;
      syncPlane();
    }
  }

  return {
    register(instance) {
      // Measuring needs world matrices; nothing has rendered yet at load time.
      instance.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(instance);
      const size = box.getSize(new THREE.Vector3());
      entries.push({
        object: instance,
        box,
        volume: Math.max(0, size.x * size.y * size.z),
        originals: new Map(),
      });
      retarget();
    },

    setEnabled(on) {
      if (enabled === on) return;
      enabled = on;
      if (on) {
        // Drop from the roof so the reveal reads as a cut, not a pop.
        current = Math.max(current === NO_CUT_Y ? roofY : current, roofY);
        target = cutY;
      } else {
        target = roofY;
      }
      for (const entry of entries) {
        if (entry === shell) continue;
        entry.object.visible = !on || entry.box.min.y < cutY;
      }
      syncPlane();
    },

    update(deltaSeconds) {
      if (current === target) return;
      // Constant speed: the roof drops in about CUT_ANIM_S whatever the house height.
      const speed = Math.max(1, roofY - cutY) / CUT_ANIM_S;
      const step = speed * deltaSeconds;
      current =
        Math.abs(target - current) <= step ? target : current + Math.sign(target - current) * step;
      syncPlane();
    },
  };
}
