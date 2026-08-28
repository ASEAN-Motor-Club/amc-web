import * as THREE from 'three';
import { SpriteNodeMaterial } from 'three/webgpu';
import { instancedBufferAttribute, uniform } from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
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
} from './constants';
import {
  dotPaletteKey,
  dotSpriteScale,
  makeDotTexture,
  makeTextSprite,
  viewportScale,
} from './poi';
import type { TextSprite } from './poi';
import type { Renderer } from 'three/webgpu';
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
  /** Dot diameter in CSS px (the palette's). */
  diameterPx: number;
  /** On-screen text height for the label, in CSS px. */
  sizeCss: number;
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
  /** Reconciles only the given POI type's markers - other types are untouched. */
  setPoisFor: (pointType: PointType, pois: PoiInput[]) => void;
  /** Markers of one POI type (single data concern per effect). */
  markersOf: (pointType: PointType) => PoiMarker[];
  /** Returns the marker whose dot the pointer (in NDC) hits, or null. */
  pick: (raycaster: THREE.Raycaster, pointerNdc: THREE.Vector2) => PoiMarker | null;
  /** Keeps labels hanging above their dots (screen-up offset). Sizes are fixed by sizeAttenuation: false. */
  update: (camera: THREE.Camera) => void;
  /** Recomputes cover tiles and resident visibility. */
  syncCovers: () => void;
  setViewport: () => void;
  setMarkerVisible: (id: string, visible: boolean) => void;
  setLabel: (id: string, text: string) => void;
  dispose: () => void;
}

/**
 * One instanced sprite PER distinct dot palette (the three.js `webgpu_instance_sprites`
 * pattern, which the WebGPURenderer also runs under WebGL2 when WebGPU is unavailable).
 * Instancing only steps reliably when every instance shares the same texture, so each
 * palette - delivery base, resident, job source, job dest, house, player, pin, teleport -
 * gets its own sprite + single dot texture. The per-type scale is constant, so it goes
 * through a `uniform()` (like the example's `material.scaleNode = uniform(15)`); only the
 * per-instance position and opacity are buffer attributes. Markers are a plain collection
 * (OL-layer style): reconciling a type rewrites that type's sprite buffers, and only the
 * attribute actually touched gets `needsUpdate = true`. Labels cannot be instanced, so
 * each labelled marker keeps its own text Sprite.
 */

/** Resident points only render inside the finest LOD ring. */
const RESIDENT_MIN_COVER_Z = 5;

/** Per-sprite instanced capacity; doubles as a palette's markers grow. */
const MIN_CAPACITY = 64;

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

/** Palette for a marker; delivery points resolve their variant, everything else uses its type. */
function paletteFor(input: PoiInput): PoiDotStyle {
  return input.pointType === PointType.Delivery
    ? deliveryDotStyle(input.info as DeliveryPoint, input.jobs)
    : dotStyleFor(input.pointType);
}

/** One instanced sprite + its backing buffers, for a single dot texture. */
interface SpriteGroup {
  key: string;
  palette: PoiDotStyle;
  sprite: THREE.Sprite;
  material: SpriteNodeMaterial;
  /** scaleNode uniform - remade when the drawing-buffer height changes. */
  scale: UniformNode<'float', number>;
  /** The dpr the group's dot texture was drawn for. */
  dpr: number;
  posArray: Float32Array;
  opacityArray: Float32Array;
  posAttr: THREE.InstancedBufferAttribute;
  opacityAttr: THREE.InstancedBufferAttribute;
  capacity: number;
  /** Marker ids in this sprite, in render order. */
  ids: string[];
}

