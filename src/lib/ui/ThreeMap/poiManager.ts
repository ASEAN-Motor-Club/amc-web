import * as THREE from 'three';
import { PointType, type PlayerData, type TeleportPoint } from '#lib/components/Map/Map/types.ts';
import type { DeliveryPoint } from '#lib/data/deliveryPoint.ts';
import type { House } from '#lib/data/house.ts';
import type { Pin } from '#lib/schema/pin.ts';
import type { Vector3 } from '#lib/types/index.ts';
import type { TileManager } from './tileManager.ts';
import type { TilesMeta } from './three-map-types.ts';
import { gameCoordToWorld } from './coords.ts';
import {
  POI_CONFIG,
  POI_DELIVERY_JOB_DEST,
  POI_DELIVERY_JOB_SOURCE,
  POI_DELIVERY_RESIDENT,
  POI_HOUSE_VACANT,
  POI_HOUSE_SEVERE,
  POI_PICK_MARKER,
  PICK_MARKER_RENDER_ORDER,
  type PoiDotStyle,
} from './constants.ts';
import {
  DOT_ATLAS_CELLS,
  dotCanvasSidePx,
  dotPaletteKey,
  makeDotAtlasTexture,
  makeTextSprite,
  PoiState,
  snapLabelToPixelGrid,
  viewportScale,
} from './poi.ts';
import type { TextSprite } from './poi.ts';
import type { Renderer } from 'three/webgpu';
import { tileWorldRect } from './heightmap.ts';
import { createPickGrid } from './pickGrid.ts';
import { createScreenQuads, type ScreenQuads } from './screenQuads.ts';
import { getViewBufferSize, getViewCssSize } from './viewRect.ts';
import { colorTextDark, colorGray950, adjustOpacity, fontSans } from '#lib/tw-var.ts';

/** One world point, fed in game/UE coordinates (x right, y down, z up, cm). */
export interface PoiInput {
  pointType: PointType;
  id: string;
  coord: Vector3;
  info: DeliveryPoint | House | PlayerData | Pin | TeleportPoint;
  /** 1 = source of an active job, 2 = destination, 0/absent = no job (OL delivery style). */
  jobs?: 0 | 1 | 2;
  /** House nobody rents (OL house style). */
  vacant?: boolean;
  /** House whose depot is nearly out of stock (OL house style). */
  severe?: boolean;
}

export interface PoiMarker {
  pointType: PointType;
  /** World position (meters, y-up). */
  world: [x: number, y: number, z: number];
  /** On-screen text height for the label, in CSS px. */
  sizeCss: number;
  id: string;
  info: DeliveryPoint | House | PlayerData | Pin | TeleportPoint;
  /** Job role for delivery points: 1 = source, 2 = destination, else 0/undefined. */
  jobs?: 0 | 1 | 2;
  /** Vacant house - drawn with the vacant palette. */
  vacant?: boolean;
  /** House with a nearly-empty depot - drawn with the severe palette. */
  severe?: boolean;
  /** User-facing visibility (POI toggle). */
  visible: boolean;
  /** Resident LOD gate: true when the marker sits in the z5 ring. */
  lodOk: boolean;
  /** Which instanced quad group (palette) draws this marker, and its slot in
   * that group's buffers - maintained by makeMarker/setPoisFor/refreshGroup. */
  groupKey: string;
  slot: number;
  /** Atlas cell currently drawn (hover/selected paint - see setMarkerState). */
  state: PoiState;
}

export interface PoiManager {
  markerById: (id: string) => PoiMarker | undefined;
  /** Reconciles only the given POI type's markers - other types are untouched. */
  setPoisFor: (pointType: PointType, pois: PoiInput[]) => void;
  /** Markers of one POI type (single data concern per effect). */
  markersOf: (pointType: PointType) => PoiMarker[];
  /** Returns the topmost marker whose dot contains the pointer, or null. `x`/`y` are CSS px
   * relative to the canvas (y down). */
  pick: (x: number, y: number) => PoiMarker | null;
  /** Pixel-aligns the labels to the drawing buffer (call once per rendered frame). */
  update: (camera: THREE.Camera) => void;
  /** Shows the coordinate picker's pointer at a world position (meters, y-up), or hides it. */
  setPickPoint: (world: [x: number, y: number, z: number] | undefined) => void;
  /** Repaints one marker's dot with the given visual state (hover/selected). */
  setMarkerState: (id: string, state: PoiState) => void;
  /** Redraws every label sprite, e.g. after a web font finished loading. */
  refreshLabels: () => void;
  /** Recomputes cover tiles and resident visibility. */
  syncCovers: () => void;
  /** The 2D view's zoom, or undefined in 3D. While set, tier gates (resident dots) compare the view
   * zoom the way OL's layer `minZoom` did instead of looking at the covering tile. */
  setViewZoom: (zoom: number | undefined) => void;
  setViewport: () => void;
  setLabel: (id: string, text: string) => void;
  dispose: () => void;
}

