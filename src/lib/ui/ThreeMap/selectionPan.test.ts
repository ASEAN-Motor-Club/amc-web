import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SELECTION_PAN_DURATION_S } from './constants';
import { createSelectionPan } from './selectionPan';

/** Camera high above the map looking down at the origin, tilted so the
 * view axis actually crosses ground planes. */
function makeRig() {
  const camera = new THREE.PerspectiveCamera(55, 16 / 9);
  camera.position.set(0, 30000, 12000);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const target = new THREE.Vector3();
  // Mirrors real OrbitControls: update() re-syncs the camera's world matrices
  // (in-app each render does this), keeping raycasts frame-correct.
  const controls = {
    target,
    update: () => {
      camera.updateMatrixWorld();
    },
  } as unknown as OrbitControls;
  return { camera, controls };
}
/** Ground-plane distance from what the screen center covers to the marker -
 * mirrors the pan invariant: rigid translation keeps this meaningful. */
function centerGap(camera: THREE.Camera, x: number, z: number): number {
  // The pan mutates camera.position without re-rendering; sync its matrices
  // so the probe raycast sees the move.
  camera.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const ok = ray.ray.intersectPlane(plane, hit);
  return ok ? Math.hypot(x - hit.x, z - hit.z) : Infinity;
}

function fakeDom() {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLElement;
}

const MARKER = [7000, 0, -4000] as const;

describe('createSelectionPan', () => {
  it('glides across many frames and lands exactly on the marker', () => {
    const { camera, controls } = makeRig();
    const pan = createSelectionPan(fakeDom(), camera, controls);
    pan.panTo(...MARKER);

    let previous = centerGap(camera, MARKER[0], MARKER[2]);
    expect(previous).toBeGreaterThan(0);

    for (let i = 0; i < Math.ceil(SELECTION_PAN_DURATION_S / 0.05); i++) {
      pan.update(0.05);
      const gap = centerGap(camera, MARKER[0], MARKER[2]);
      expect(gap).toBeLessThan(previous);
      previous = gap;
    }
    // Fully consumed: one past the end clears the goal.
    pan.update(0.05);
    expect(centerGap(camera, MARKER[0], MARKER[2])).toBeLessThan(0.01);
  });

  it('redirects mid-flight to the latest goal', () => {
    const { camera, controls } = makeRig();
    const pan = createSelectionPan(fakeDom(), camera, controls);
    pan.panTo(20000, 0, 15000);
    pan.update(SELECTION_PAN_DURATION_S / 2);
    pan.panTo(...MARKER);
    for (let i = 0; i < Math.ceil(SELECTION_PAN_DURATION_S / 0.1); i++) {
      pan.update(0.1);
    }
    // Lands on B, not on the abandoned A.
    expect(centerGap(camera, MARKER[0], MARKER[2])).toBeLessThan(0.01);
    expect(centerGap(camera, 20000, 15000)).toBeGreaterThan(1000);
  });

  it('cancels the glide when the user presses the left button', () => {
    const dom = fakeDom();
    const { camera, controls } = makeRig();
    const pan = createSelectionPan(dom, camera, controls);
    pan.panTo(...MARKER);
    pan.update(SELECTION_PAN_DURATION_S / 4);
    const stuckCamera = camera.position.clone();
    const onPointerDown = vi
      .mocked(dom.addEventListener)
      .mock.calls.find(([type]) => type === 'pointerdown')?.[1] as unknown as (event: {
      button: number;
    }) => void;
    onPointerDown({ button: 0 });

    pan.update(SELECTION_PAN_DURATION_S);
    expect(camera.position.equals(stuckCamera)).toBe(true);
  });

  it('ignores goals closer than the snap epsilon and outside reach', () => {
    const { camera, controls } = makeRig();
    const pan = createSelectionPan(fakeDom(), camera, controls);
    // Marker sits under the screen center already.
    pan.panTo(-0.5, 0, 0);
    const before = camera.position.clone();
    pan.update(SELECTION_PAN_DURATION_S);
    expect(camera.position.equals(before)).toBe(true);
  });

  it('removes its canvas listener on dispose', () => {
    const dom = fakeDom();
    const { camera, controls } = makeRig();
    const pan = createSelectionPan(dom, camera, controls);
    pan.dispose();
    expect(vi.mocked(dom.removeEventListener)).toHaveBeenCalledWith(
      'pointerdown',
      expect.any(Function),
    );
  });
});
