import * as THREE from 'three';
import { PointType, type PlayerData, type TeleportPoint } from '$lib/components/Map/Map/types';
import type { DeliveryPoint } from '$lib/data/deliveryPoint';
import type { House } from '$lib/data/house';
import type { Pin } from '$lib/schema/pin';
import type { Vector3 } from '$lib/types';
import type { TileManager } from './tileManager';
import type { TilesMeta } from './three-map-types';
import { gameCoordToWorld } from './coords';
import {
  POI_CONFIG,
  POI_DELIVERY_JOB_DEST,
  POI_DELIVERY_JOB_SOURCE,
  POI_DELIVERY_RESIDENT,
  type PoiDotStyle,
  type PoiLabelConfig,
} from './constants';
import { makeDotSprite, makeTextSprite } from './poi';
import { tileWorldRect } from './heightmap';
import { colorTextDark, colorGray950, adjustOpacity } from '$lib/tw-var';

/** One world point, fed in game/UE coordinates (x right, y down, z up, cm). */
export interface PoiInput {
  pointType: PointType;
  id: string;
  coord: Vector3;
  info: DeliveryPoint | House | PlayerData | Pin | TeleportPoint;
  /** 1 = source of an active job, 2 = destination, 0/absent = no job (OL delivery style). */
  jobs?: 0 | 1 | 2;
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
  /** Per-type label styling (size + vertical offset). */
  labelConfig: PoiLabelConfig;
  id: string;
  info: DeliveryPoint | House | PlayerData | Pin | TeleportPoint;
  /** Job role for delivery points: 1 = source, 2 = destination, else 0/undefined. */
  jobs?: 0 | 1 | 2;
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
  setViewportSize: (w: number, h: number) => void;
  dispose: () => void;
}

/** Resident points only render inside the finest LOD ring. */
const RESIDENT_MIN_COVER_Z = 5;

/** Viewport height used for the constant-screen-size projection (updated on resize). */
let viewportH = 800;

/** Dot style for a POI type - all values live in POI_CONFIG (constants.ts). */
function dotStyleFor(pointType: PointType): PoiDotStyle {
  return POI_CONFIG[pointType].dot;
}

/** Delivery point dot style, mirroring the OL map's delivery layer. */
function deliveryDotStyle(info: DeliveryPoint, jobs?: 0 | 1 | 2): PoiDotStyle {
  if (info.type === 'Resident_C') return POI_DELIVERY_RESIDENT;
  if (jobs === 1) return POI_DELIVERY_JOB_SOURCE;
  if (jobs === 2) return POI_DELIVERY_JOB_DEST;
  return POI_CONFIG[PointType.Delivery].dot;
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

  function makeMarker(input: PoiInput): void {
    const world = gameCoordToWorld(input.coord, meta);
    const palette =
      input.pointType === PointType.Delivery
        ? deliveryDotStyle(input.info as DeliveryPoint, input.jobs)
        : dotStyleFor(input.pointType);
    const dot = makeDotSprite(palette);
    dot.position.set(world[0], world[1], world[2]);
    dot.userData.markerId = input.id;
    dot.userData.dotSizePx = palette.size;
    poiGroup.add(dot);
    const marker: PoiMarker = {
      pointType: input.pointType,
      coord: input.coord,
      world,
      dot,
      label: null,
      labelConfig: POI_CONFIG[input.pointType].label,
      id: input.id,
      info: input.info,
      jobs: input.jobs,
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
        const jobs = input.jobs;
        if (jobs !== (existing.jobs ?? 0)) {
          existing.jobs = jobs;
          // Rebuild the dot sprite when the job role changed the palette/style.
          const palette =
            existing.pointType === PointType.Delivery
              ? deliveryDotStyle(existing.info as DeliveryPoint, jobs)
              : dotStyleFor(existing.pointType);
          const ndot = makeDotSprite(palette);
          ndot.position.copy(existing.dot.position);
          ndot.userData.markerId = existing.id;
          ndot.scale.copy(existing.dot.scale);
          ndot.userData.dotSizePx = palette.size;
          poiGroup.remove(existing.dot);
          existing.dot.material.map?.dispose();
          existing.dot.material.dispose();
          poiGroup.add(ndot);
          existing.dot = ndot;
        }
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
  const _upView = new THREE.Vector3();
  const _upWorld = new THREE.Vector3();
  const _markerPos = new THREE.Vector3();
  function update(camera: THREE.Camera): void {
    const camPos = camera.position;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 55;
    const K = (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)) / viewportH;
    // World direction that maps to "up" on screen (perpendicular to the view direction),
    // so the label rides above the dot regardless of camera roll.
    camera.getWorldDirection(_upView);
    _upWorld.copy(camera.up).projectOnPlane(_upView).normalize();
    for (const marker of ordered) {
      // Perspective projection scales by depth along the view axis, not Euclidean
      // distance - a marker at the viewport edge is farther from the camera in a straight
      // line but at the same depth, and would otherwise render oversize.
      const viewDepth = Math.max(
        _distance.set(marker.world[0], marker.world[1], marker.world[2]).sub(camPos).dot(_upView),
        1,
      );
      const s = viewDepth * K;
      const sizePx = marker.dot.userData.dotSizePx as number;
      marker.dot.scale.set(sizePx * s, sizePx * s, 1);
      if (marker.label) {
        // Sprite world height = 128*fs; the text occupies 40/128 of it. Solve fs so the
        // text is marker.labelConfig.sizePx on screen: s = viewDepth*K, screenPx = 40*fs / s.
        const fs = (marker.labelConfig.sizePx * s) / 40;
        marker.label.scale.set(512 * fs, 128 * fs, 1);
        marker.label.position
          .copy(_upWorld)
          .multiplyScalar(marker.labelConfig.offsetY * s)
          .add(_markerPos.set(marker.world[0], marker.world[1], marker.world[2]));
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
    const active = tileManager.activeTiles.values();
    const activeList: { z: number; x: number; y: number }[] = [];
    for (const tile of active) {
      activeList.push({ z: tile.z, x: tile.x, y: tile.y });
    }
    for (const marker of ordered) {
      let cover: { z: number; x: number; y: number } | null = null;
      for (const tile of activeList) {
        const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, tile.z, tile.x, tile.y);
        if (
          marker.world[0] >= worldX0 &&
          marker.world[0] <= worldX0 + tileSize &&
          marker.world[2] >= worldZ0 &&
          marker.world[2] <= worldZ0 + tileSize
        ) {
          if (!cover || tile.z > cover.z) cover = { z: tile.z, x: tile.x, y: tile.y };
        }
      }
      marker.cover = cover;
      // Resident points only appear inside the finest LOD ring.
      marker.lodOk = !isResident(marker) || (cover?.z ?? -1) >= RESIDENT_MIN_COVER_Z;
      applyVisibility(marker);
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
      // Anchor the label above the dot at the configured vertical offset.
      sprite.position.set(marker.world[0], marker.world[1], marker.world[2]);
      poiGroup.add(sprite);
      marker.label = sprite;
    },

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
    },
  };
}
