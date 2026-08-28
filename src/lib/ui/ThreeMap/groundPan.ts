import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PAN_DAMPING_FACTOR, PAN_FLING_SAMPLE_MS } from './constants';

export function setupGroundPan(
  renderer: Renderer,
  camera: THREE.Camera,
  controls: OrbitControls,
  tileGroup: THREE.Group,
) {
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const panPlane = new THREE.Plane();
  const grabbedPoint = new THREE.Vector3();
  const currentPoint = new THREE.Vector3();

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
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    panVelocity = null;
    samples.length = 0;
    setPointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(tileGroup.children, false);
    if (hits.length === 0) return;
    grabbedPoint.copy(hits[0].point);
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
    dispose() {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', endPan);
      dom.removeEventListener('pointercancel', endPan);
    },
  };
}
