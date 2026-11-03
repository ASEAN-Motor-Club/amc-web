import * as THREE from 'three';
import { CUT_ANIM_S, CUT_HEIGHT_M } from './constants.ts';

/**
 * Cut view ("dollhouse"): slice the whole diorama at head height so the inside is visible — the
 * walls, roof and anything hanging above the cut (ceiling lights) disappear, the furniture below
 * stays.
 *
 * Clipping is per material, which is what makes this cheap: nothing is cut geometrically, and
 * because every building is its own instance the furniture below the plane is simply untouched.
 *
 * No "shell vs furniture" test is needed: the world dump carries no row type, and a plane at head
 * height removes the shell while leaving the room readable.
 */
export interface CutView {
  /** Every building instance as it lands in the scene. */
  register: (instance: THREE.Object3D) => void;
  /** Slice the house open (true) or put the roof back (false). */
  setEnabled: (on: boolean) => void;
  /** Advance the reveal animation. */
  update: (deltaSeconds: number) => void;
}

/** Above any house, so an "off" plane clips nothing. Finite: Infinity turns into NaN in the shader. */
const NO_CUT_Y = 1e6;

export function createCutView(): CutView {
  // Keeps geometry where `-y + constant > 0`, i.e. below `constant`: the constant *is* the cut height.
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), NO_CUT_Y);
  /** Source material → clipped clone. GLTF clones share materials, so one clone per source. */
  const clones = new Map<THREE.Material, THREE.Material>();

  /** Highest geometry seen so far: where the plane starts before it drops to the cut height. */
  let topY = CUT_HEIGHT_M;
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

  function syncPlane() {
    plane.constant = current;
  }

  return {
    register(instance) {
      // Measuring needs world matrices; nothing has rendered yet at load time.
      instance.updateMatrixWorld(true);
      instance.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material)
          ? object.material.map(clipMaterial)
          : clipMaterial(object.material);
      });

      const box = new THREE.Box3().setFromObject(instance);
      topY = Math.max(topY, box.max.y);

      // Models stream in after the toggle: whatever arrives late is already cut.
      if (enabled) {
        current = CUT_HEIGHT_M;
      } else if (current === NO_CUT_Y) {
        current = target = topY;
      }
      syncPlane();
    },

    setEnabled(on) {
      if (enabled === on) return;
      enabled = on;
      // Drop from the roof, not from wherever the plane happened to be: re-enabling mid-animation
      // should replay the reveal instead of slicing the house open in one frame.
      if (on) current = Math.max(current, topY);
      target = on ? CUT_HEIGHT_M : topY;
      syncPlane();
    },

    update(deltaSeconds) {
      if (current === target) return;
      // Constant speed: the roof drops in about CUT_ANIM_S whatever the house height.
      const speed = Math.max(1, topY - CUT_HEIGHT_M) / CUT_ANIM_S;
      const step = speed * deltaSeconds;
      current =
        Math.abs(target - current) <= step ? target : current + Math.sign(target - current) * step;
      syncPlane();
    },
  };
}
