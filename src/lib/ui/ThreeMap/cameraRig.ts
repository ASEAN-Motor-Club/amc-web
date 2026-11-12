import type * as THREE from 'three';
import type { MapViewState } from './view.ts';

/** What the scene, ground pan and tile manager need from a camera controller: a look-at target
 * on the map and a way to settle the camera after something else moved it. OrbitControls (the 3D
 * rig) and the orthographic rig both provide it. */
export interface MapControls {
  /** The map point the camera looks at (world meters). */
  target: THREE.Vector3;
  /** Re-derives the camera from its controller state; raises `change` when it moved. */
  update: () => unknown;
  addEventListener: (type: 'change', listener: () => void) => void;
  removeEventListener: (type: 'change', listener: () => void) => void;
}

/** Where a zoom gesture is anchored, in CSS px from the canvas centre (y down). */
export interface ZoomAnchor {
  x: number;
  y: number;
}

/** One camera + controller pair behind the scene: the tilting perspective rig or the flat
 * orthographic one. Zoom buttons, view state and per-frame stepping are rig concerns. */
export interface CameraRig {
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  controls: MapControls;
  /** Advances inertia/animation by `dt` seconds. */
  update: (dt: number) => void;
  /** Queues one zoom-button step (log units, positive zooms out); glides like the wheel. */
  stepBy: (logStep: number, anchor?: ZoomAnchor) => void;
  /** Where the map is looking, in the map's own px-space/zoom terms. */
  getViewState: () => MapViewState;
  /** The canvas CSS size changed. */
  resize: (width: number, height: number) => void;
  /** Removes the rig's global listeners. */
  dispose: () => void;
}