export function createPoiManager(
  scene: THREE.Scene,
  meta: TilesMeta,
  tileManager: TileManager,
  camera: THREE.PerspectiveCamera,
  renderer: Renderer,
): PoiManager {
  const poiGroup = new THREE.Group();
  scene.add(poiGroup);

  /** Sprite screen metrics for the current drawing buffer; refit on viewport changes. */
  let viewport = viewportScale(camera, renderer);

  /** Per-marker render data: which sprite group + slot inside it. */
  const state = new Map<string, { groupKey: string; slot: number }>();
  const markers = new Map<string, PoiMarker>();
  const groups = new Map<string, SpriteGroup>();
  let ordered: PoiMarker[] = [];

  /** A marker's render state - every marker created through makeMarker has one. */
  function stateOf(id: string): { groupKey: string; slot: number } {
    const s = state.get(id);
    if (!s) throw new Error(`missing render state for marker ${id}`);
    return s;
  }

  /** A definitely-present sprite group (throws on inconsistency rather than corrupting buffers). */
  function groupOf(key: string): SpriteGroup {
    const group = groups.get(key);
    if (!group) throw new Error(`missing sprite group ${key}`);
    return group;
  }

  function makeGroup(palette: PoiDotStyle): SpriteGroup {
    const key = dotPaletteKey(palette);
    const posArray = new Float32Array(MIN_CAPACITY * 3);
    const opacityArray = new Float32Array(MIN_CAPACITY);
    const posAttr = new THREE.InstancedBufferAttribute(posArray, 3);
    const opacityAttr = new THREE.InstancedBufferAttribute(opacityArray, 1);

    const material = new SpriteNodeMaterial({
      sizeAttenuation: false,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    material.map = makeDotTexture(palette, viewport);
    // Per-instance position + visibility; the palette size is constant for the whole
    // sprite, so it is a uniform - exactly the example's `scaleNode = uniform(15)`.
    material.positionNode = instancedBufferAttribute(posAttr);
    material.opacityNode = instancedBufferAttribute(opacityAttr);
    // The dot canvas maps 1:1 onto device pixels for the current drawing buffer.
    const scale = uniform(dotSpriteScale(palette, viewport));
    material.scaleNode = scale;

    const sprite = new THREE.Sprite(material);
    sprite.count = MIN_CAPACITY;
    sprite.frustumCulled = false;
    sprite.renderOrder = 1;
    poiGroup.add(sprite);

    const group: SpriteGroup = {
      key,
      palette,
      sprite,
      material,
      scale,
      dpr: viewport.dpr,
      posArray,
      opacityArray,
      posAttr,
      opacityAttr,
      capacity: MIN_CAPACITY,
      ids: [],
    };
    groups.set(key, group);
    return group;
  }

  function groupFor(palette: PoiDotStyle): SpriteGroup {
    const key = dotPaletteKey(palette);
    return groups.get(key) ?? makeGroup(palette);
  }

  /** Grows one group's buffers (carrying live data over) and rebuilds its sprite. */
  function ensureGroupCapacity(group: SpriteGroup, needed: number): void {
    if (needed <= group.capacity) return;
    let next = group.capacity;
    while (next < needed) next *= 2;
    const newPos = new Float32Array(next * 3);
    newPos.set(group.posArray);
    const newOpacity = new Float32Array(next);
    newOpacity.set(group.opacityArray);
    group.posArray = newPos;
    group.opacityArray = newOpacity;
    group.capacity = next;

    group.posAttr = new THREE.InstancedBufferAttribute(newPos, 3);
    group.opacityAttr = new THREE.InstancedBufferAttribute(newOpacity, 1);
    group.material.positionNode = instancedBufferAttribute(group.posAttr);
    group.material.opacityNode = instancedBufferAttribute(group.opacityAttr);

    poiGroup.remove(group.sprite);
    group.sprite.material.dispose();
    group.sprite = new THREE.Sprite(group.material);
    group.sprite.count = group.capacity;
    group.sprite.frustumCulled = false;
    group.sprite.renderOrder = 1;
    poiGroup.add(group.sprite);
  }

  /** A marker draws when user-visible AND, for residents, inside the finest ring. */
  function draws(marker: PoiMarker): boolean {
    return marker.visible && (isResident(marker) ? marker.lodOk : true);
  }

  function isResident(marker: PoiMarker): boolean {
    return (
      marker.pointType === PointType.Delivery &&
      (marker.info as DeliveryPoint).type === 'Resident_C'
    );
  }

  /**
   * Rewrites one group's position + opacity buffers from its marker ids, then its draw
   * count. Both attributes carried new data, so both are flagged.
   */
  function refreshGroup(group: SpriteGroup): void {
    ensureGroupCapacity(group, group.ids.length);
    for (let i = 0; i < group.ids.length; i++) {
      const marker = markers.get(group.ids[i]);
      if (!marker) continue;
      const s = stateOf(marker.id);
      s.slot = i;
      const [wx, wy, wz] = marker.world;
      group.posArray[i * 3] = wx;
      group.posArray[i * 3 + 1] = wy;
      group.posArray[i * 3 + 2] = wz;
      group.opacityArray[i] = draws(marker) ? 1 : 0;
    }
    group.posAttr.needsUpdate = true;
    group.opacityAttr.needsUpdate = true;
    group.sprite.count = group.ids.length;
  }

  /**
   * Rebuilds every group. Used when markers move between palettes (job role changes);
   * a normal setPoisFor only refreshes the touched group.
   */
  function refreshAll(): void {
    for (const group of groups.values()) refreshGroup(group);
  }

  // ---- markers (plain collection; OL-layer style). ----

  function makeMarker(input: PoiInput): PoiMarker {
    const world = gameCoordToWorld(input.coord, meta);
    const palette = paletteFor(input);
    const marker: PoiMarker = {
      pointType: input.pointType,
      coord: input.coord,
      world,
      diameterPx: palette.diameterPx,
      sizeCss: POI_CONFIG[input.pointType].label.sizeCss,
      id: input.id,
      info: input.info,
      jobs: input.jobs,
      cover: null,
      hovered: false,
      visible: true,
      lodOk: true,
    };
    const group = groupFor(palette);
    state.set(marker.id, { groupKey: group.key, slot: group.ids.length });
    markers.set(marker.id, marker);
    group.ids.push(marker.id);
    ordered.push(marker);
    return marker;
  }

  function removeMarker(id: string): void {
    const marker = markers.get(id);
    if (!marker) return;
    const s = stateOf(id);
    const group = groupOf(s.groupKey);
    group.ids = group.ids.filter((gid) => gid !== id);
    markers.delete(id);
    state.delete(id);
    removeLabel(id);
    ordered = ordered.filter((m) => m !== marker);
  }

  function setPoisFor(pointType: PointType, pois: PoiInput[]): void {
    const wanted = new Set<string>();
    const touched = new Set<string>();
    for (const input of pois) {
      wanted.add(input.id);
      const existing = markers.get(input.id);
      if (existing) {
        existing.coord = input.coord;
        existing.info = input.info;
        existing.world = gameCoordToWorld(input.coord, meta);
        const jobs = input.jobs;
        if (jobs !== (existing.jobs ?? 0)) {
          existing.jobs = jobs;
          const palette = paletteFor(input);
          existing.diameterPx = palette.diameterPx;
          const prev = stateOf(existing.id);
          const newGroup = groupFor(palette);
          if (newGroup.key !== prev.groupKey) {
            const oldGroup = groupOf(prev.groupKey);
            oldGroup.ids = oldGroup.ids.filter((gid) => gid !== existing.id);
            state.set(existing.id, { groupKey: newGroup.key, slot: newGroup.ids.length });
            newGroup.ids.push(existing.id);
            touched.add(oldGroup.key);
            touched.add(newGroup.key);
          }
        }
        // The marker may have moved (live players) - its group buffer needs a rewrite
        // even though it stays in the same palette/sprite.
        touched.add(stateOf(existing.id).groupKey);
      } else {
        makeMarker(input);
        touched.add(stateOf(input.id).groupKey);
      }
    }
    // Remove only this type's markers that are no longer wanted - never touch other types'
    // markers so a changing data source (e.g. live players) can't disturb their dots.
    for (const [id, m] of [...markers]) {
      if (m.pointType === pointType && !wanted.has(id)) {
        touched.add(stateOf(id).groupKey);
        removeMarker(id);
      }
    }
    for (const key of touched) {
      const group = groups.get(key);
      if (group) refreshGroup(group);
    }
  }

  function applyVisibility(marker: PoiMarker): void {
    const s = state.get(marker.id);
    if (!s) return;
    const group = groups.get(s.groupKey);
    if (!group || s.slot < 0) return;
    group.opacityArray[s.slot] = draws(marker) ? 1 : 0;
    // Only the opacity slice changed.
    group.opacityAttr.needsUpdate = true;
  }

  // ---- picking. ----

  const _projPos = new THREE.Vector3();

  function pick(raycaster: THREE.Raycaster, pointerNdc?: THREE.Vector2): PoiMarker | null {
    const camera = raycaster.camera as THREE.Camera | null;
    if (!camera || !pointerNdc) return null;

    // sizeAttenuation:false sprites keep a constant screen size, so at any depth the dot's
    // NDC half-extent is (diameter/2 + stroke) / tan(fovY/2) - independent of distance, and
    // exactly the hit area of the fill circle drawn in the group's canvas. Project each
    // marker to NDC and test 2D distance against that constant radius, nearest-first so an
    // overlapping nearer dot wins (matching the old per-sprite raycast's sort order).
    const fovY = (camera as THREE.PerspectiveCamera).fov;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(fovY / 2));

    const candidates = ordered
      .filter((m) => draws(m))
      .map((m) => {
        _projPos.set(m.world[0], m.world[1], m.world[2]).project(camera);
        const dx = camera.position.x - m.world[0];
        const dy = camera.position.y - m.world[1];
        const dz = camera.position.z - m.world[2];
        return {
          m,
          ndcX: _projPos.x,
          ndcY: _projPos.y,
          ndcZ: _projPos.z,
          d: dx * dx + dy * dy + dz * dz,
        };
      })
      .sort((a, b) => a.d - b.d);

    for (const c of candidates) {
      // Half the drawn canvas side in world units - the fill circle exactly fills it.
      const group = groupOf(stateOf(c.m.id).groupKey);
      const half = group.scale.value / 2 / tanHalfFov;
      // Markers behind the camera project to an out-of-range NDC z - skip them.
      if (c.ndcZ <= -1 || c.ndcZ >= 1) continue;
      const dx = c.ndcX - pointerNdc.x;
      const dy = c.ndcY - pointerNdc.y;
      if (dx * dx + dy * dy <= half * half) return c.m;
    }
    return null;
  }

  // ---- labels (cannot be instanced - one Sprite per labelled marker). ----

  const labels = new Map<string, TextSprite>();

  function removeLabel(id: string): void {
    const label = labels.get(id);
    if (!label) return;
    poiGroup.remove(label.sprite);
    const material = label.sprite.material;
    material.map?.dispose();
    material.dispose();
    labels.delete(id);
  }

  function setLabel(id: string, text: string): void {
    const marker = markers.get(id);
    if (!marker) return;
    removeLabel(id);
    if (!text) return;
    const label = makeTextSprite(
      text,
      {
        weight: 600,
        sizeCss: marker.sizeCss,
        family: 'sans-serif',
        fillStyle: colorTextDark,
        strokeStyle: adjustOpacity(colorGray950, 0.4),
        strokeWidthCss: 1,
      },
      viewport,
    );
    poiGroup.add(label.sprite);
    labels.set(id, label);
  }

  // ---- update (position labels above dots). ----

  const _upView = new THREE.Vector3();
  const _upWorld = new THREE.Vector3();
  const _markerPos = new THREE.Vector3();

  function update(camera: THREE.Camera): void {
    if (labels.size === 0) return;
    // Labels hang above their dots along the screen-up direction (which rotates with
    // camera yaw). Sizes are fixed by sizeAttenuation: false - only the offset moves.
    camera.getWorldDirection(_upView);
    _upWorld.copy(camera.up).projectOnPlane(_upView).normalize();
    for (const marker of ordered) {
      const label = labels.get(marker.id);
      if (!label) continue;
      label.sprite.position
        .copy(_upWorld)
        .add(_markerPos.set(marker.world[0], marker.world[1], marker.world[2]));
    }
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

  /**
   * Refits every sprite to the current drawing buffer. New buffer height → new
   * pxPerWorld → new scaleNode values; a DPR change redraws dot textures and label
   * sprites at the new native size (a DPR change always accompanies a buffer resize).
   */
  function setViewport(): void {
    const next = viewportScale(camera, renderer);
    if (next.dpr === viewport.dpr && next.pxPerWorld === viewport.pxPerWorld) return;
    const dprChanged = next.dpr !== viewport.dpr;
    viewport = next;
    for (const group of groups.values()) {
      if (dprChanged) {
        const oldMap = group.material.map;
        group.material.map = makeDotTexture(group.palette, viewport);
        oldMap?.dispose();
      }
      group.scale.value = dotSpriteScale(group.palette, viewport);
    }
    if (dprChanged) {
      for (const [id, label] of labels) {
        const remade = makeTextSprite(label.text, label.style, viewport);
        poiGroup.remove(label.sprite);
        const material = label.sprite.material;
        material.map?.dispose();
        material.dispose();
        poiGroup.add(remade.sprite);
        labels.set(id, remade);
      }
    } else {
      for (const label of labels.values()) {
        label.sprite.scale.set(
          label.widthDevice / viewport.pxPerWorld,
          label.heightDevice / viewport.pxPerWorld,
          1,
        );
      }
    }
  }

  refreshAll();

  return {
    poiGroup,
    markerById: (id: string) => markers.get(id),
    markers: () => [...markers.values()],
    setPoisFor,
    markersOf: (pointType: PointType) => ordered.filter((m) => m.pointType === pointType),
    pick,
    syncCovers,
    setMarkerVisible(id: string, visible: boolean) {
      const marker = markers.get(id);
      if (!marker) return;
      marker.visible = visible;
      applyVisibility(marker);
    },
    setLabel,
    update,
    setViewport,
    dispose() {
      for (const id of [...labels.keys()]) removeLabel(id);
      markers.clear();
      state.clear();
      ordered = [];
      for (const group of groups.values()) {
        poiGroup.remove(group.sprite);
        group.material.map?.dispose();
        group.material.dispose();
      }
      groups.clear();
    },
  };
}
