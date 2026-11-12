import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WebGPURenderer } from 'three/webgpu';
import {
  CAMERA_FOV_DEG,
  FOG_FAR,
  FOG_NEAR,
  ORTHO_BACKGROUND,
  SUN_DISTANCE,
  TILE_UPDATE_INTERVAL_MS,
  TIME_OF_DAY_MS,
} from './constants.ts';
import type { CameraRig, MapControls, ZoomAnchor } from './cameraRig.ts';
import { createOrthoRig, type OrthoRig } from './orthoRig.ts';
import { createPerspectiveRig } from './perspectiveRig.ts';
import { createSelectionPan, type SelectionPan } from './selectionPan.ts';
import { motorTownSun } from './sun.ts';
import { createGroundPan } from './groundPan.ts';
import { TILES_META } from './heightmap.ts';
import { watchDevicePixelRatio, watchFontLoads } from './dpr.ts';
import { clampDelta, mapRect } from './mapRect.ts';
import { createPoiManager, type PoiManager } from './poiManager.ts';
import { createTileManager } from './tileManager.ts';
import type { TileManager } from './tileManager.ts';
import { createGroundHeights, type GroundHeights } from './groundHeights.ts';
import { createAreaLabelLayer, type AreaLabelLayer } from './areaLabels.ts';
import { createAreaBoundLayer, type AreaBoundLayer } from './areaBounds.ts';
import { createDeliveryLineLayer, type DeliveryLineLayer } from './deliveryLines.ts';
import { createShortcutZoneLayer, type ShortcutZoneLayer } from './shortcutZones.ts';
import { makeDisplayColor, viewportScale, type ViewportScale } from './poi.ts';
import { pxToWorldXZ, topDownDistance, type MapViewState } from './view.ts';
import { getViewBufferSize, setViewRect } from './viewRect.ts';
import type { TilesMeta } from './three-map-types.ts';

export type MapViewKind = 'perspective' | 'ortho';

export interface ThreeMapScene {
  renderer: WebGPURenderer;
  scene: THREE.Scene;
  /** The perspective (3D) or orthographic (2D) camera, per `view`. */
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  controls: MapControls;
  /** Which renderer mode this scene was created in; it cannot change - remount to switch. */
  view: MapViewKind;
  /** The orthographic rig (view animation, zoom level), only in the 2D view. */
  ortho: OrthoRig | undefined;
  /** Where the map is looking, as a px-space centre and zoom (both views). */
  getViewState: () => MapViewState;
  tileManager: TileManager;
  poiManager: PoiManager;
  /** Ground overlays: floating area names. */
  areaLabels: AreaLabelLayer;
  /** Dev-only coloured area outlines. */
  areaBounds: AreaBoundLayer;
  /** Shortcut zone polygons + names. */
  shortcutZones: ShortcutZoneLayer;
  /** Dashed delivery lines around the hovered/locked delivery point. */
  deliveryLines: DeliveryLineLayer;
  /** Tile-height sampler for extra ground overlays (delivery lines, editor gates). */
  groundHeights: GroundHeights;
  /** Sprite screen metrics for the current drawing buffer (dot/label sizing). */
  viewport: () => ViewportScale;
  /** The view's CSS size: the rectangle of the canvas that is drawn and hit-tested, anchored at its
   * top-left. Equals the canvas unless a `viewportElement` was given. */
  viewSize: Readonly<{ width: number; height: number }>;
  /** Registers a callback fired after the debounced container resize applies.
   * Returns an unregister function. */
  onResize: (fn: () => void) => () => void;
  /** Registers a per-frame callback (runs right before the render, after the
   * built-in updates). Returns an unregister function. */
  onFrame: (fn: () => void) => () => void;
  /** Selection-glide servo: ThreeMapWrapper re-targets it via panTo(); the
   * frame loop advances it. */
  selectionPan: SelectionPan;
  /** Zoom buttons: a glide of `logStep` log-units (positive zooms out, negative in), about the
   * canvas centre unless an anchor (CSS px from the centre, y down) is given. */
  stepBy: (logStep: number, anchor?: ZoomAnchor) => void;
  /** Schedules a render. The scene draws only when something changed (camera moved,
   * tiles swapped, a buffer was written...), so anything that mutates scene state from
   * outside - a track editor adding a gate, say - must call this afterwards. */
  invalidate: () => void;
  dispose: () => void;
}

