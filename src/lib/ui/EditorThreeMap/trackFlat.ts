import * as THREE from 'three';
import {
  adjustOpacity,
  colorAmber500,
  colorGray950,
  colorOrange500,
  colorRed600,
  colorSky400,
  colorSky600,
  colorSky950,
  colorTextDark,
  colorWhite,
  colorYellow100,
  colorYellow300,
  colorYellow500,
  fontSans,
} from '#lib/tw-var.ts';
import type { Vector2 } from '#lib/types/index.ts';
import type { PoiDotStyle } from '../ThreeMap/constants.ts';
import { gamePlaneToWorldXZ } from '../ThreeMap/coords.ts';
import type { TilesMeta } from '../ThreeMap/three-map-types.ts';
import {
  DOT_ATLAS_CELLS,
  dotCanvasSidePx,
  makeColor,
  makeDotAtlasTexture,
  makeTextSprite,
  PoiState,
  snapLabelToPixelGrid,
  type TextSprite,
  type ViewportScale,
} from '../ThreeMap/poi.ts';
import { rgba, type Rgba } from '../ThreeMap/polygonLayer.ts';
import { createScreenLines, type ScreenLines } from '../ThreeMap/screenLines.ts';
import { createScreenQuads, type ScreenQuads } from '../ThreeMap/screenQuads.ts';

/** A track point as the flat (2D) editor draws it: game-plane position, heading and gate width. */
export interface TrackPoint {
  /** Game-plane position (UE cm, x right / y down). */
  coord: Vector2;
  /** Heading in radians (UE yaw). */
  yaw: number;
  /** Gate width factor: the gate spans `scaleY * 100` cm. */
  scaleY: number;
}

export interface SelectedTrackPoint extends TrackPoint {
  index: number;
}

export interface TrackFlat {
  /** Replaces everything drawn: the committed points, the selected point's live overlay (when its
   * index is in range), the gate/dot mode and the number labels. */
  setTrack: (
    points: TrackPoint[],
    selected: SelectedTrackPoint | undefined,
    gateMode: boolean,
    numbers: boolean,
  ) => void;
  /** The point (or, in gate mode, gate) under a canvas CSS-px position, if any. */
  pick: (cssX: number, cssY: number) => number | undefined;
  /** Whether the position is on the selected overlay - the thing a drag grabs. */
  grabsSelected: (cssX: number, cssY: number) => boolean;
  /** One hovered feature at a time; `undefined` clears it. */
  setHovered: (index: number | undefined) => void;
  /** Starts a drag of the selected overlay from a world XZ pointer position. */
  beginDrag: (worldX: number, worldZ: number) => void;
  /** Moves the overlay with the pointer (world XZ) and returns its new centre, world XZ. */
  dragTo: (worldX: number, worldZ: number) => [x: number, z: number];
  /** World-XZ bounds of what the current mode draws (the dots, or the gate ends), if any. */
  bounds: () => { minX: number; maxX: number; minZ: number; maxZ: number } | undefined;
  /** Per frame: aligns the number labels to the pixel grid (`buffer` = drawing buffer, device px). */
  update: (buffer: THREE.Vector2) => void;
  /** Redraws the textures at a new DPR. */
  refit: () => void;
  dispose: () => void;
}

/** OL's track styles: dot radius 6, arrow icon 20x20 anchored at [0.5, 0.8], gate stroke 4. */
const DOT_DIAMETER_CSS = 12;
const ARROW_SIDE_CSS = 20;
const ARROW_PIVOT = { x: 0.5, yFromTop: 0.8 };
const GATE_WIDTH_CSS = 4;
const LINE_WIDTH_CSS = 2;
const NUMBER_SIZE_CSS = 12;
const NUMBER_LIFT_CSS = 22;
/** OL hit-tested the exact pixel; a hair of slack makes the 4px gate strokes grabbable. */
const DOT_HIT_RADIUS_CSS = DOT_DIAMETER_CSS / 2 + 1;
const GATE_HIT_RADIUS_CSS = GATE_WIDTH_CSS;
const SELECTED_OPACITY = 0.5;

