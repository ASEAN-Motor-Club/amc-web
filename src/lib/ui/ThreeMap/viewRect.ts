import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';

/**
 * The renderer's viewport IS the map's view: the canvas may be larger than what the user sees (the
 * map keeps one fixed size behind an animating sidebar), and everything is drawn into its top-left
 * `view` rectangle. These helpers are the one place that rectangle is written and read, so camera
 * aspect, pixel snapping, hit-testing and the screen-space shaders (`viewportSize`) all agree on it.
 */

/**
 * three floors `viewport * pixelRatio` when it applies a viewport, while the shaders read the
 * unfloored product. The rectangle is therefore stored as a whole device-pixel count plus this
 * sliver, so the floor lands exactly on that count despite float error and the two never differ
 * by more than a thousandth of a pixel.
 */
const VIEW_EPSILON_DEVICE_PX = 1e-3;

const _viewport = new THREE.Vector4();

/** Draws into the top-left `cssWidth` x `cssHeight` CSS px of the canvas (at least one device px). */
export function setViewRect(renderer: Renderer, cssWidth: number, cssHeight: number): void {
  const ratio = renderer.getPixelRatio();
  const device = (css: number) => Math.max(Math.floor(css * ratio), 1) + VIEW_EPSILON_DEVICE_PX;
  renderer.setViewport(0, 0, device(cssWidth) / ratio, device(cssHeight) / ratio);
}

/** The view rectangle in device px - the drawing buffer the shaders and the pixel snapping see. */
export function getViewBufferSize(renderer: Renderer, target: THREE.Vector2): THREE.Vector2 {
  renderer.getViewport(_viewport);
  const ratio = renderer.getPixelRatio();
  return target.set(Math.floor(_viewport.z * ratio), Math.floor(_viewport.w * ratio));
}

/** The view rectangle in CSS px (what pointer coordinates are measured against). */
export function getViewCssSize(renderer: Renderer, target: THREE.Vector2): THREE.Vector2 {
  getViewBufferSize(renderer, target);
  return target.divideScalar(renderer.getPixelRatio());
}