/** A scene created in the 3D view: perspective camera, OrbitControls. */
export interface PerspectiveThreeMapScene extends ThreeMapScene {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  view: 'perspective';
  ortho: undefined;
}

/** A scene created in the flat 2D view: orthographic camera, the ortho rig. */
export interface OrthoThreeMapScene extends ThreeMapScene {
  camera: THREE.OrthographicCamera;
  view: 'ortho';
  ortho: OrthoRig;
}

export interface ThreeMapSceneOptions {
  /** Returns true when a pointer press must not start the ground pan
   * (e.g. the track editor grabs a gate instead). Queried inside pointerdown. */
  groundPanBlocked?: (event: PointerEvent) => boolean;
  /** `perspective` (default): the tilting 3D terrain. `ortho`: the flat 2D map - north-up, one
   * unlit quad per tile, OL's pan/zoom limits. Fixed for the scene's lifetime. */
  view?: MapViewKind;
  /** OrbitControls' closest zoom distance in meters (default 30 — the main map; perspective only).
   * The track editor passes a smaller value to allow close-up gate work. */
  minDistance?: number;
  /** Where to open, as a px-space centre and zoom (the same view model both modes report through
   * `getViewState`). Defaults to the whole map. */
  initialView?: MapViewState;
  /** Element whose box is the part of the (possibly larger) container the user sees. The scene
   * renders only into its top-left-anchored size, so animating it never resizes the canvas.
   * Defaults to the container. */
  viewportElement?: HTMLElement;
}

/** Adds the ocean plane at meta.oceanLevelMeters, exactly the map's world rect - nothing is
 * drawn past the map edge. Returns the mesh so the scene's dispose() can free its GPU
 * resources (geometry + material). */
