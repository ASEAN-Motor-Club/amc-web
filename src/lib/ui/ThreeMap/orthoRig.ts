import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import { prefersReducedMotion } from 'svelte/motion';
import type { CameraRig, MapControls, ZoomAnchor } from './cameraRig.ts';
import { ORTHO_INITIAL_ZOOM, ORTHO_MAX_ZOOM, ZOOM_DAMPING_FACTOR } from './constants.ts';
import { anchoredCenter, clampOrthoCenter, inAndOut, orthoMinZoom } from './orthoView.ts';
import type { TilesMeta } from './three-map-types.ts';
import { metersPerCssPx, worldXZToPx, type MapViewState } from './view.ts';
import { wheelLogDelta } from './wheel.ts';

/** The camera sits this high over the map, looking straight down; the near/far planes bracket
 * the ground (and the overlays a few meters above it). */
const CAMERA_HEIGHT_M = 10_000;
/** A box smaller than this (CSS px², OL's DragZoom `minArea`) is a stray click, not a zoom box. */
const BOX_ZOOM_MIN_AREA_PX2 = 64 * 64;
const BOX_ZOOM_DURATION_S = 0.2;
/** Zoom-level change of one double-click, like OL's DoubleClickZoom. */
const DOUBLE_CLICK_ZOOM_LOG = Math.LN2;

export interface OrthoView {
  /** Centre in world XZ meters. */
  x: number;
  z: number;
  zoom: number;
}

export interface OrthoRig extends CameraRig {
  camera: THREE.OrthographicCamera;
  /** The current (fractional) zoom: the map's own zoom scale, 256 CSS px per whole map at 0. */
  zoom: () => number;
  /** Eases the view to a centre (and zoom, when given) like OL's `animate`; a duration of 0 jumps.
   * Any drag or wheel cancels it. */
  animateTo: (view: { x: number; z: number; zoom?: number }, durationS: number) => void;
}

export interface OrthoRigOptions {
  size: { width: number; height: number };
  initial?: Pick<OrthoView, 'x' | 'z'> & { zoom?: number };
  /** Called when a second finger lands: the single-finger pan must hand over to the pinch. */
  onPinchStart?: () => void;
}

class OrthoControls extends THREE.EventDispatcher<{ change: object }> implements MapControls {
  readonly target = new THREE.Vector3();
  constructor(private readonly applyState: () => void) {
    super();
  }
  update(): void {
    this.applyState();
  }
}

