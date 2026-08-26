import * as THREE from 'three';
import { PointType, type PlayerData, type TeleportPoint } from '$lib/components/Map/Map/types';
import type { DeliveryPoint } from '$lib/data/deliveryPoint';
import type { House } from '$lib/data/house';
import type { ShortcutZone } from '$lib/api/shortcutZone';
import type { Pin } from '$lib/schema/pin';
import type { Vector3 } from '$lib/types';
import type { TileManager } from './tileManager';
import type { TilesMeta } from './three-map-types';
import { gameCoordToWorld } from './coords';
import { makeDotSprite, makeTextSprite, type DotPalette } from './poi';
import { tileWorldRect } from './heightmap';
import {
  colorEmerald400,
  colorEmerald950,
  colorCyan500,
  colorCyan950,
  colorViolet400,
  colorViolet950,
  colorRed400,
  colorRed950,
  colorYellow500,
  colorYellow950,
  colorTextDark,
  colorGray950,
  adjustOpacity,
} from '$lib/tw-var';

/** One world point, fed in game/UE coordinates (x right, y down, z up, cm). */
export interface PoiInput {
  pointType: PointType;
  id: string;
  coord: Vector3;
  info: DeliveryPoint | House | PlayerData | Pin | TeleportPoint | ShortcutZone;
}

export interface PoiMarker {
  pointType: PointType;
  coord: Vector3;
  /** World position (meters, y-up). */
  world: [x: number, y: number, z: number];
  /** The dot sprite (for hover/pick). */
  dot: THREE.Sprite;
  /** Text label sprite. */
  label: THREE.Sprite | null;
  id: string;
  info: DeliveryPoint | House | PlayerData | Pin | TeleportPoint | ShortcutZone;
  /** The finest world patch that currently covers the marker. */
  cover: { z: number; x: number; y: number } | null;
  hovered: boolean;
  /** User-facing visibility (POI toggle). */
  visible: boolean;
  /** Resident LOD gate: true when the marker sits in the z5 ring. */
  lodOk: boolean;
}

export interface PoiManager {
  poiGroup: THREE.Group;
  markerById: (id: string) => PoiMarker | undefined;
  markers: () => PoiMarker[];
  setPois: (pois: PoiInput[]) => void;
  updatePositions: (moves: { id: string; coord: Vector3 }[]) => void;
  /** Returns the marker whose sprites the camera ray hits, or null. */
  pick: (raycaster: THREE.Raycaster) => PoiMarker | null;
  /** Keeps dot/label sprites at a constant screen size for the given camera. */
  update: (camera: THREE.Camera) => void;
  /** Recomputes cover tiles and resident visibility. */
  syncCovers: () => void;
  setMarkerVisible: (id: string, visible: boolean) => void;
  setLabel: (id: string, text: string) => void;
  /** Red translucent ground shade over each shortcut zone (shader-driven). */
  setShortcutZones: (zones: ShortcutZone[]) => void;
  setViewportSize: (w: number, h: number) => void;
  dispose: () => void;
}

/** Resident points only render inside the finest LOD ring. */
const RESIDENT_MIN_COVER_Z = 5;

/** Viewport height used for the constant-screen-size projection (updated on resize). */
let viewportH = 800;

function paletteFor(pointType: PointType): DotPalette {
  switch (pointType) {
    case PointType.Delivery:
      return { fill: colorYellow500, stroke: colorYellow950 };
    case PointType.House:
      return { fill: colorCyan500, stroke: colorCyan950 };
    case PointType.Player:
      return { fill: colorEmerald400, stroke: colorEmerald950 };
    case PointType.Pin:
      return { fill: colorRed400, stroke: colorRed950 };
    case PointType.Teleport:
      return { fill: colorViolet400, stroke: colorViolet950 };
    default:
      return { fill: colorYellow500, stroke: colorYellow950 };
  }
}

