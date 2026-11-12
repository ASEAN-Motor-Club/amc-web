import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraRig } from './cameraRig.ts';
import {
  CAMERA_FOV_DEG,
  FOG_FAR,
  LOOK_UP_ANGLE_FAR_DEG,
  LOOK_UP_ANGLE_NEAR_DEG,
  ROTATE_SPEED_FAR,
  PERSPECTIVE_MAX_DISTANCE,
  PERSPECTIVE_START_DISTANCE,
  ROTATE_SPEED_NEAR,
  ROTATION_LERP_DISTANCE,
  ZOOM_DAMPING_FACTOR,
} from './constants.ts';
import type { TilesMeta } from './three-map-types.ts';
import { worldXZToPx, zoomForMetersPerCssPx, type MapViewState } from './view.ts';
import { wheelLogDelta } from './wheel.ts';

export interface PerspectiveRig extends CameraRig {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

/**
 * The tilting 3D rig. `OrbitControls` is deliberately hobbled: `{ LEFT: null, MIDDLE: DOLLY,
 * RIGHT: ROTATE }`, no pan, no built-in zoom. Custom drivers replace the defaults: an inertial
 * exponential wheel/button zoom here, and the ground-anchored left-drag pan in `groundPan.ts`.
 * Rotate speed and the look-up cap lerp with the zoom fraction in `update(dt)`.
 */
export function createPerspectiveRig(
  renderer: Renderer,
  meta: TilesMeta,
  minDistance = 30,
): PerspectiveRig {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV_DEG,
    window.innerWidth / window.innerHeight,
    // The near plane must sit inside the zoom range: close-up editors (minDistance 4 m)
    // need a tight near plane, the main map keeps the default 5 m.
    Math.min(5, minDistance * 0.4),
    FOG_FAR,
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = minDistance;
  controls.maxDistance = PERSPECTIVE_MAX_DISTANCE;

  camera.position.set(0, PERSPECTIVE_START_DISTANCE, 0);
  camera.lookAt(controls.target);
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.enablePan = false;
  controls.enableZoom = false;

  let zoomLog = 0;
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const deltaLog = wheelLogDelta(event);
    if (deltaLog !== 0 && zoomLog > 0 !== deltaLog > 0) {
      zoomLog = 0;
    }
    zoomLog += deltaLog;
  };
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  function integrateZoom(dt: number): void {
    if (zoomLog === 0) return;
    const offset = camera.position.clone().sub(controls.target);
    const distance = offset.length();
    const newDistance = THREE.MathUtils.clamp(
      distance * Math.exp(zoomLog),
      controls.minDistance,
      controls.maxDistance,
    );
    offset.setLength(newDistance);
    camera.position.copy(controls.target).add(offset);
    zoomLog *= Math.pow(1 - ZOOM_DAMPING_FACTOR, dt * 60);
    if (Math.abs(zoomLog) < 0.002) zoomLog = 0;
  }
  /** Pending zoom-button travel in accumulator log-units. Buttons feed this
   * instead of teleporting the camera, so each click glides. */
  let buttonZoomPending = 0;

  // Shift+left-drag rotates. OrbitControls hardcodes "modifiers on a ROTATE mapping =
  // pan", and pan is disabled — so shift+left mapped to ROTATE would do nothing.
  // The inverse trick works: mapping LEFT to PAN makes the modifier branch take the
  // ROTATE path (enableRotate is on), while the no-modifier path is a no-op because
  // enablePan is false (and groundPan ignores shift presses anyway). OrbitControls
  // reads mouseButtons at pointerdown, so a mid-press switch is harmless.
  const setShiftRotate = (event: KeyboardEvent): void => {
    if (event.key !== 'Shift' || event.repeat) return;
    controls.mouseButtons = { ...controls.mouseButtons, LEFT: THREE.MOUSE.PAN };
  };
  const clearShiftRotate = (event: KeyboardEvent): void => {
    if (event.key !== 'Shift') return;
    controls.mouseButtons = { ...controls.mouseButtons, LEFT: null };
  };
  window.addEventListener('keydown', setShiftRotate);
  window.addEventListener('keyup', clearShiftRotate);
  // A shift release between a drag's pointerdown and pointerup would leave OrbitControls
  // rotating without the button mapped - re-sync on blur (alt-tab, window switch).
  const clearShiftRotateOnBlur = (): void => {
    controls.mouseButtons = { ...controls.mouseButtons, LEFT: null };
  };
  window.addEventListener('blur', clearShiftRotateOnBlur);

  /** The view's CSS height (not the canvas's: the canvas may be larger), set by `resize`. */
  let viewHeight = renderer.domElement.clientHeight;
  return {
    camera,
    controls,
    update(dt) {
      const distance = camera.position.distanceTo(controls.target);
      const t = THREE.MathUtils.clamp(
        (distance - controls.minDistance) / (ROTATION_LERP_DISTANCE - controls.minDistance),
        0,
        1,
      );
      controls.rotateSpeed = THREE.MathUtils.lerp(ROTATE_SPEED_NEAR, ROTATE_SPEED_FAR, t);
      controls.maxPolarAngle = THREE.MathUtils.degToRad(
        THREE.MathUtils.lerp(LOOK_UP_ANGLE_NEAR_DEG, LOOK_UP_ANGLE_FAR_DEG, t),
      );
      // Drain queued button clicks into the shared inertial accumulator.
      if (buttonZoomPending !== 0) {
        zoomLog += buttonZoomPending;
        buttonZoomPending = 0;
      }
      integrateZoom(dt);
      controls.update();
    },
    stepBy(logStep) {
      // Damping DECAYS the queue each frame, so the accumulator integrates
      // ~1/ZOOM_DAMPING_FACTOR (≈2.86x) of whatever it holds. Queue the deficit
      // complement so the glide lands exactly on logStep.
      buttonZoomPending += logStep * ZOOM_DAMPING_FACTOR;
    },
    getViewState(): MapViewState {
      // The visible world height at the target (distance * 2 tan(fov/2)) over the view height
      // is the same metres-per-CSS-px an orthographic view at that zoom would show.
      const distance = camera.position.distanceTo(controls.target);
      const visibleHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const cssHeight = Math.max(viewHeight, 1);
      return {
        center: worldXZToPx(controls.target.x, controls.target.z, meta),
        zoom: zoomForMetersPerCssPx(visibleHeight / cssHeight),
      };
    },
    resize(width, height) {
      viewHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose() {
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', setShiftRotate);
      window.removeEventListener('keyup', clearShiftRotate);
      window.removeEventListener('blur', clearShiftRotateOnBlur);
    },
  };
}