const LINE_ORDER = 1;
const ARROW_ORDER = 2;
const DOT_ORDER = 3;
const SELECTED_ARROW_ORDER = 4;
const SELECTED_DOT_ORDER = 5;
const GATE_ORDER = 6;
const SELECTED_GATE_ORDER = 7;
const LABEL_ORDER = 8;

const normalPalette: PoiDotStyle = {
  fill: colorSky600,
  stroke: colorSky950,
  diameterPx: DOT_DIAMETER_CSS,
  strokeWidth: 1,
  hover: { fill: colorSky400 },
};
const selectedPalette: PoiDotStyle = {
  fill: colorAmber500,
  stroke: colorWhite,
  diameterPx: DOT_DIAMETER_CSS,
  strokeWidth: 1,
};

/** The red arrow icon, `ARROW_SIDE_CSS` square, drawn at native device size. */
function makeArrowAtlas(viewport: ViewportScale): { texture: THREE.CanvasTexture; side: number } {
  const side = Math.ceil(ARROW_SIDE_CSS * viewport.dpr);
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for arrow');
  const k = side / ARROW_SIDE_CSS;
  const path = new Path2D('M10 2 L18 10 L14 10 L14 18 L6 18 L6 10 L2 10 Z');
  ctx.scale(k, k);
  ctx.fillStyle = makeColor(colorRed600).getStyle();
  ctx.fill(path);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = viewport.displayReferred ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  // The arrow is rotated, so its texels never line up with pixels: filter rather than snap.
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return { texture, side };
}

export interface Gate {
  a: [x: number, z: number];
  b: [x: number, z: number];
}

/**
 * A point's gate as two world-XZ ends: `scaleY * 100` cm wide, perpendicular to the heading. OL drew
 * it in its y-up pixel space at `-(yaw + 90deg)`; the game plane's y points down, so the y offset
 * flips.
 */
export function gateEnds(point: TrackPoint, meta: TilesMeta): Gate {
  const halfWidthCm = (point.scaleY * 100) / 2;
  const perp = -(point.yaw + Math.PI / 2);
  const dx = Math.cos(perp) * halfWidthCm;
  const dy = -Math.sin(perp) * halfWidthCm;
  return {
    a: gamePlaneToWorldXZ(point.coord.x + dx, point.coord.y + dy, meta),
    b: gamePlaneToWorldXZ(point.coord.x - dx, point.coord.y - dy, meta),
  };
}

/**
 * The flat track overlay of the 2D editor, drawn into an orthographic map scene: OL's track layers
 * as instanced screen-space dots/arrows (`screenQuads`), constant-pixel lines (`screenLines`) and
 * canvas number labels. Everything sits on the ground plane (y = 0) in world meters.
 *
 * It owns drawing and hit-testing only; the pointer protocol (click, hover, drag-commit) lives in
 * EditorThreeMap.svelte.
 */