export function createPoiManager(
  scene: THREE.Scene,
  meta: TilesMeta,
  tileManager: TileManager,
): PoiManager {
  const poiGroup = new THREE.Group();
  scene.add(poiGroup);

  const markers = new Map<string, PoiMarker>();
  let ordered: PoiMarker[] = [];

  const raycaster = new THREE.Raycaster();
  const rayDown = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  const hitPoint = new THREE.Vector3();

  /** Samples the literal terrain height under a world point by raycasting the mounted tiles. */
  function groundHeight(wx: number, wz: number): number {
    rayDown.origin.set(wx, 200000, wz);
    raycaster.ray.copy(rayDown);
    const hits = raycaster.intersectObjects(tileManager.tileGroup.children, false);
    for (const hit of hits) {
      if (hit.point.y >= (meta.oceanLevelMeters ?? -Infinity)) {
        hitPoint.copy(hit.point);
        return hitPoint.y;
      }
    }
    return 0;
  }

  function makeMarker(input: PoiInput): void {
    const world = gameCoordToWorld(input.coord, meta);
    const dot = makeDotSprite(paletteFor(input.pointType));
    dot.position.set(world[0], world[1], world[2]);
    dot.userData.markerId = input.id;
    poiGroup.add(dot);
    const marker: PoiMarker = {
      pointType: input.pointType,
      coord: input.coord,
      world,
      dot,
      label: null,
      id: input.id,
      info: input.info,
      cover: null,
      hovered: false,
      visible: true,
      lodOk: true,
    };
    markers.set(marker.id, marker);
    ordered.push(marker);
  }

  function removeMarker(id: string): void {
    const marker = markers.get(id);
    if (!marker) return;
    poiGroup.remove(marker.dot);
    marker.dot.material.map?.dispose();
    marker.dot.material.dispose();
    if (marker.label) {
      poiGroup.remove(marker.label);
      marker.label.material.map?.dispose();
      marker.label.material.dispose();
    }
    markers.delete(id);
    ordered = ordered.filter((m) => m !== marker);
  }

  function setPois(pois: PoiInput[]): void {
    const wanted = new Set<string>();
    for (const input of pois) {
      wanted.add(input.id);
      const existing = markers.get(input.id);
      if (existing) {
        existing.coord = input.coord;
        existing.info = input.info;
        const w = gameCoordToWorld(input.coord, meta);
        existing.world = w;
        existing.dot.position.set(w[0], w[1], w[2]);
      } else {
        makeMarker(input);
      }
    }
    for (const id of [...markers.keys()]) {
      if (!wanted.has(id)) removeMarker(id);
    }
  }

  function updatePositions(moves: { id: string; coord: Vector3 }[]): void {
    for (const move of moves) {
      const marker = markers.get(move.id);
      if (!marker) continue;
      marker.coord = move.coord;
      marker.world = gameCoordToWorld(move.coord, meta);
      marker.dot.position.set(marker.world[0], marker.world[1], marker.world[2]);
    }
  }

  function pick(raycaster: THREE.Raycaster): PoiMarker | null {
    const hits = raycaster.intersectObjects(poiGroup.children, false);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      const marker = markers.get(hit.object.userData.markerId as string);
      if (marker) return marker;
    }
    return null;
  }

  const _distance = new THREE.Vector3();
  /** Keeps every dot/label at a constant on-screen size for the current camera.
   * worldSize = screenPx * dist * K where K = 2*tan(fov/2)/viewportHeight. */
  function update(camera: THREE.Camera): void {
    const camPos = camera.position;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 55;
    const K = (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)) / viewportH;
    for (const marker of ordered) {
      _distance.set(marker.world[0], marker.world[1], marker.world[2]).sub(camPos);
      const dist = Math.max(_distance.length(), 1);
      const s = dist * K;
      marker.dot.scale.set(13 * s, 13 * s, 1);
      if (marker.label) {
        // ~16px text at distance 1: 16px of the 128px canvas height scaled by dist*K.
        const fs = (16 * s) / 128;
        marker.label.scale.set(512 * fs, 128 * fs, 1);
      }
    }
  }

  function isResident(marker: PoiMarker): boolean {
    return (
      marker.pointType === PointType.Delivery &&
      (marker.info as DeliveryPoint).type === 'Resident_C'
    );
  }

  function applyVisibility(marker: PoiMarker): void {
    marker.dot.visible = marker.visible && (isResident(marker) ? marker.lodOk : true);
  }

  function syncCovers(): void {
    const active = tileManager.activeTiles;
    const activeList: {
      z: number;
      x: number;
      y: number;
      worldX0: number;
      worldZ0: number;
      tileSize: number;
    }[] = [];
    for (const tile of active.values()) {
      const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, tile.z, tile.x, tile.y);
      activeList.push({ z: tile.z, x: tile.x, y: tile.y, worldX0, worldZ0, tileSize });
    }
    for (const marker of ordered) {
      const wx = marker.world[0];
      const wz = marker.world[2];
      let cover: { z: number; x: number; y: number } | null = null;
      for (const tile of activeList) {
        if (
          wx >= tile.worldX0 &&
          wx <= tile.worldX0 + tile.tileSize &&
          wz >= tile.worldZ0 &&
          wz <= tile.worldZ0 + tile.tileSize
        ) {
          if (!cover || tile.z > cover.z) cover = { z: tile.z, x: tile.x, y: tile.y };
        }
      }
      marker.cover = cover;
      // Keep the marker's game z, but never let it sink under the terrain it sits on.
      if (cover) {
        const gy = groundHeight(wx, wz);
        if (marker.world[1] < gy + 1.5) {
          marker.world[1] = gy + 1.5;
          marker.dot.position.y = marker.world[1];
          if (marker.label) marker.label.position.y = marker.world[1];
        }
      }
      // Resident points only appear inside the finest LOD ring.
      marker.lodOk = !isResident(marker) || (cover?.z ?? -1) >= RESIDENT_MIN_COVER_Z;
      applyVisibility(marker);
    }
  }

  // ---- shortcut zone ground shade ----
  const shortcutGroup = new THREE.Group();
  scene.add(shortcutGroup);
  const shortcutMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {},
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      void main() {
        gl_FragColor = vec4(0.86, 0.07, 0.09, uOpacity);
      }
    `,
  });
  shortcutMat.uniforms.uOpacity = { value: 0.25 };
  shortcutGroup.visible = false;

  function setShortcutZones(zones: ShortcutZone[]): void {
    for (const child of [...shortcutGroup.children]) {
      shortcutGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }
    shortcutGroup.visible = zones.length > 0;
    for (const zone of zones) {
      const ring = zone.coordinates.map(([x, y]) => gameCoordToWorld({ x, y, z: 0 }, meta));
      if (ring.length < 3) continue;
      const RISE = 0.5;
      // Fan-triangulate the ring, draped onto the terrain height (+ small rise).
      const positions: number[] = [];
      const base = ring[0];
      const baseY = groundHeight(base[0], base[2]) + RISE;
      for (let i = 1; i < ring.length - 1; i++) {
        const y1 = groundHeight(ring[i][0], ring[i][2]) + RISE;
        const y2 = groundHeight(ring[i + 1][0], ring[i + 1][2]) + RISE;
        positions.push(base[0], baseY, base[2]);
        positions.push(ring[i][0], y1, ring[i][2]);
        positions.push(ring[i + 1][0], y2, ring[i + 1][2]);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mesh = new THREE.Mesh(geometry, shortcutMat);
      shortcutGroup.add(mesh);
    }
  }

  return {
    poiGroup,
    markerById: (id: string) => markers.get(id),
    markers: () => [...markers.values()],
    setPois,
    updatePositions,
    pick,
    update,
    syncCovers,
    setMarkerVisible(id: string, visible: boolean) {
      const marker = markers.get(id);
      if (!marker) return;
      marker.visible = visible;
      applyVisibility(marker);
    },
    setLabel(id: string, text: string) {
      const marker = markers.get(id);
      if (!marker) return;
      if (marker.label) {
        poiGroup.remove(marker.label);
        marker.label.material.map?.dispose();
        marker.label.material.dispose();
        marker.label = null;
      }
      if (!text) return;
      const sprite = makeTextSprite(text, {
        font: '600 40px sans-serif',
        fillStyle: colorTextDark,
        strokeStyle: adjustOpacity(colorGray950, 0.4),
        strokeWidth: 8,
      });
      // Anchor the label above the dot: half the label's world height above the marker.
      sprite.position.set(marker.world[0], marker.world[1], marker.world[2]);
      poiGroup.add(sprite);
      marker.label = sprite;
    },
    setShortcutZones,
    setViewportSize(_w: number, h: number) {
      viewportH = Math.max(h, 1);
    },
    dispose() {
      for (const marker of markers.values()) {
        poiGroup.remove(marker.dot);
        marker.dot.material.map?.dispose();
        marker.dot.material.dispose();
        if (marker.label) {
          poiGroup.remove(marker.label);
          marker.label.material.map?.dispose();
          marker.label.material.dispose();
        }
      }
      markers.clear();
      ordered = [];
      shortcutGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      scene.remove(shortcutGroup);
      shortcutMat.dispose();
    },
  };
}