export function createOceanQuad(
  scene: THREE.Scene,
  meta: TilesMeta,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null {
  if (meta.oceanLevelMeters == null) {
    console.warn('tiles.json has no oceanLevelMeters - skipping the ocean quad');
    return null;
  }
  const geometry = new THREE.PlaneGeometry(meta.widthMeters, meta.heightMeters);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2f7fa8,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = meta.oceanLevelMeters;
  scene.add(mesh);
  return mesh;
}

export function createThreeMapScene(
  container: HTMLElement,
  opts?: ThreeMapSceneOptions & { view?: 'perspective' },
): PerspectiveThreeMapScene;
export function createThreeMapScene(
  container: HTMLElement,
  opts: ThreeMapSceneOptions & { view: 'ortho' },
): OrthoThreeMapScene;
export function createThreeMapScene(
  container: HTMLElement,
  opts?: ThreeMapSceneOptions,
): ThreeMapScene;
export function createThreeMapScene(
  container: HTMLElement,
  opts: ThreeMapSceneOptions = {},
): ThreeMapScene {
  const view = opts.view ?? 'perspective';
  const isOrtho = view === 'ortho';
  // Log depth is for the 3D clip range (30..100000); the flat view depth-tests nothing.
  const renderer = new WebGPURenderer({ antialias: true, logarithmicDepthBuffer: !isOrtho });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  // 3D: sky over the horizon. 2D: OL's map background, which is what shows past the map edge.
  // The flat scene is display-referred: it draws straight to the canvas (no output conversion), so
  // translucent layers blend on sRGB-encoded values exactly as OL's canvas did, and every colour fed
  // to it is an encoded number (see `ViewportScale.displayReferred`).
  if (isOrtho) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const backgroundColor = isOrtho ? makeDisplayColor(ORTHO_BACKGROUND) : new THREE.Color(0x8fb8e0);
  renderer.setClearColor(backgroundColor);
  container.appendChild(renderer.domElement);

  // The map's view: the top-left part of the canvas the user sees. A caller that animates the
  // visible region (the sidebar opening) keeps the canvas at one fixed size and passes a
  // `viewportElement` that tracks the visible area, so that animation costs a viewport change per
  // frame instead of a `setSize` and a rebuild of every baked texture. Without one, the view is
  // the whole canvas.
  const viewElement = opts.viewportElement ?? container;
  const size = { width: 0, height: 0 };
  function measureView(): void {
    size.width = Math.min(viewElement.clientWidth, container.clientWidth);
    size.height = Math.min(viewElement.clientHeight, container.clientHeight);
  }
  measureView();
  setViewRect(renderer, size.width, size.height);

  const scene = new THREE.Scene();
  scene.background = backgroundColor;

  const meta = TILES_META;

  // Render on demand: the loop keeps ticking (inertia, tile ticks, servo updates) but only
  // draws when something changed. Everything that mutates scene state calls invalidate().
  let dirty = true;
  const invalidate = (): void => {
    dirty = true;
  };

  const initialWorld = opts.initialView ? pxToWorldXZ(opts.initialView.center, meta) : undefined;
  let ortho: OrthoRig | undefined;
  let rig: CameraRig;
  if (isOrtho) {
    ortho = createOrthoRig(renderer, meta, {
      size,
      initial: initialWorld && {
        x: initialWorld[0],
        z: initialWorld[1],
        zoom: opts.initialView?.zoom,
      },
    });
    rig = ortho;
  } else {
    rig = createPerspectiveRig(renderer, meta, opts.minDistance);
    scene.fog = new THREE.Fog(backgroundColor, FOG_NEAR, FOG_FAR);
    scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x4a3d2a, 8));
    const sun = new THREE.DirectionalLight(0xfff3df, 6);
    // Motor Town's sun at TIME_OF_DAY_MS. World axes are north = -Z, east = +X, so the light
    // sits at (cos el·sin az, sin el, -cos el·cos az) × distance.
    const { azimuth, elevation } = motorTownSun(TIME_OF_DAY_MS / 3_600_000);
    const sunAz = THREE.MathUtils.degToRad(azimuth);
    const sunEl = THREE.MathUtils.degToRad(elevation);
    sun.position.set(
      SUN_DISTANCE * Math.cos(sunEl) * Math.sin(sunAz),
      SUN_DISTANCE * Math.sin(sunEl),
      -SUN_DISTANCE * Math.cos(sunEl) * Math.cos(sunAz),
    );
    scene.add(sun);
    scene.add(sun.target);
    // Opens looking straight down at the requested view (default: the whole map).
    const perspective = rig.camera as THREE.PerspectiveCamera;
    const startX = initialWorld?.[0] ?? 0;
    const startZ = initialWorld?.[1] ?? 0;
    rig.controls.target.set(startX, 0, startZ);
    if (opts.initialView) {
      const distance = topDownDistance(opts.initialView.zoom, size.height, CAMERA_FOV_DEG);
      const orbit = rig.controls as MapControls & { minDistance: number; maxDistance: number };
      perspective.position.set(
        startX,
        THREE.MathUtils.clamp(distance, orbit.minDistance, orbit.maxDistance),
        startZ,
      );
    }
  }
  rig.resize(size.width, size.height);
  const { camera, controls } = rig;
  // Controls raise 'change' from every update() that moved the camera, which covers drags, damping,
  // wheel/button zoom, the ground pan and the selection glide.
  let cameraMoved = false;
  const onCameraChange = (): void => {
    cameraMoved = true;
    invalidate();
  };
  controls.addEventListener('change', onCameraChange);

  const ocean = isOrtho ? null : createOceanQuad(scene, meta);
  const worldRect = mapRect(meta);

  const loadingManager = new THREE.LoadingManager();
  const tileManager = createTileManager(
    scene,
    meta,
    renderer,
    camera,
    controls,
    loadingManager.abortController.signal,
    loadingManager,
    invalidate,
    ortho ? { kind: 'flat', camera: ortho.camera, zoom: ortho.zoom } : { kind: 'terrain' },
  );
  const selectionPan = createSelectionPan(renderer.domElement, camera, controls);
  const panPhys = createGroundPan(
    renderer,
    camera,
    controls,
    tileManager.tileGroup,
    isOrtho ? 0 : (meta.oceanLevelMeters ?? 0),
    opts.groundPanBlocked,
  );
  const poiManager = createPoiManager(scene, meta, tileManager, camera, renderer, invalidate);

  // Ground overlays: own height-tile fetches (fixed places, never evicted), shared abort.
  const groundHeights = createGroundHeights(meta, loadingManager.abortController.signal);
  const getViewport = () => viewportScale(camera, renderer);
  const areaLabels = createAreaLabelLayer(
    scene,
    meta,
    tileManager,
    groundHeights,
    getViewport,
    invalidate,
  );
  const areaBounds = createAreaBoundLayer({
    scene,
    meta,
    groundHeights,
    dpr: getViewport().dpr,
    displayReferred: isOrtho,
    invalidate,
  });
  const shortcutZones = createShortcutZoneLayer({
    scene,
    meta,
    groundHeights,
    getViewport,
    invalidate,
  });
  // Things that animate on their own keep the scene drawing while they run.
  const animating = new Set<string>();
  const deliveryLines = createDeliveryLineLayer({
    scene,
    meta,
    groundHeights,
    dpr: getViewport().dpr,
    displayReferred: isOrtho,
    invalidate,
    onAnimatingChange: (on) => {
      if (on) animating.add('deliveryLines');
      else animating.delete('deliveryLines');
    },
  });
  // The flat 2D view has no terrain to follow: overlays lie on the ground plane.
  if (isOrtho) {
    areaLabels.setFlat(true);
    areaBounds.setFlat(true);
    shortcutZones.setFlat(true);
    deliveryLines.setFlat(true);
  }
  const resizeCallbacks = new Set<() => void>();
  const frameCallbacks = new Set<() => void>();
  /** In the flat view, tier gates (resident dots, area-name tiers) key off the view zoom like
   * OL's layer `minZoom`s; in 3D they key off the covering tile zoom. */
  function syncTiers(): void {
    const zoom = ortho?.zoom();
    poiManager.setViewZoom(zoom);
    areaLabels.setViewZoom(zoom);
  }
  function refreshVisibleTiles(): void {
    tileManager.updateVisibleTiles();
    syncTiers();
    poiManager.syncCovers();
    areaLabels.syncCovers();
  }

  controls.update();
  refreshVisibleTiles();

  /** False until the animation loop has run once: the renderer awaits its backend init
   * (WebGPU, or the WebGL2 fallback) before the first frame, and cannot draw earlier. */
  let ready = false;

  function renderNow(): void {
    dirty = false;
    renderer.render(scene, camera);
  }

  /** The canvas size and ratio last applied; only a change in them costs a `setSize`. */
  let canvasWidth = container.clientWidth;
  let canvasHeight = container.clientHeight;

  function onResize(): void {
    const canvasChanged =
      container.clientWidth !== canvasWidth ||
      container.clientHeight !== canvasHeight ||
      window.devicePixelRatio !== renderer.getPixelRatio();
    if (canvasChanged) {
      canvasWidth = container.clientWidth;
      canvasHeight = container.clientHeight;
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(canvasWidth, canvasHeight);
    }
    // A view-only change (the sidebar sliding) is just a camera aspect and a viewport.
    measureView();
    rig.resize(size.width, size.height);
    setViewRect(renderer, size.width, size.height);
    if (canvasChanged) {
      // The DPR-baked parts (atlases, label canvases) depend on the canvas, never on the view.
      poiManager.setViewport();
      areaLabels.setViewport();
      areaBounds.setDpr(getViewport().dpr);
      deliveryLines.setDpr(getViewport().dpr);
      shortcutZones.setViewport();
    }
    for (const fn of resizeCallbacks) fn();
    // setSize clears the canvas: draw right away instead of waiting for the next tick.
    dirty = true;
    if (ready) renderNow();
  }
  // ResizeObserver fires on every canvas or view size change (side menu/panels included); apply
  // each one immediately so the view never sits stretched or blurred mid-transition.
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);
  if (viewElement !== container) resizeObserver.observe(viewElement);
  // A DPR change (browser zoom, another monitor) fires no resize: rebuild the DPR-baked parts.
  const stopWatchingDpr = watchDevicePixelRatio(onResize);
  // Labels are canvases drawn once: redraw them when a (CJK, Thai...) font subset arrives late.
  const stopWatchingFonts = watchFontLoads(() => {
    poiManager.refreshLabels();
    areaLabels.setViewport();
    shortcutZones.setViewport();
  });

  const _buffer = new THREE.Vector2();
  let lastTileUpdate = 0;
  let lastFrameTime = 0;

  function animate(now: number): void {
    ready = true;
    const dt = lastFrameTime === 0 ? 1 / 60 : Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    // Pan/selection move the camera and target; in 3D the clamp then keeps the target on the map
    // (the 2D rig clamps to OL's wider extent itself), and the rig's controls.update() (last) sees
    // the final position and raises 'change'.
    panPhys.update(dt);
    selectionPan.update(dt);
    if (!isOrtho) {
      const [dx, dz] = clampDelta(worldRect, controls.target.x, controls.target.z);
      if (dx !== 0 || dz !== 0) {
        controls.target.x += dx;
        controls.target.z += dz;
        camera.position.x += dx;
        camera.position.z += dz;
      }
    }
    rig.update(dt);
    // The 3D LOD walk is heavy enough to run on an interval; the flat cover is a rectangle of
    // tiles, cheap enough to follow every camera move so panning never outruns the mounted tiles.
    if (now - lastTileUpdate > TILE_UPDATE_INTERVAL_MS || (isOrtho && cameraMoved)) {
      lastTileUpdate = now;
      refreshVisibleTiles();
    }
    cameraMoved = false;
    areaLabels.update();
    areaBounds.update();
    shortcutZones.update();
    deliveryLines.update();
    if (animating.size > 0) dirty = true;
    if (!dirty) return;
    // Zoom tiers follow the camera every rendered frame, not only on the tile tick.
    syncTiers();
    poiManager.update(camera);
    getViewBufferSize(renderer, _buffer);
    areaLabels.snap(camera, _buffer);
    shortcutZones.snap(camera, _buffer);
    for (const fn of frameCallbacks) fn();
    renderNow();
  }
  // setAnimationLoop drives the frame AND the node-material update pass, and awaits the
  // async backend init (WebGPU or, on unsupported browsers, the WebGL2 fallback) before
  // the first render. dispose() cancels it via renderer.dispose().
  void renderer.setAnimationLoop(animate);

  return {
    renderer,
    scene,
    camera,
    controls,
    view,
    ortho,
    getViewState: () => rig.getViewState(),
    tileManager,
    poiManager,
    areaLabels,
    areaBounds,
    shortcutZones,
    deliveryLines,
    groundHeights,
    viewport: getViewport,
    viewSize: size,
    onResize(fn) {
      resizeCallbacks.add(fn);
      return () => resizeCallbacks.delete(fn);
    },
    onFrame(fn) {
      frameCallbacks.add(fn);
      return () => frameCallbacks.delete(fn);
    },
    selectionPan,
    stepBy: (logStep, anchor) => rig.stepBy(logStep, anchor),
    invalidate,
    dispose() {
      // Kill in-flight tile fetches/texture loads first: their continuations check the
      // signal and bail instead of repopulating the caches tileManager.dispose() drains.
      loadingManager.abort();
      resizeObserver.disconnect();
      stopWatchingDpr();
      stopWatchingFonts();
      controls.removeEventListener('change', onCameraChange);
      rig.dispose();
      resizeCallbacks.clear();
      frameCallbacks.clear();
      panPhys.dispose();
      selectionPan.dispose();
      poiManager.dispose();
      areaLabels.dispose();
      areaBounds.dispose();
      shortcutZones.dispose();
      deliveryLines.dispose();
      groundHeights.dispose();
      tileManager.dispose();
      ocean?.geometry.dispose();
      ocean?.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