/**
 * One instanced quad group PER distinct dot palette (`screenQuads.ts`): delivery base, resident, job
 * source, job dest, house, vacant house, player, pin, teleport... each gets its own mesh and one dot
 * ATLAS texture whose three cells hold the visual states (normal | hover | selected); a per-instance
 * state attribute picks the cell. Markers are a plain collection (OL-layer style): reconciling a
 * type rewrites that type's group buffers, and only the attribute actually touched is re-uploaded.
 * Labels cannot be instanced, so each labelled marker keeps its own text Sprite.
 */

/** Resident points only render inside the finest LOD ring (3D: the covering tile reaches this
 * zoom) / above this view zoom (2D: OL's resident layer `minZoom`, exclusive). */
const RESIDENT_MIN_COVER_Z = 5;

/** Per-sprite instanced capacity; doubles as a palette's markers grow. */
const MIN_CAPACITY = 64;

/** Dot style for a POI type - all values live in POI_CONFIG (constants.ts). */
function dotStyleFor(pointType: PointType): PoiDotStyle {
  return POI_CONFIG[pointType].dot;
}

/** Delivery point dot style, mirroring the OL map's delivery layer. OL renders a job
 * endpoint identically on the delivery and resident layers (orange fill, 2px stroke,
 * green/blue stroke), so the job check precedes the resident check. */
function deliveryDotStyle(info: DeliveryPoint, jobs?: 0 | 1 | 2): PoiDotStyle {
  if (jobs === 1) return POI_DELIVERY_JOB_SOURCE;
  if (jobs === 2) return POI_DELIVERY_JOB_DEST;
  if (info.type === 'Resident_C') return POI_DELIVERY_RESIDENT;
  return POI_CONFIG[PointType.Delivery].dot;
}

/** Palette for a marker; deliveries and houses resolve their variant, everything else uses its type. */
function paletteFor(input: PoiInput): PoiDotStyle {
  if (input.pointType === PointType.Delivery) {
    return deliveryDotStyle(input.info as DeliveryPoint, input.jobs);
  }
  if (input.pointType === PointType.House && input.vacant) return POI_HOUSE_VACANT;
  if (input.pointType === PointType.House && input.severe) return POI_HOUSE_SEVERE;
  return dotStyleFor(input.pointType);
}

/** OL's layer order for dots, bottom to top: delivery, house, player, teleport, pins. */
const DOT_LAYER_RANK: Record<number, number> = {
  [PointType.Delivery]: 0,
  [PointType.House]: 1,
  [PointType.Player]: 2,
  [PointType.Teleport]: 3,
  [PointType.Pin]: 4,
  [PointType.ShortcutZone]: 5,
};
/** Dots draw above ground overlays (0) and below labels (2); fractions keep the layer order. */
const dotRenderOrder = (pointType: PointType): number => 1 + DOT_LAYER_RANK[pointType] * 0.01;

/** Pick-grid cell in CSS px: at least the widest dot's diameter. */
const PICK_CELL_CSS_PX = 32;

/** One instanced quad mesh + its atlas, for a single dot palette. */
interface DotGroup {
  key: string;
  palette: PoiDotStyle;
  quads: ScreenQuads;
  /** The palette's atlas; owned here (disposed on DPR change / teardown). */
  atlasTexture: THREE.CanvasTexture;
  /** Hit radius in CSS px (half the drawn canvas side). */
  hitRadiusCss: number;
  /** Draw order of the group's layer; the pick grid ranks overlaps by it. */
  renderOrder: number;
  /** Marker ids in this group, in render order. */
  ids: string[];
}

