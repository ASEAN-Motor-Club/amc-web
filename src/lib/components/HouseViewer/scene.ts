import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { motorTownSun } from '#lib/ui/ThreeMap/sun.ts';
import { TIME_OF_DAY_MS } from '#lib/ui/ThreeMap/constants.ts';
import type { HouseViewerData } from '#lib/api/houseViewer.ts';
import { ueRotatorToThreeQuaternion, ueToThreePosition } from './coords.ts';
import {
  AUTO_ROTATE_SPEED,
  BUILDING_REACH_M,
  CAMERA_DISTANCE_FACTOR,
  CAMERA_FAR_FACTOR,
  CAMERA_FOV_DEG,
  CAMERA_MAX_DISTANCE_FACTOR,
  CAMERA_MAX_POLAR_RAD,
  CAMERA_MIN_DISTANCE_FACTOR,
  CAMERA_NEAR_M,
  CAMERA_POLAR_DEG,
  COLOR_GRASS,
  COLOR_GROUND_LIGHT,
  COLOR_SKY_LIGHT,
  COLOR_SUN,
  ENVIRONMENT_INTENSITY,
  FRAME_PADDING_FACTOR,
  HEMISPHERE_INTENSITY,
  MAILBOX_BUILDING_KEY,
  MAX_FRAME_DELTA_S,
  ORBIT_DAMPING,
  GROUND_TILE_M,
  PLOT_POLYGON_OFFSET,
  PLOT_THICKNESS_M,
  SHADOW_MAP_SIZE,
  SHADOW_NORMAL_BIAS,
  SUN_DISTANCE_FACTOR,
  SUN_INTENSITY,
} from './constants.ts';

const CM_PER_M = 100;
const MS_PER_HOUR = 3_600_000;

export interface HouseSceneProgress {
  /** Distinct models fetched so far (success or failure). */
  loaded: number;
  /** Distinct models the house needs. */
  total: number;
  failed: number;
}

export interface HouseSceneOptions {
  /** Start with the camera orbiting. */
  autoRotate: boolean;
  onProgress?: (progress: HouseSceneProgress) => void;
  /** The user started orbiting or zooming the camera themselves. */
  onUserControl?: () => void;
}

export interface HouseScene {
  setAutoRotate: (on: boolean) => void;
  dispose: () => void;
}

/**
 * The house as a self-contained diorama: the flat plot (sized and yawed like the game's House
 * actor) with every placed building loaded from its GLB and put where the world dump says, the
 * camera orbiting the centre.
 *
 * Everything is in plot-local three space: origin = plot centre at ground height.
 */