export function createOrthoRig(
  renderer: Renderer,
  meta: TilesMeta,
  options: OrthoRigOptions,
): OrthoRig {
  const dom = renderer.domElement;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_HEIGHT_M * 2);
  // North (-Z) is screen-up, east (+X) screen-right, so screen-down is +Z.
  camera.up.set(0, 0, -1);
  // Pans and pinches are the rig's: stop the browser claiming touch gestures for scrolling.
  dom.style.touchAction = 'none';

  const size = { width: options.size.width, height: options.size.height };
  let zoom = options.initial?.zoom ?? ORTHO_INITIAL_ZOOM;
  const last = { x: NaN, z: NaN, zoom: NaN, width: NaN, height: NaN };

  const controls = new OrthoControls(applyState);
  controls.target.set(options.initial?.x ?? 0, 0, options.initial?.z ?? 0);

  function minZoom(): number {
    return orthoMinZoom(meta, size.width);
  }

  /** Clamps zoom/centre to the view limits and re-derives the camera; raises `change` on movement. */
  function applyState(): void {
    zoom = Math.min(Math.max(zoom, minZoom()), ORTHO_MAX_ZOOM);
    const mpp = metersPerCssPx(zoom);
    const [x, z] = clampOrthoCenter(
      controls.target.x,
      controls.target.z,
      mpp,
      size.width,
      size.height,
      meta,
    );
    controls.target.set(x, 0, z);
    camera.left = (-size.width * mpp) / 2;
    camera.right = (size.width * mpp) / 2;
    camera.top = (size.height * mpp) / 2;
    camera.bottom = (-size.height * mpp) / 2;
    camera.updateProjectionMatrix();
    camera.position.set(x, CAMERA_HEIGHT_M, z);
    camera.lookAt(x, 0, z);
    camera.updateMatrixWorld();
    if (
      last.x !== x ||
      last.z !== z ||
      last.zoom !== zoom ||
      last.width !== size.width ||
      last.height !== size.height
    ) {
      Object.assign(last, { x, z, zoom, width: size.width, height: size.height });
      controls.dispatchEvent({ type: 'change' });
    }
  }

  /** Zooms to `nextZoom`, keeping the world point under `anchor` fixed on screen. */
  function zoomAbout(nextZoom: number, anchor: ZoomAnchor): void {
    const clamped = Math.min(Math.max(nextZoom, minZoom()), ORTHO_MAX_ZOOM);
    const [x, z] = anchoredCenter(
      controls.target.x,
      controls.target.z,
      metersPerCssPx(zoom),
      metersPerCssPx(clamped),
      anchor,
    );
    controls.target.set(x, 0, z);
    zoom = clamped;
  }

  /** Pointer position as a CSS-px offset from the view centre (y down). */
  function anchorOf(event: { clientX: number; clientY: number }): ZoomAnchor {
    const rect = dom.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - size.width / 2,
      y: event.clientY - rect.top - size.height / 2,
    };
  }

  // ---- inertial wheel / button zoom ----

  /** Zoom travel still to cover, in log units (positive zooms out). Each frame covers a fixed
   * fraction of it (frame-rate independent), so it glides in and lands exactly. */
  let zoomLog = 0;
  let anchor: ZoomAnchor = { x: 0, y: 0 };

  function addZoomLog(delta: number, at: ZoomAnchor): void {
    if (delta !== 0 && zoomLog > 0 !== delta > 0) zoomLog = 0;
    zoomLog += delta;
    anchor = at;
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    animation = undefined;
    // The wheel constants were tuned for an accumulator that integrates 1/ZOOM_DAMPING_FACTOR of
    // what it is fed; keep that gain so a notch feels the same as in 3D.
    addZoomLog(wheelLogDelta(event) / ZOOM_DAMPING_FACTOR, anchorOf(event));
  }
  dom.addEventListener('wheel', onWheel, { passive: false });

  function onDoubleClick(event: MouseEvent): void {
    // Double click zooms in a level, shift + double click out, like OL (positive steps zoom out).
    stepBy(event.shiftKey ? DOUBLE_CLICK_ZOOM_LOG : -DOUBLE_CLICK_ZOOM_LOG, anchorOf(event));
  }
  // The double-click's own two clicks already fired: only the canvas itself zooms.
  dom.addEventListener('dblclick', onDoubleClick);

  function stepBy(logStep: number, at: ZoomAnchor = { x: 0, y: 0 }): void {
    addZoomLog(logStep, at);
  }

  // ---- animated view changes (selection centring, box zoom) ----

  let animation: { from: OrthoView; to: OrthoView; t: number; duration: number } | undefined;

  function animateTo(view: { x: number; z: number; zoom?: number }, durationS: number): void {
    const to: OrthoView = {
      x: view.x,
      z: view.z,
      zoom: view.zoom ?? zoom,
    };
    if (durationS <= 0 && animation) {
      // A follow update mid-glide (a locked player moving): retarget the centre, let the glide and
      // its zoom finish, instead of cancelling them.
      animation.to.x = to.x;
      animation.to.z = to.z;
      return;
    }
    if (durationS <= 0 || prefersReducedMotion.current) {
      animation = undefined;
      zoom = to.zoom;
      controls.target.set(to.x, 0, to.z);
      applyState();
      return;
    }
    animation = {
      from: { x: controls.target.x, z: controls.target.z, zoom },
      to,
      t: 0,
      duration: durationS,
    };
  }

  // ---- pointers: pinch, box zoom, and handing a drag back from an animation ----

  const touches = new Map<number, { x: number; y: number }>();
  let pinch: { dist: number; mid: { x: number; y: number } } | undefined;
  let box:
    | { pointerId: number; startX: number; startY: number; el: HTMLDivElement; rect: DOMRect }
    | undefined;

  const touchPair = (): [{ x: number; y: number }, { x: number; y: number }] | undefined => {
    const [a, b] = [...touches.values()];
    return touches.size >= 2 ? [a, b] : undefined;
  };

  function readPinch(): { dist: number; mid: { x: number; y: number } } | undefined {
    const pair = touchPair();
    if (!pair) return undefined;
    const [a, b] = pair;
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button === 0) animation = undefined;
    if (event.pointerType !== 'mouse') {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) {
        pinch = readPinch();
        options.onPinchStart?.();
      }
      return;
    }
    if (event.button === 0 && event.shiftKey) {
      const rect = dom.getBoundingClientRect();
      const el = document.createElement('div');
      // OL's `.ol-dragzoom`: a red box with a faint white wash, over the map, ignoring the pointer.
      Object.assign(el.style, {
        position: 'absolute',
        boxSizing: 'border-box',
        border: '3px solid red',
        borderRadius: '2px',
        background: 'rgba(255, 255, 255, 0.4)',
        pointerEvents: 'none',
        left: `${event.clientX - rect.left}px`,
        top: `${event.clientY - rect.top}px`,
        width: '0px',
        height: '0px',
      });
      dom.parentElement?.appendChild(el);
      dom.setPointerCapture(event.pointerId);
      box = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        el,
        rect,
      };
    }
  }

  function onPointerMove(event: PointerEvent): void {
    const dragging = box;
    if (dragging?.pointerId === event.pointerId) {
      const { startX, startY, rect } = dragging;
      Object.assign(dragging.el.style, {
        left: `${Math.min(startX, event.clientX) - rect.left}px`,
        top: `${Math.min(startY, event.clientY) - rect.top}px`,
        width: `${Math.abs(event.clientX - startX)}px`,
        height: `${Math.abs(event.clientY - startY)}px`,
      });
      return;
    }
    const touch = touches.get(event.pointerId);
    if (!touch) return;
    touch.x = event.clientX;
    touch.y = event.clientY;
    const next = readPinch();
    if (!pinch || !next) return;
    // Two fingers: the content follows the midpoint, then zooms about it by the spread ratio.
    const rect = dom.getBoundingClientRect();
    const mpp = metersPerCssPx(zoom);
    controls.target.x -= (next.mid.x - pinch.mid.x) * mpp;
    controls.target.z -= (next.mid.y - pinch.mid.y) * mpp;
    zoomAbout(zoom + Math.log2(next.dist / Math.max(pinch.dist, 1)), {
      x: next.mid.x - rect.left - size.width / 2,
      y: next.mid.y - rect.top - size.height / 2,
    });
    pinch = next;
    zoomLog = 0;
  }

  function endPointer(event: PointerEvent): void {
    const dragging = box;
    if (dragging?.pointerId === event.pointerId) {
      const { startX, startY, rect } = dragging;
      dragging.el.remove();
      box = undefined;
      if (dom.hasPointerCapture(event.pointerId)) dom.releasePointerCapture(event.pointerId);
      const w = Math.abs(event.clientX - startX);
      const h = Math.abs(event.clientY - startY);
      if (event.type === 'pointerup' && w * h >= BOX_ZOOM_MIN_AREA_PX2) {
        // Fit the box: centre on it, zoom so it fills the viewport's tighter dimension.
        const mpp = metersPerCssPx(zoom);
        const cx = (startX + event.clientX) / 2 - rect.left - size.width / 2;
        const cz = (startY + event.clientY) / 2 - rect.top - size.height / 2;
        const fit = Math.min(size.width / w, size.height / h);
        animateTo(
          {
            x: controls.target.x + cx * mpp,
            z: controls.target.z + cz * mpp,
            zoom: zoom + Math.log2(fit),
          },
          BOX_ZOOM_DURATION_S,
        );
      }
      return;
    }
    touches.delete(event.pointerId);
    if (touches.size < 2) pinch = undefined;
  }

  dom.addEventListener('pointerdown', onPointerDown);
  dom.addEventListener('pointermove', onPointerMove);
  dom.addEventListener('pointerup', endPointer);
  dom.addEventListener('pointercancel', endPointer);

  applyState();

  return {
    camera,
    controls,
    zoom: () => zoom,
    animateTo,
    stepBy,
    update(dt) {
      if (animation) {
        animation.t = Math.min(animation.t + dt, animation.duration);
        const k = inAndOut(animation.t / animation.duration);
        const { from, to } = animation;
        controls.target.set(from.x + (to.x - from.x) * k, 0, from.z + (to.z - from.z) * k);
        zoom = from.zoom + (to.zoom - from.zoom) * k;
        if (animation.t >= animation.duration) animation = undefined;
      }
      if (zoomLog !== 0) {
        // Cover a fixed fraction of the remaining travel per 1/60 s, whatever the frame rate.
        const fraction = 1 - Math.pow(1 - ZOOM_DAMPING_FACTOR, dt * 60);
        const covered = Math.abs(zoomLog) < 0.0005 ? zoomLog : zoomLog * fraction;
        zoomLog -= covered;
        // Positive log = out: the zoom level falls by the log2 of the scale factor.
        zoomAbout(zoom - covered / Math.LN2, anchor);
      }
      applyState();
    },
    getViewState(): MapViewState {
      return { center: worldXZToPx(controls.target.x, controls.target.z, meta), zoom };
    },
    resize(width, height) {
      size.width = width;
      size.height = height;
      applyState();
    },
    dispose() {
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('dblclick', onDoubleClick);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', endPointer);
      dom.removeEventListener('pointercancel', endPointer);
      box?.el.remove();
    },
  };
}
