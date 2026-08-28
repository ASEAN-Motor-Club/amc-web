import * as THREE from 'three';
import { WebGPURenderer, type Renderer } from 'three/webgpu';
import { debounce } from 'es-toolkit';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  LOOK_UP_ANGLE_FAR_DEG,
  LOOK_UP_ANGLE_NEAR_DEG,
  OCEAN_QUAD_SIZE,
  RESIZE_DEBOUNCE_MS,
  ROTATE_SPEED_FAR,
  ROTATE_SPEED_NEAR,
  TILE_UPDATE_INTERVAL_MS,
  ZOOM_DAMPING_FACTOR,
  ZOOM_LOG_PER_WHEEL_DELTA,
  WHEEL_NOTCH_DELTA_Y,
  ZOOM_LOG_PER_WHEEL_NOTCH,
} from './constants';
import { createSelectionPan, type SelectionPan } from './selectionPan';
import { setupGroundPan } from './groundPan';
import { TILES_META } from './heightmap';
import { createPoiManager, type PoiManager } from './poiManager';
import { createTileManager } from './tileManager';
import type { TileManager } from './tileManager';
import type { TilesMeta } from './three-map-types';

export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  update: (dt: number) => void;
  /** Queues one zoom-button step (log-distance units); the frame loop feeds it
   * into the inertial accumulator, so each click glides instead of teleporting. */
  stepBy: (logStep: number) => void;
}
export function createCameraRig(renderer: Renderer): CameraRig {
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 5, 100000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 30;
  controls.maxDistance = 25000;

  camera.position.set(0, controls.maxDistance, 0);
  camera.lookAt(controls.target);
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.enablePan = false;
  controls.enableZoom = false;

  let zoomLog = 0;
  renderer.domElement.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      // deltaMode 1 (lines) / 2 (pages) - normalize to pixels like real browsers do.
      const px =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * 100
            : event.deltaY;
      // A mouse-wheel DETENT arrives as one large discrete event; trackpad
      // gestures emit many small ones. Scale each with its own factor so the
      // inertial accumulator's ~2.9x damping gain doesn't over-boost notches.
      const perUnit =
        Math.abs(px) >= WHEEL_NOTCH_DELTA_Y ? ZOOM_LOG_PER_WHEEL_NOTCH : ZOOM_LOG_PER_WHEEL_DELTA;
      const deltaLog = px * perUnit;
      if (deltaLog !== 0 && zoomLog > 0 !== deltaLog > 0) {
        zoomLog = 0;
      }
      zoomLog += deltaLog;
    },
    { passive: false },
  );

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
  function update(dt: number): void {
    const distance = camera.position.distanceTo(controls.target);
    const t = THREE.MathUtils.clamp(
      (distance - controls.minDistance) / (controls.maxDistance - controls.minDistance),
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
  }

  function stepBy(logStep: number): void {
    // Damping DECAYS the queue each frame, so the accumulator integrates
    // ~1/ZOOM_DAMPING_FACTOR (≈2.86x) of whatever it holds. Queue the deficit
    // complement so the glide lands exactly on logStep.
    buttonZoomPending += logStep * ZOOM_DAMPING_FACTOR;
  }

  return { camera, controls, update, stepBy };
}

export interface ThreeMapScene {
  renderer: WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  tileManager: TileManager;
  poiManager: PoiManager;
  /** Selection-glide servo: ThreeMapWrapper re-targets it via panTo(); the
   * frame loop advances it. */
  selectionPan: SelectionPan;
  /** Zoom buttons: exact, immediate step in log-distance units (no inertia).
   * Positive steps out, negative steps in. */
  stepBy: (logStep: number) => void;
  dispose: () => void;
}

export function createOceanQuad(scene: THREE.Scene, meta: TilesMeta): void {
  if (meta.oceanLevelMeters == null) {
    console.warn('tiles.json has no oceanLevelMeters - skipping the ocean quad');
    return;
  }
  const geometry = new THREE.PlaneGeometry(OCEAN_QUAD_SIZE, OCEAN_QUAD_SIZE);
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
}

export function createThreeMapScene(container: HTMLElement): ThreeMapScene {
  const renderer = new WebGPURenderer({ antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  const skyColor = 0x8fb8e0;
  renderer.setClearColor(skyColor);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.transition = 'filter 130ms ease';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.Fog(skyColor, 25000, 100000);

  const { camera, controls, update: updateCameraRig, stepBy } = createCameraRig(renderer);

  scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x4a3d2a, 8));
  const sun = new THREE.DirectionalLight(0xfff3df, 6);
  sun.position.set(-8000, 12000, 6000);
  scene.add(sun);
  scene.add(sun.target);

  const meta = TILES_META;

  createOceanQuad(scene, meta);

  const loadingManager = new THREE.LoadingManager();
  const tileManager = createTileManager(
    scene,
    meta,
    renderer,
    camera,
    controls,
    loadingManager.abortController.signal,
    loadingManager,
  );
  const selectionPan = createSelectionPan(renderer.domElement, camera, controls);
  const panPhys = setupGroundPan(renderer, camera, controls, tileManager.tileGroup);
  const poiManager = createPoiManager(scene, meta, tileManager, camera, renderer);

  function refreshVisibleTiles(): void {
    tileManager.updateVisibleTiles();
    poiManager.syncCovers();
  }

  controls.target.set(0, 0, 0);
  controls.update();
  refreshVisibleTiles();

  function onResize(): void {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    poiManager.setViewport();
    // The size has settled - clear the transition blur.
    renderer.domElement.style.filter = '';
  }
  // ResizeObserver fires on every container size change (side menu/panels too). Blur the
  // canvas while the transition runs, then debounce the actual resize so it collapses to
  // one size update after the animation settles.
  const onResizeDebounced = debounce(onResize, RESIZE_DEBOUNCE_MS);
  const resizeObserver = new ResizeObserver(() => {
    renderer.domElement.style.filter = 'blur(8px)';
    onResizeDebounced();
  });
  resizeObserver.observe(container);

  let lastTileUpdate = 0;
  let lastFrameTime = 0;

  function animate(now: number): void {
    const dt = lastFrameTime === 0 ? 1 / 60 : Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    updateCameraRig(dt);
    panPhys.update(dt);
    selectionPan.update(dt);
    poiManager.update(camera);

    if (now - lastTileUpdate > TILE_UPDATE_INTERVAL_MS) {
      lastTileUpdate = now;
      refreshVisibleTiles();
    }

    renderer.render(scene, camera);
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
    tileManager,
    poiManager,
    selectionPan,
    stepBy,
    dispose() {
      panPhys.dispose();
      selectionPan.dispose();
      poiManager.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