export function createPoiManager(
  scene: THREE.Scene,
  meta: TilesMeta,
  tileManager: TileManager,
  camera: THREE.Camera,
  renderer: Renderer,
  /** Called after any change to what the markers draw - the scene renders on demand. */
  invalidate: () => void,
): PoiManager {
  const poiGroup = new THREE.Group();
  scene.add(poiGroup);

  /** Sprite screen metrics for the current drawing buffer; refit on viewport changes. */
  let viewport = viewportScale(camera, renderer);

  const markers = new Map<string, PoiMarker>();
  const groups = new Map<string, DotGroup>();
  let ordered: PoiMarker[] = [];
  /** Bumped by every write that changes what is drawn or where; invalidates the pick grid. */
  let layoutVersion = 0;

  /** A definitely-present dot group (throws on inconsistency rather than corrupting buffers). */
  function groupOf(key: string): DotGroup {
    const group = groups.get(key);
    if (!group) throw new Error(`missing dot group ${key}`);
    return group;
  }

  function makeGroup(palette: PoiDotStyle, pointType: PointType): DotGroup {
    const key = dotPaletteKey(palette);
    const atlasTexture = makeDotAtlasTexture(palette, viewport);
    const sidePx = dotCanvasSidePx(palette, viewport);
    const renderOrder = dotRenderOrder(pointType);
    const quads = createScreenQuads({
      atlas: atlasTexture,
      cells: DOT_ATLAS_CELLS,
      sidePx,
      renderOrder,
      capacity: MIN_CAPACITY,
    });
    poiGroup.add(quads.mesh);
    const group: DotGroup = {
      key,
      palette,
      quads,
      atlasTexture,
      hitRadiusCss: sidePx / 2 / viewport.dpr,
      renderOrder,
      ids: [],
    };
    groups.set(key, group);
    return group;
  }

  function groupFor(palette: PoiDotStyle, pointType: PointType): DotGroup {
    return groups.get(dotPaletteKey(palette)) ?? makeGroup(palette, pointType);
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
   * Rewrites one group's anchor + opacity + state buffers from its marker ids, then its draw
   * count. All three attributes carried new data, so all are flagged.
   */
  function refreshGroup(group: DotGroup): void {
    group.quads.ensureCapacity(group.ids.length);
    const { anchors, opacities, states } = group.quads;
    for (let i = 0; i < group.ids.length; i++) {
      const marker = markers.get(group.ids[i]);
      if (!marker) continue;
      marker.slot = i;
      const [wx, wy, wz] = marker.world;
      anchors[i * 3] = wx;
      anchors[i * 3 + 1] = wy;
      anchors[i * 3 + 2] = wz;
      labels.get(marker.id)?.sprite.position.set(wx, wy, wz);
      opacities[i] = draws(marker) ? 1 : 0;
      states[i] = marker.state;
    }
    group.quads.commit(group.ids.length);
    layoutVersion++;
    invalidate();
  }

  // ---- markers (plain collection; OL-layer style). ----

  function makeMarker(input: PoiInput): PoiMarker {
    const palette = paletteFor(input);
    const group = groupFor(palette, input.pointType);
    const marker: PoiMarker = {
      pointType: input.pointType,
      world: gameCoordToWorld(input.coord, meta),
      sizeCss: POI_CONFIG[input.pointType].label.sizeCss,
      id: input.id,
      info: input.info,
      jobs: input.jobs,
      vacant: input.vacant,
      visible: true,
      lodOk: true,
      groupKey: group.key,
      slot: group.ids.length,
      state: PoiState.Normal,
    };
    markers.set(marker.id, marker);
    group.ids.push(marker.id);
    ordered.push(marker);
    return marker;
  }

  function removeMarker(id: string): void {
    const marker = markers.get(id);
    if (!marker) return;
    const group = groupOf(marker.groupKey);
    group.ids = group.ids.filter((gid) => gid !== id);
    markers.delete(id);
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
        existing.info = input.info;
        existing.world = gameCoordToWorld(input.coord, meta);
        const jobs = input.jobs;
        const vacant = input.vacant;
        const severe = input.severe;
        if (
          (jobs ?? 0) !== (existing.jobs ?? 0) ||
          !!vacant !== !!existing.vacant ||
          !!severe !== !!existing.severe
        ) {
          existing.jobs = jobs;
          existing.vacant = vacant;
          existing.severe = severe;
          const newGroup = groupFor(paletteFor(input), input.pointType);
          if (newGroup.key !== existing.groupKey) {
            const oldGroup = groupOf(existing.groupKey);
            oldGroup.ids = oldGroup.ids.filter((gid) => gid !== existing.id);
            existing.groupKey = newGroup.key;
            existing.slot = newGroup.ids.length;
            newGroup.ids.push(existing.id);
            touched.add(oldGroup.key);
          }
        }
        // The marker may have moved (live players) - its group buffer needs a rewrite
        // even though it stays in the same palette/sprite.
        touched.add(existing.groupKey);
      } else {
        touched.add(makeMarker(input).groupKey);
      }
    }
    // Remove only this type's markers that are no longer wanted - never touch other types'
    // markers so a changing data source (e.g. live players) can't disturb their dots.
    for (const [id, m] of [...markers]) {
      if (m.pointType === pointType && !wanted.has(id)) {
        touched.add(m.groupKey);
        removeMarker(id);
      }
    }
    for (const key of touched) {
      const group = groups.get(key);
      if (group) refreshGroup(group);
    }
  }

  function applyVisibility(marker: PoiMarker): void {
    const group = groups.get(marker.groupKey);
    if (!group) return;
    const opacity = draws(marker) ? 1 : 0;
    if (group.quads.opacities[marker.slot] === opacity) return;
    group.quads.opacities[marker.slot] = opacity;
    // Only the opacity slice changed.
    group.quads.commitOpacity();
    layoutVersion++;
    invalidate();
  }

  function setMarkerState(id: string, state: PoiState): void {
    const marker = markers.get(id);
    if (!marker || marker.state === state) return;
    marker.state = state;
    const group = groups.get(marker.groupKey);
    if (!group) return;
    group.quads.states[marker.slot] = state;
    // Only the state slice changed (applyVisibility-style single-slot write).
    group.quads.commitState();
    invalidate();
  }

  // ---- picking. ----
  //
  // Dots are constant-size screen quads, so a hit is "pointer within the dot's drawn half-side of its
  // projected anchor", topmost layer first. Projecting every marker per pointermove is O(n); instead
  // the projected dots go into a screen-space hash grid that is rebuilt only when the camera, the
  // canvas size or the marker layout changed, making each pick a few cell lookups.

  const pickGrid = createPickGrid<PoiMarker>(PICK_CELL_CSS_PX);
  const _pickPos = new THREE.Vector3();
  const _gridView = new Float64Array(32);
  const _viewCss = new THREE.Vector2();
  let gridLayoutVersion = -1;
  let gridWidth = 0;
  let gridHeight = 0;

  /** Rebuilds the grid when anything that moves a projected dot has changed. */
  function ensurePickGrid(width: number, height: number): void {
    camera.updateMatrixWorld();
    const view = camera.matrixWorldInverse.elements;
    const proj = camera.projectionMatrix.elements;
    let changed =
      gridLayoutVersion !== layoutVersion || gridWidth !== width || gridHeight !== height;
    for (let i = 0; i < 16; i++) {
      if (_gridView[i] !== view[i] || _gridView[16 + i] !== proj[i]) changed = true;
      _gridView[i] = view[i];
      _gridView[16 + i] = proj[i];
    }
    if (!changed) return;
    gridLayoutVersion = layoutVersion;
    gridWidth = width;
    gridHeight = height;
    pickGrid.reset(width, height);
    for (const group of groups.values()) {
      for (const id of group.ids) {
        const marker = markers.get(id);
        // Pins are display-only (they never had a tooltip or click action).
        if (!marker || !draws(marker) || marker.pointType === PointType.Pin) continue;
        _pickPos.set(marker.world[0], marker.world[1], marker.world[2]).project(camera);
        // Behind the camera / past the clip planes: not on screen.
        if (_pickPos.z < -1 || _pickPos.z > 1) continue;
        pickGrid.add(
          marker,
          (_pickPos.x * 0.5 + 0.5) * width,
          (0.5 - _pickPos.y * 0.5) * height,
          group.hitRadiusCss,
          group.renderOrder,
        );
      }
    }
  }

  function pick(x: number, y: number): PoiMarker | null {
    getViewCssSize(renderer, _viewCss);
    if (_viewCss.x === 0 || _viewCss.y === 0) return null;
    ensurePickGrid(_viewCss.x, _viewCss.y);
    return pickGrid.query(x, y) ?? null;
  }

  // ---- the coordinate picker's pointer (not a marker: never hit-tested, never labelled). ----

  let pickQuads: { quads: ScreenQuads; atlas: THREE.CanvasTexture } | undefined;

  function setPickPoint(world: [x: number, y: number, z: number] | undefined): void {
    if (!world) {
      pickQuads?.quads.commit(0);
      invalidate();
      return;
    }
    if (!pickQuads) {
      const atlas = makeDotAtlasTexture(POI_PICK_MARKER, viewport);
      const quads = createScreenQuads({
        atlas,
        cells: DOT_ATLAS_CELLS,
        sidePx: dotCanvasSidePx(POI_PICK_MARKER, viewport),
        renderOrder: PICK_MARKER_RENDER_ORDER,
      });
      poiGroup.add(quads.mesh);
      pickQuads = { quads, atlas };
    }
    const { quads } = pickQuads;
    quads.anchors.set(world);
    quads.opacities[0] = 1;
    quads.states[0] = PoiState.Normal;
    quads.commit(1);
    invalidate();
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
    invalidate();
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
        family: fontSans,
        fillStyle: colorTextDark,
        strokeStyle: adjustOpacity(colorGray950, 0.4),
        strokeWidthCss: 3,
        liftCss: POI_CONFIG[marker.pointType].label.offsetCss,
      },
      viewport,
    );
    label.sprite.position.set(marker.world[0], marker.world[1], marker.world[2]);
    poiGroup.add(label.sprite);
    labels.set(id, label);
    invalidate();
  }

  // ---- update (pixel-align labels). ----

  const _buffer = new THREE.Vector2();

  /** Label sprites hang bottom-centre on their dot (the glyph lift is baked into the canvas);
   * each frame only their sub-pixel alignment follows the camera. */
  function update(camera: THREE.Camera): void {
    if (labels.size === 0) return;
    camera.updateMatrixWorld();
    getViewBufferSize(renderer, _buffer);
    for (const label of labels.values()) snapLabelToPixelGrid(label, camera, _buffer);
  }

  let viewZoom: number | undefined;

  function syncCovers(): void {
    if (viewZoom !== undefined) {
      // 2D: OL showed the resident layer above zoom 5 (`minZoom` is exclusive).
      for (const marker of ordered) {
        marker.lodOk = !isResident(marker) || viewZoom > RESIDENT_MIN_COVER_Z;
        applyVisibility(marker);
      }
      return;
    }
    const activeList = [...tileManager.activeTiles.values()];
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
      // Resident points only appear inside the finest LOD ring.
      marker.lodOk = !isResident(marker) || (cover?.z ?? -1) >= RESIDENT_MIN_COVER_Z;
      applyVisibility(marker);
    }
  }

  /** Redraws every label sprite (DPR change, or a web font arrived after the text was drawn). */
  function remakeLabels(): void {
    for (const [id, label] of labels) {
      const remade = makeTextSprite(label.text, label.style, viewport);
      remade.sprite.position.copy(label.sprite.position);
      poiGroup.remove(label.sprite);
      const material = label.sprite.material;
      material.map?.dispose();
      material.dispose();
      poiGroup.add(remade.sprite);
      labels.set(id, remade);
    }
    invalidate();
  }

  /**
   * Redraws everything baked at device size when the DPR changes: dot atlases (and their hit
   * radius) and label sprites. Dots are screen-space quads, so a plain buffer resize needs
   * nothing; label scales follow the projection each frame (`snapLabelToPixelGrid`).
   */
  function setViewport(): void {
    const next = viewportScale(camera, renderer);
    if (next.dpr === viewport.dpr) return;
    invalidate();
    viewport = next;
    layoutVersion++;
    for (const group of groups.values()) {
      const oldTexture = group.atlasTexture;
      group.atlasTexture = makeDotAtlasTexture(group.palette, viewport);
      const sidePx = dotCanvasSidePx(group.palette, viewport);
      group.quads.setAtlas(group.atlasTexture, sidePx);
      group.hitRadiusCss = sidePx / 2 / viewport.dpr;
      oldTexture.dispose();
    }
    if (pickQuads) {
      const oldAtlas = pickQuads.atlas;
      pickQuads.atlas = makeDotAtlasTexture(POI_PICK_MARKER, viewport);
      pickQuads.quads.setAtlas(pickQuads.atlas, dotCanvasSidePx(POI_PICK_MARKER, viewport));
      oldAtlas.dispose();
    }
    remakeLabels();
  }

  return {
    markerById: (id: string) => markers.get(id),
    setPoisFor,
    markersOf: (pointType: PointType) => ordered.filter((m) => m.pointType === pointType),
    pick,
    syncCovers,
    refreshLabels: remakeLabels,
    setViewZoom: (zoom) => {
      viewZoom = zoom;
    },
    setLabel,
    update,
    setMarkerState,
    setPickPoint,
    setViewport,
    dispose() {
      pickQuads?.quads.dispose();
      pickQuads?.atlas.dispose();
      for (const id of [...labels.keys()]) removeLabel(id);
      markers.clear();
      ordered = [];
      for (const group of groups.values()) {
        group.quads.dispose();
        group.atlasTexture.dispose();
      }
      groups.clear();
    },
  };
}
