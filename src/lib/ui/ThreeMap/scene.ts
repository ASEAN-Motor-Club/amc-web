import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  LOOK_UP_ANGLE_FAR_DEG,
  LOOK_UP_ANGLE_NEAR_DEG,
  OCEAN_QUAD_SIZE,
  ROTATE_SPEED_FAR,
  ROTATE_SPEED_NEAR,
  TILE_UPDATE_INTERVAL_MS,
  ZOOM_DAMPING_FACTOR,
  ZOOM_LOG_PER_WHEEL_DELTA,
} from './constants';
import { setupGroundPan, type GroundPan } from './groundPan';
import { TILES_META } from './heightmap';
import { createPoiManager, type PoiManager } from './poiManager';
import { createTileManager } from './tileManager';
import type { TileManager } from './tileManager';
import type { TilesMeta } from './three-map-types';

export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  update: (dt: number) => void;
  /** Feeds the inertial wheel-zoom accumulator directly - used by the on-map
   * zoom buttons. Positive deltaY zooms out, negative zooms in. */
  zoomBy: (deltaY: number) => void;
}

export function createCameraRig(renderer: THREE.WebGLRenderer): CameraRig {
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
      const deltaLog = event.deltaY * ZOOM_LOG_PER_WHEEL_DELTA;
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
    integrateZoom(dt);
    controls.update();
  }

  function zoomBy(deltaY: number): void {
    const deltaLog = deltaY * ZOOM_LOG_PER_WHEEL_DELTA;
    if (deltaLog !== 0 && zoomLog > 0 !== deltaLog > 0) {
      zoomLog = 0;
    }
    zoomLog += deltaLog;
  }

  return { camera, controls, update, zoomBy };
}

export interface ThreeMapScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  tileManager: TileManager;
  poiManager: PoiManager;
  meta: TilesMeta;
  zoomBy: (deltaY: number) => void;
  dispose: () => void;
}

export function createOceanQuad(scene: THREE.Scene, meta: TilesMeta): THREE.Mesh | null {
  if (meta.oceanLevelMeters == null) {
    console.warn('tiles.json has no oceanLevelMeters - skipping the ocean quad');
    return null;
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
  return mesh;
}

export function createThreeMapScene(container: HTMLElement): ThreeMapScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  const skyColor = 0x8fb8e0;
  renderer.setClearColor(skyColor);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.Fog(skyColor, 25000, 100000);

  const { camera, controls, update: updateCameraRig, zoomBy } = createCameraRig(renderer);

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
  const panPhys: GroundPan = setupGroundPan(renderer, camera, controls, tileManager.tileGroup);
  const poiManager = createPoiManager(scene, meta, tileManager);

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
    poiManager.setViewportSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  let lastTileUpdate = 0;
  let lastFrameTime = 0;
  let rafId = 0;

  function animate(now: number): void {
    rafId = requestAnimationFrame(animate);
    const dt = lastFrameTime === 0 ? 1 / 60 : Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    updateCameraRig(dt);
    panPhys.update(dt);
    poiManager.update(camera);

    if (now - lastTileUpdate > TILE_UPDATE_INTERVAL_MS) {
      lastTileUpdate = now;
      refreshVisibleTiles();
    }

    renderer.render(scene, camera);
  }
  animate(0);

  return {
    renderer,
    scene,
    camera,
    controls,
    tileManager,
    poiManager,
    meta,
    zoomBy,
    dispose() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      loadingManager.abort();
      poiManager.dispose();
      tileManager.setZoomDebug(false);
      tileManager.setWireframe(false);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
