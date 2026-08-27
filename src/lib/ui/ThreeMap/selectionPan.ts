import * as THREE from 'three';
import { prefersReducedMotion } from 'svelte/motion';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SELECTION_PAN_DURATION_S, SELECTION_PAN_SNAP_EPSILON } from './constants';

/** Glides the camera until the selected POI sits under the screen center - the
 * 3D counterpart of the OL view's `animate({ center })`. */
export interface SelectionPan {
  /** Re-targets the glide to a world point; calling again mid-flight redirects.
   * The servo idles once the goal is reached. */
  panTo: (x: number, y: number, z: number) => void;
  /** Advance the servo by the frame delta seconds. */
  update: (dt: number) => void;
  /** Removes the canvas listener that cancels the glide on manual pan. */
  dispose: () => void;
}

const PLANE_NORMAL = new THREE.Vector3(0, 1, 0);
const CENTER_NDC = new THREE.Vector2(0, 0);
const _ray = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _hit = new THREE.Vector3();

export function createSelectionPan(
  dom: HTMLElement,
  camera: THREE.Camera,
  controls: OrbitControls,
): SelectionPan {
  /** Ground-plane travel remaining, captured once per flight. Translating
   * camera and target rigidly leaves the center-ray hit moving with them, so
   * the measured delta stays valid for the whole glide. */
  let flight: { dx: number; dz: number; t: number } | undefined;

  // A left-drag grabs the ground: hand control straight back to the user
  // instead of fighting their hand with the still-active glide.
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button === 0) flight = undefined;
  };
  dom.addEventListener('pointerdown', onPointerDown);

  function applyPan(dx: number, dz: number): void {
    controls.target.x += dx;
    controls.target.z += dz;
    camera.position.x += dx;
    camera.position.z += dz;
    controls.update();
  }

  return {
    panTo(x, y, z) {
      _ray.setFromCamera(CENTER_NDC, camera);
      _plane.setFromNormalAndCoplanarPoint(PLANE_NORMAL, _hit.set(x, y, z));
      // Rays parallel to / above the marker's height plane have no screen-center
      // point to land on - nothing sensible to glide toward.
      if (!_ray.ray.intersectPlane(_plane, _hit)) {
        flight = undefined;
        return;
      }
      const dx = x - _hit.x;
      const dz = z - _hit.z;
      flight = Math.hypot(dx, dz) <= SELECTION_PAN_SNAP_EPSILON ? undefined : { dx, dz, t: 0 };
    },
    update(dt: number) {
      if (!flight) return;
      // Reduced motion gets the pre-transition behavior: land immediately.
      if (prefersReducedMotion.current) {
        applyPan(flight.dx, flight.dz);
        flight = undefined;
        return;
      }
      const duration = SELECTION_PAN_DURATION_S;
      const from = flight.t;
      flight.t = Math.min(from + dt, duration);
      // Ease-out cubic applied as a true increment (eased(to) - eased(from)) so
      // frames integrate exactly toward the captured delta - an absolute
      // fraction per frame would fling past the goal.
      const easedFrom = from >= duration ? 1 : 1 - Math.pow(1 - from / duration, 3);
      const easedTo = flight.t >= duration ? 1 : 1 - Math.pow(1 - flight.t / duration, 3);
      applyPan(flight.dx * (easedTo - easedFrom), flight.dz * (easedTo - easedFrom));
      if (flight.t >= duration) flight = undefined;
    },
    dispose() {
      dom.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
