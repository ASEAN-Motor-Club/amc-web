import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import type { MapControls } from './cameraRig.ts';
import { PAN_DAMPING_FACTOR, PAN_FLING_SAMPLE_MS } from './constants.ts';
import { getViewCssSize } from './viewRect.ts';

export function createGroundPan(
  renderer: Renderer,
  camera: THREE.Camera,
  controls: MapControls,
  tileGroup: THREE.Group,
  /** Height of the plane grabbed when the press lands off every tile (the void past the map
   * edge, ocean beyond the tile grid), so a drag always pans. */
  fallbackPlaneY: number,
  /** Returns true when this press must not start a pan (e.g. a track-gate drag).
   * Queried synchronously inside pointerdown, before any state is taken. */
  isBlocked?: (event: PointerEvent) => boolean,
) {
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const panPlane = new THREE.Plane();
  const fallbackPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  const grabbedPoint = new THREE.Vector3();
  const currentPoint = new THREE.Vector3();
  const viewCss = new THREE.Vector2();

  let panning = false;

  interface PanSample {
    time: number;
    worldX: number;
    worldZ: number;
  }
  const samples: PanSample[] = [];
  let panVelocity: THREE.Vector3 | null = null;

  function setPointerNDC(event: PointerEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    getViewCssSize(renderer, viewCss);
    pointerNDC.x = ((event.clientX - rect.left) / viewCss.x) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / viewCss.y) * 2 + 1;
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    // Shift+left-drag rotates the camera (the rig hands LEFT to OrbitControls while
    // shift is held), so the pan must not grab that press.
    if (event.shiftKey) return;
    if (isBlocked?.(event)) return;
    panVelocity = null;
    samples.length = 0;
    setPointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(tileGroup.children, false);
    if (hits.length > 0) {
      grabbedPoint.copy(hits[0].point);
    } else {
      fallbackPlane.constant = -fallbackPlaneY;
      if (!raycaster.ray.intersectPlane(fallbackPlane, grabbedPoint)) return;
    }
    panPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), grabbedPoint);
    panning = true;
    renderer.domElement.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!panning) return;
    setPointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    if (!raycaster.ray.intersectPlane(panPlane, currentPoint)) return;
    const delta = grabbedPoint.clone().sub(currentPoint);
    camera.position.add(delta);
    controls.target.add(delta);
    samples.push({ time: performance.now(), worldX: delta.x, worldZ: delta.z });
    if (samples.length > 32) samples.shift();
  }

  function endPan(event: PointerEvent): void {
    if (!panning) return;
    panning = false;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    const now = performance.now();
    const cutoff = now - PAN_FLING_SAMPLE_MS;
    const window = samples.filter((s) => s.time >= cutoff);
    const totalX = window.reduce((a, s) => a + s.worldX, 0);
    const totalZ = window.reduce((a, s) => a + s.worldZ, 0);
    const dt = window.length > 0 ? (now - window[0].time) / 1000 : 0;
    if (dt > 0) {
      const vel = new THREE.Vector3(totalX / dt, 0, totalZ / dt);
      panVelocity = vel;
    }
    samples.length = 0;
  }

  /** Ends a pan in progress without a fling (a second finger took over, a gesture started). */
  function cancel(): void {
    if (!panning) return;
    panning = false;
    samples.length = 0;
    panVelocity = null;
  }

  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', onPointerDown);
  dom.addEventListener('pointermove', onPointerMove);
  dom.addEventListener('pointerup', endPan);
  dom.addEventListener('pointercancel', endPan);

  function update(dt: number): void {
    if (!panVelocity) return;
    const step = panVelocity.clone().multiplyScalar(dt);
    camera.position.add(step);
    controls.target.add(step);
    panVelocity.multiplyScalar(Math.pow(1 - PAN_DAMPING_FACTOR, dt * 60));
    if (panVelocity.lengthSq() < 0.25) panVelocity = null;
  }

  return {
    update,
    cancel,
    dispose() {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', endPan);
      dom.removeEventListener('pointercancel', endPan);
    },
  };
}