export function createTrackFlat(options: {
  scene: THREE.Scene;
  meta: TilesMeta;
  camera: THREE.Camera;
  /** The canvas size in CSS px. */
  size: () => { width: number; height: number };
  getViewport: () => ViewportScale;
}): TrackFlat {
  const { scene, meta, camera } = options;
  let viewport = options.getViewport();
  const group = new THREE.Group();
  scene.add(group);

  const dotQuads = (palette: PoiDotStyle, renderOrder: number) => {
    const quads = createScreenQuads({
      atlas: makeDotAtlasTexture(palette, viewport),
      cells: DOT_ATLAS_CELLS,
      sidePx: dotCanvasSidePx(palette, viewport),
      renderOrder,
    });
    group.add(quads.mesh);
    return quads;
  };
  const arrowQuads = (renderOrder: number) => {
    const { texture, side } = makeArrowAtlas(viewport);
    const quads = createScreenQuads({
      atlas: texture,
      cells: 1,
      sidePx: side,
      renderOrder,
      rotatable: true,
      pivot: ARROW_PIVOT,
    });
    group.add(quads.mesh);
    return quads;
  };
  const points = dotQuads(normalPalette, DOT_ORDER);
  const arrows = arrowQuads(ARROW_ORDER);
  const selectedDot = dotQuads(selectedPalette, SELECTED_DOT_ORDER);
  const selectedArrow = arrowQuads(SELECTED_ARROW_ORDER);

  const lineLines = (widthCss: number, cap: 'round' | 'butt', renderOrder: number) => {
    const lines = createScreenLines({ renderOrder, widthCss, dpr: viewport.dpr, cap });
    group.add(lines.mesh);
    return lines;
  };
  // ponytail: butt ends, not OL's round joins - overlapping round caps would double the 25% alpha at
  // every joint. A 2px line leaves a sub-pixel notch on sharp turns; give the polyline a join pass
  // in screenLines if it is ever visible.
  const trackLine: ScreenLines = lineLines(LINE_WIDTH_CSS, 'butt', LINE_ORDER);
  const gateLines: ScreenLines = lineLines(GATE_WIDTH_CSS, 'butt', GATE_ORDER);
  const selectedGateLines: ScreenLines = lineLines(GATE_WIDTH_CSS, 'butt', SELECTED_GATE_ORDER);

  const displayReferred = (): boolean => viewport.displayReferred;
  const lineColor = (): Rgba => rgba(colorWhite, 0.25, displayReferred());

  let state: {
    points: TrackPoint[];
    selected: SelectedTrackPoint | undefined;
    gateMode: boolean;
    numbers: boolean;
  } = { points: [], selected: undefined, gateMode: false, numbers: false };
  let hovered: number | undefined;
  let world: [x: number, z: number][] = [];
  let gates: Gate[] = [];
  let selectedCenter: [x: number, z: number] | undefined;
  let selectedGate: Gate | undefined;
  let grabOffset: [x: number, z: number] = [0, 0];

  const labels: TextSprite[] = [];
  const makeLabel = (index: number): TextSprite => {
    const label = makeTextSprite(
      String(index + 1),
      {
        weight: 600,
        sizeCss: NUMBER_SIZE_CSS,
        family: fontSans,
        fillStyle: colorTextDark,
        strokeStyle: adjustOpacity(colorGray950, 0.4),
        strokeWidthCss: 3,
        liftCss: NUMBER_LIFT_CSS,
      },
      viewport,
    );
    label.sprite.renderOrder = LABEL_ORDER;
    group.add(label.sprite);
    return label;
  };
  const disposeLabel = (label: TextSprite): void => {
    group.remove(label.sprite);
    label.sprite.material.map?.dispose();
    label.sprite.material.dispose();
  };

  const writeDots = (): void => {
    const { selected } = state;
    const n = state.points.length;
    for (const quads of [points, arrows]) quads.ensureCapacity(n);
    for (let i = 0; i < n; i++) {
      const opacity = selected?.index === i ? SELECTED_OPACITY : 1;
      for (const quads of [points, arrows]) {
        quads.anchors[i * 3] = world[i][0];
        quads.anchors[i * 3 + 1] = 0;
        quads.anchors[i * 3 + 2] = world[i][1];
        quads.opacities[i] = opacity;
        quads.states[i] = i === hovered ? PoiState.Hover : PoiState.Normal;
      }
      arrows.rotations[i] = state.points[i].yaw + Math.PI / 2;
    }
    points.commit(n);
    arrows.commit(n);
    points.mesh.visible = arrows.mesh.visible = !state.gateMode;
  };

  const writeSelectedDot = (): void => {
    const count = selectedCenter && !state.gateMode ? 1 : 0;
    if (state.selected) selectedArrow.rotations[0] = state.selected.yaw + Math.PI / 2;
    for (const quads of [selectedDot, selectedArrow]) {
      quads.mesh.visible = count === 1;
      if (selectedCenter) {
        quads.anchors[0] = selectedCenter[0];
        quads.anchors[1] = 0;
        quads.anchors[2] = selectedCenter[1];
        quads.opacities[0] = 1;
        quads.states[0] = PoiState.Normal;
      }
      quads.commit(count);
    }
  };

  const writeLine = (): void => {
    const n = world.length - 1;
    if (n < 1) {
      trackLine.setSegments(
        new Float32Array(0),
        new Float32Array(0),
        new Float32Array(0),
        new Float32Array(0),
      );
      return;
    }
    const starts = new Float32Array(n * 3);
    const ends = new Float32Array(n * 3);
    const colors = new Float32Array(n * 4);
    const color = lineColor();
    for (let i = 0; i < n; i++) {
      starts.set([world[i][0], 0, world[i][1]], i * 3);
      ends.set([world[i + 1][0], 0, world[i + 1][1]], i * 3);
      colors.set(color, i * 4);
    }
    trackLine.setSegments(starts, ends, colors, new Float32Array(n));
  };

  const gateColor = (index: number): Rgba => {
    const color =
      state.selected?.index === index
        ? colorYellow100
        : index === hovered
          ? colorYellow300
          : colorYellow500;
    return rgba(color, 1, displayReferred());
  };

  const writeGates = (): void => {
    const n = state.gateMode ? gates.length : 0;
    const starts = new Float32Array(n * 3);
    const ends = new Float32Array(n * 3);
    const colors = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      starts.set([gates[i].a[0], 0, gates[i].a[1]], i * 3);
      ends.set([gates[i].b[0], 0, gates[i].b[1]], i * 3);
      colors.set(gateColor(i), i * 4);
    }
    gateLines.setSegments(starts, ends, colors, new Float32Array(n));
  };

  const writeSelectedGate = (): void => {
    const gate = state.gateMode ? selectedGate : undefined;
    if (!gate) {
      selectedGateLines.setSegments(
        new Float32Array(0),
        new Float32Array(0),
        new Float32Array(0),
        new Float32Array(0),
      );
      return;
    }
    selectedGateLines.setSegments(
      new Float32Array([gate.a[0], 0, gate.a[1]]),
      new Float32Array([gate.b[0], 0, gate.b[1]]),
      new Float32Array(rgba(colorOrange500, 1, displayReferred())),
      new Float32Array(1),
    );
  };

  const writeLabels = (): void => {
    const n = state.points.length;
    for (const label of labels.splice(n)) disposeLabel(label);
    while (labels.length < n) labels.push(makeLabel(labels.length));
    for (let i = 0; i < n; i++) {
      labels[i].sprite.position.set(world[i][0], 0, world[i][1]);
      labels[i].sprite.visible = state.numbers;
    }
  };

  const _v = new THREE.Vector3();
  const toCss = (x: number, z: number): [x: number, y: number] => {
    const { width, height } = options.size();
    _v.set(x, 0, z).project(camera);
    return [((_v.x + 1) / 2) * width, ((1 - _v.y) / 2) * height];
  };

  const distToSegment = (
    px: number,
    py: number,
    [ax, ay]: [number, number],
    [bx, by]: [number, number],
  ): number => {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.min(Math.max(((px - ax) * dx + (py - ay) * dy) / len2, 0), 1);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  const dotDistance = ([x, z]: [number, number], cssX: number, cssY: number): number => {
    const [px, py] = toCss(x, z);
    return Math.hypot(px - cssX, py - cssY);
  };

  const gateDistance = (gate: Gate, cssX: number, cssY: number): number =>
    distToSegment(cssX, cssY, toCss(gate.a[0], gate.a[1]), toCss(gate.b[0], gate.b[1]));

  return {
    setTrack(nextPoints, selected, gateMode, numbers) {
      // A stale selection (the editor removed points) draws no overlay rather than a ghost one.
      const live = selected && selected.index < nextPoints.length ? selected : undefined;
      state = { points: nextPoints, selected: live, gateMode, numbers };
      if (hovered !== undefined && hovered >= nextPoints.length) hovered = undefined;
      world = nextPoints.map((p) => gamePlaneToWorldXZ(p.coord.x, p.coord.y, meta));
      gates = nextPoints.map((p) => gateEnds(p, meta));
      selectedCenter = live && gamePlaneToWorldXZ(live.coord.x, live.coord.y, meta);
      selectedGate = live && gateEnds(live, meta);
      writeDots();
      writeSelectedDot();
      writeLine();
      writeGates();
      writeSelectedGate();
      writeLabels();
    },

    pick(cssX, cssY) {
      let best: number | undefined;
      let bestDistance = Infinity;
      const limit = state.gateMode ? GATE_HIT_RADIUS_CSS : DOT_HIT_RADIUS_CSS;
      for (let i = 0; i < world.length; i++) {
        const distance = state.gateMode
          ? gateDistance(gates[i], cssX, cssY)
          : dotDistance(world[i], cssX, cssY);
        if (distance <= limit && distance <= bestDistance) {
          best = i;
          bestDistance = distance;
        }
      }
      return best;
    },

    grabsSelected(cssX, cssY) {
      if (state.gateMode) {
        return (
          selectedGate !== undefined &&
          gateDistance(selectedGate, cssX, cssY) <= GATE_HIT_RADIUS_CSS
        );
      }
      return (
        selectedCenter !== undefined &&
        dotDistance(selectedCenter, cssX, cssY) <= DOT_HIT_RADIUS_CSS
      );
    },

    setHovered(index) {
      if (hovered === index) return;
      const previous = hovered;
      hovered = index;
      for (const i of [previous, index]) {
        if (i === undefined || i >= world.length) continue;
        points.states[i] = i === hovered ? PoiState.Hover : PoiState.Normal;
        arrows.states[i] = points.states[i];
      }
      points.commitState();
      arrows.commitState();
      writeGates();
    },

    beginDrag(worldX, worldZ) {
      if (!selectedCenter) return;
      grabOffset = [worldX - selectedCenter[0], worldZ - selectedCenter[1]];
    },

    dragTo(worldX, worldZ) {
      const centre: [x: number, z: number] = [worldX - grabOffset[0], worldZ - grabOffset[1]];
      selectedCenter = centre;
      if (state.selected) {
        const gate = gateEnds(state.selected, meta);
        const before = gamePlaneToWorldXZ(state.selected.coord.x, state.selected.coord.y, meta);
        // The gate keeps its shape: shift the committed gate's ends by the move.
        const moveX = centre[0] - before[0];
        const moveZ = centre[1] - before[1];
        selectedGate = {
          a: [gate.a[0] + moveX, gate.a[1] + moveZ],
          b: [gate.b[0] + moveX, gate.b[1] + moveZ],
        };
      }
      writeSelectedDot();
      writeSelectedGate();
      return centre;
    },

    bounds() {
      if (world.length === 0) return undefined;
      const pts = state.gateMode ? gates.flatMap((g) => [g.a, g.b]) : world;
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const [x, z] of pts) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
      return { minX, maxX, minZ, maxZ };
    },

    update(buffer) {
      if (!state.numbers) return;
      camera.updateMatrixWorld();
      for (const label of labels) snapLabelToPixelGrid(label, camera, buffer);
    },

    refit() {
      const next = options.getViewport();
      if (next.dpr === viewport.dpr) return;
      viewport = next;
      points.setAtlas(
        makeDotAtlasTexture(normalPalette, viewport),
        dotCanvasSidePx(normalPalette, viewport),
      );
      selectedDot.setAtlas(
        makeDotAtlasTexture(selectedPalette, viewport),
        dotCanvasSidePx(selectedPalette, viewport),
      );
      for (const quads of [arrows, selectedArrow]) {
        const { texture, side } = makeArrowAtlas(viewport);
        quads.setAtlas(texture, side);
      }
      for (const lines of [trackLine, gateLines, selectedGateLines]) lines.setDpr(viewport.dpr);
      for (const label of labels.splice(0)) disposeLabel(label);
      writeLabels();
    },

    dispose() {
      for (const label of labels.splice(0)) disposeLabel(label);
      for (const quads of [points, arrows, selectedDot, selectedArrow] as ScreenQuads[]) {
        quads.dispose();
      }
      for (const lines of [trackLine, gateLines, selectedGateLines]) lines.dispose();
      scene.remove(group);
    },
  };
}