export function createHouseScene(
  container: HTMLElement,
  data: HouseViewerData,
  options: HouseSceneOptions,
): HouseScene {
  // Linear depth on purpose: log depth writes gl_FragDepth in the fragment shader, which drops the
  // hardware depth path and shows up as ragged, crawling geometry edges. The scene is small (plot
  // plus a few metres of ground) and CAMERA_NEAR_M is set wide enough that a linear 24-bit buffer
  // still separates the coplanar floors and decals.
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment()).texture;
  scene.environment = environment;
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;

  const radius = frameRadius(data);

  scene.add(new THREE.HemisphereLight(COLOR_SKY_LIGHT, COLOR_GROUND_LIGHT, HEMISPHERE_INTENSITY));
  // Same sun as the 3D map: Motor Town's frozen arc at TIME_OF_DAY_MS. Plot-local space shares
  // the map's axes (north = -Z, east = +X; three z = UE y), so the placement formula carries over.
  const { azimuth, elevation } = motorTownSun(TIME_OF_DAY_MS / MS_PER_HOUR);
  const sunAz = THREE.MathUtils.degToRad(azimuth);
  const sunEl = THREE.MathUtils.degToRad(elevation);
  const sunDistance = radius * SUN_DISTANCE_FACTOR;
  const sun = new THREE.DirectionalLight(COLOR_SUN, SUN_INTENSITY);
  sun.position.set(
    sunDistance * Math.cos(sunEl) * Math.sin(sunAz),
    sunDistance * Math.sin(sunEl),
    -sunDistance * Math.cos(sunEl) * Math.cos(sunAz),
  );
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.normalBias = SHADOW_NORMAL_BIAS;
  // Orthographic box around the plot, looking from the sun at the origin (sun.target).
  Object.assign(sun.shadow.camera, {
    left: -radius,
    right: radius,
    top: radius,
    bottom: -radius,
    near: sunDistance - radius * 2,
    far: sunDistance + radius * 2,
  });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);

  let disposed = false;
  scene.add(createPlot(data, renderer, () => disposed));

  const buildings = new THREE.Group();
  scene.add(buildings);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV_DEG,
    container.clientWidth / Math.max(container.clientHeight, 1),
    CAMERA_NEAR_M,
    radius * CAMERA_FAR_FACTOR,
  );
  // Start in front of the house. The game places one mailbox per plot at the road, facing out;
  // it usually shares the plot actor's yaw, but not always (Gujwa_ContainerHouse: 180° off).
  const mailbox = data.buildings.find((b) => b.buildingKey === MAILBOX_BUILDING_KEY);
  const frontYaw = mailbox?.rotation.yaw ?? data.yaw;
  const plotForward = new THREE.Vector3(1, 0, 0).applyQuaternion(
    ueRotatorToThreeQuaternion({ pitch: 0, yaw: frontYaw, roll: 0 }),
  );
  camera.position.setFromSphericalCoords(
    radius * CAMERA_DISTANCE_FACTOR,
    THREE.MathUtils.degToRad(CAMERA_POLAR_DEG),
    Math.atan2(plotForward.x, plotForward.z),
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = ORBIT_DAMPING;
  controls.minDistance = radius * CAMERA_MIN_DISTANCE_FACTOR;
  controls.maxDistance = radius * CAMERA_MAX_DISTANCE_FACTOR;
  controls.maxPolarAngle = CAMERA_MAX_POLAR_RAD;
  controls.autoRotate = options.autoRotate;
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
  controls.update();
  if (options.onUserControl) controls.addEventListener('start', options.onUserControl);

  const gltfs: GLTF[] = [];
  loadBuildings(data, buildings, gltfs, options.onProgress, () => disposed);

  const resizeObserver = new ResizeObserver(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(container);

  const timer = new THREE.Timer();
  renderer.setAnimationLoop((timestamp) => {
    timer.update(timestamp);
    controls.update(Math.min(timer.getDelta(), MAX_FRAME_DELTA_S));
    renderer.render(scene, camera);
  });

  return {
    setAutoRotate(on) {
      controls.autoRotate = on;
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      controls.dispose();
      // Clones share their source's geometry/materials, so freeing the scene graph once
      // (sources are never attached) plus the GLTF sources covers everything.
      disposeObject(scene);
      for (const gltf of gltfs) disposeObject(gltf.scene);
      environment.dispose();
      pmrem.dispose();
      timer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/** Farthest of the plot corners and building origins (+ furniture reach), padded. */
function frameRadius(data: HouseViewerData): number {
  const halfDiagonal = Math.hypot(data.size.x, data.size.y) / 2 / CM_PER_M;
  const farthestBuilding = Math.max(
    0,
    ...data.buildings.map(
      (b) =>
        Math.hypot(b.location.x - data.coord.x, b.location.y - data.coord.y) / CM_PER_M +
        BUILDING_REACH_M,
    ),
  );
  return Math.max(halfDiagonal, farthestBuilding) * FRAME_PADDING_FACTOR;
}

function createPlot(
  data: HouseViewerData,
  renderer: THREE.WebGLRenderer,
  isDisposed: () => boolean,
): THREE.Mesh {
  const width = data.size.x / CM_PER_M;
  const depth = data.size.y / CM_PER_M;
  const material = new THREE.MeshStandardMaterial({
    // Flat stand-in until the grass textures arrive (and if they never do).
    color: COLOR_GRASS,
    roughness: 0.95,
    // The plot top is exactly where house floors and parking paint sit; lose those ties.
    polygonOffset: true,
    polygonOffsetFactor: PLOT_POLYGON_OFFSET,
    polygonOffsetUnits: PLOT_POLYGON_OFFSET,
  });
  const plot = new THREE.Mesh(new THREE.BoxGeometry(width, PLOT_THICKNESS_M, depth), material);
  plot.position.y = -PLOT_THICKNESS_M / 2;
  plot.quaternion.copy(ueRotatorToThreeQuaternion({ pitch: 0, yaw: data.yaw, roll: 0 }));
  plot.receiveShadow = true;

  const loader = new THREE.TextureLoader();
  const tile = (texture: THREE.Texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    // Box UVs span each face 0..1; repeat so one tile covers GROUND_TILE_M of plot.
    texture.repeat.set(width / GROUND_TILE_M, depth / GROUND_TILE_M);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  };
  Promise.all([
    loader.loadAsync(data.groundTextures.color),
    loader.loadAsync(data.groundTextures.normal),
  ])
    .then(([color, normal]) => {
      if (isDisposed()) {
        color.dispose();
        normal.dispose();
        return;
      }
      color.colorSpace = THREE.SRGBColorSpace;
      material.map = tile(color);
      material.normalMap = tile(normal);
      // UE normal maps are DirectX-style (green down); three expects OpenGL (green up).
      material.normalScale.set(1, -1);
      material.color.set(0xffffff);
      material.needsUpdate = true;
    })
    .catch(() => {
      // Keep the flat grass color; the plot is still readable without its texture.
    });

  return plot;
}

/** Fetches each distinct model once and places a clone per building. */
function loadBuildings(
  data: HouseViewerData,
  parent: THREE.Group,
  gltfs: GLTF[],
  onProgress: HouseSceneOptions['onProgress'],
  isDisposed: () => boolean,
) {
  const urls = [...new Set(data.buildings.map((b) => b.modelUrl))];
  const progress: HouseSceneProgress = { loaded: 0, total: urls.length, failed: 0 };
  onProgress?.({ ...progress });

  const loader = new GLTFLoader();
  for (const url of urls) {
    loader
      .loadAsync(url)
      .then((gltf) => {
        if (isDisposed()) {
          disposeObject(gltf.scene);
          return;
        }
        gltfs.push(gltf);
        gltf.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            // UE keeps translucent materials out of shadow depth unless a primitive opts in; the
            // parking bays' see-through interaction boxes (glTF BLEND) would otherwise shade the lot.
            object.castShadow = !(object.material as THREE.Material).transparent;
            object.receiveShadow = true;
          }
        });
        for (const building of data.buildings) {
          if (building.modelUrl !== url) continue;
          const instance = gltf.scene.clone();
          instance.position.copy(ueToThreePosition(building.location, data.coord));
          instance.quaternion.copy(ueRotatorToThreeQuaternion(building.rotation));
          instance.name = building.buildingKey;
          parent.add(instance);
        }
      })
      .catch(() => {
        progress.failed++;
      })
      .finally(() => {
        if (isDisposed()) return;
        progress.loaded++;
        onProgress?.({ ...progress });
      });
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}
