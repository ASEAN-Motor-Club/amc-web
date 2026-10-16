import * as THREE from 'three';
import { SpriteNodeMaterial } from 'three/webgpu';
import { texture, uniform } from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import {
  GATE_EDGE_THICKNESS_M,
  GATE_FACE_HEIGHT_M,
  GATE_FACE_OPACITY,
  GATE_FADE_FAR_M,
  GATE_FADE_NEAR_M,
  TRACK_GATE_PICK_RADIUS_PX,
  TRACK_LINE_OPACITY,
  TRACK_LINE_WIDTH_M,
} from '../ThreeMap/constants';
import { makeColor, makeTextSprite, type TextSprite, type ViewportScale } from '../ThreeMap/poi';
import {
  adjustOpacity,
  colorAmber500,
  colorGray950,
  colorOrange500,
  colorTextDark,
  colorWhite,
  colorYellow100,
  colorYellow300,
  colorYellow500,
  colorYellow950,
  fontSans,
} from '$lib/tw-var';

/** One waypoint's gate geometry, in world meters (y-up). Fully 3D: the endpoints come
 * from the waypoint's UE quaternion (local-Y width axis scaled by scale3D.y) and its
 * translation z — nothing is inferred from the terrain. */
export interface GateSpec {
  index: number;
  /** Gate center in world meters. */
  center: [x: number, y: number, z: number];
  /** Gate segment endpoints in world meters. */
  a: [x: number, y: number, z: number];
  b: [x: number, y: number, z: number];
}

/** A gate hit by the pointer. */
export interface GatePick {
  index: number;
  /** The gate's world center — the drag reference point. */
  world: THREE.Vector3;
}

export interface TrackGates {
  /** Rebuilds the whole overlay. `selectedSpec` is the live editing-buffer position of
   * the selected waypoint (drawn as the orange overlay); `specs` come from the committed
   * track, so the selected waypoint's original position stays visible as a ghost. */
  setTrack: (
    specs: GateSpec[],
    line: [x: number, y: number, z: number][],
    selectedIndex: number | undefined,
    selectedSpec: GateSpec | undefined,
    numbers: boolean,
  ) => void;
  setHovered: (index: number | undefined) => void;
  /** Marks the drag state: while true the selected waypoint's committed gate stays
   * visible as the ghost behind the moving orange overlay; once the drag commits
   * (dragging = false) the ghost clears — the overlay IS the waypoint then. */
  setDragging: (dragging: boolean) => void;
  /** Screen-space pick: pointer in NDC over the canvas rect → nearest gate, or null. */
  pick: (
    ndcX: number,
    ndcY: number,
    camera: THREE.PerspectiveCamera,
    rectWidth: number,
    rectHeight: number,
  ) => GatePick | null;
  /** Repositions the selected overlay during a drag (world XZ meters; height is kept). */
  dragTo: (x: number, z: number) => void;
  /** Per-frame: applies the distance fade and hangs the number labels above their dots. */
  update: (camera: THREE.PerspectiveCamera) => void;
  /** Re-renders the dot textures and labels after a viewport (DPR) change. */
  refit: () => void;
  dispose: () => void;
}

/** Waypoint dot styling — a yellow dot like the OL delivery dot, gone up close (the gate
 * takes over). Constant screen size, so it reads as a waypoint marker at any distance. */
const GATE_DOT_DIAMETER_PX = 12;
const GATE_DOT_STROKE_CSS_PX = 1;
/** Device-px margin around the outer stroke edge so the AA fringe survives linear filtering. */
const DOT_AA_PAD_PX = 2;
/** Number labels: mirrors the 2D editor's trackPointNumberLayer text style. */
const NUMBER_SIZE_CSS_PX = 12;

interface DotTexture {
  texture: THREE.CanvasTexture;
  sideDevice: number;
}

function makeGateDotTexture(fill: string, stroke: string, viewport: ViewportScale): DotTexture {
  const radiusDevice = (GATE_DOT_DIAMETER_PX / 2) * viewport.dpr;
  const strokeDevice = GATE_DOT_STROKE_CSS_PX * viewport.dpr;
  const side = Math.ceil(2 * (radiusDevice + strokeDevice / 2 + DOT_AA_PAD_PX));
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for gate dot');
  ctx.beginPath();
  ctx.arc(side / 2, side / 2, radiusDevice, 0, Math.PI * 2);
  ctx.fillStyle = makeColor(fill).getStyle();
  ctx.fill();
  ctx.lineWidth = strokeDevice;
  ctx.strokeStyle = makeColor(stroke).getStyle();
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return { texture, sideDevice: side };
}

function gateDotScale(dot: DotTexture, viewport: ViewportScale): number {
  return dot.sideDevice / viewport.pxPerWorld;
}

/** A screen-facing dot sprite driven by the node pipeline (like the POI delivery dots):
 * `SpriteMaterial.opacity` animates unreliably under WebGPURenderer, while a TSL
 * `uniform` wired into `opacityNode` is the proven per-material fade path. */
function makeDotSprite(
  dot: DotTexture,
  viewport: ViewportScale,
  renderOrder: number,
): {
  sprite: THREE.Sprite;
  material: SpriteNodeMaterial;
  opacity: UniformNode<'float', number>;
  scale: UniformNode<'float', number>;
} {
  const material = new SpriteNodeMaterial({
    sizeAttenuation: false,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  material.colorNode = texture(dot.texture);
  const opacity = uniform(0);
  material.opacityNode = opacity;
  const scale = uniform(gateDotScale(dot, viewport));
  material.scaleNode = scale;
  const sprite = new THREE.Sprite(material);
  sprite.visible = false;
  sprite.renderOrder = renderOrder;
  return { sprite, material, opacity, scale };
}

/** One vertical quad between a and b; the four heights are absolute (world meters). */
function quadGeometry(
  a: GateSpec['a'],
  b: GateSpec['b'],
  aLow: number,
  aHigh: number,
  bLow: number,
  bHigh: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([a[0], aLow, a[2], a[0], aHigh, a[2], b[0], bLow, b[2], b[0], bHigh, b[2]]),
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  return geometry;
}

interface GateVisuals {
  /** Semi-transparent face spanning the full gate height. */
  face: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** Opaque strips along the top and bottom edges of the face. */
  edgeTop: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  edgeBottom: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  faceMat: THREE.MeshBasicMaterial;
  edgeMat: THREE.MeshBasicMaterial;
}

function buildGateVisuals(spec: GateSpec, color: string): GateVisuals {
  const halfH = GATE_FACE_HEIGHT_M / 2;
  const edge = GATE_EDGE_THICKNESS_M;
  const faceMat = new THREE.MeshBasicMaterial({
    color: makeColor(color),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const edgeMat = new THREE.MeshBasicMaterial({
    color: makeColor(color),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const face = new THREE.Mesh(
    quadGeometry(
      spec.a,
      spec.b,
      spec.a[1] - halfH,
      spec.a[1] + halfH,
      spec.b[1] - halfH,
      spec.b[1] + halfH,
    ),
    faceMat,
  );
  const edgeTop = new THREE.Mesh(
    quadGeometry(
      spec.a,
      spec.b,
      spec.a[1] + halfH - edge,
      spec.a[1] + halfH,
      spec.b[1] + halfH - edge,
      spec.b[1] + halfH,
    ),
    edgeMat,
  );
  const edgeBottom = new THREE.Mesh(
    quadGeometry(
      spec.a,
      spec.b,
      spec.a[1] - halfH,
      spec.a[1] - halfH + edge,
      spec.b[1] - halfH,
      spec.b[1] - halfH + edge,
    ),
    edgeMat,
  );
  for (const mesh of [face, edgeTop, edgeBottom]) {
    mesh.renderOrder = 1;
    mesh.visible = false;
  }
  return { face, edgeTop, edgeBottom, faceMat, edgeMat };
}

function disposeGateVisuals(group: THREE.Group, visuals: GateVisuals): void {
  group.remove(visuals.face, visuals.edgeTop, visuals.edgeBottom);
  for (const mesh of [visuals.face, visuals.edgeTop, visuals.edgeBottom]) {
    mesh.geometry.dispose();
  }
  visuals.faceMat.dispose();
  visuals.edgeMat.dispose();
}

/** The track polyline as a flat ribbon `TRACK_LINE_WIDTH_M` wide, following each
 * point's data height. Plain lines are always 1px (linewidth is unsupported), so a
 * ribbon is the way to get a thick connector. */
function ribbonGeometry(points: [x: number, y: number, z: number][]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  if (points.length < 2) return geometry;
  const half = TRACK_LINE_WIDTH_M / 2;
  const positions = new Float32Array(points.length * 2 * 3);
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[2] - prev[2];
    const length = Math.hypot(dx, dz) || 1;
    const px = (-dz / length) * half;
    const pz = (dx / length) * half;
    const base = i * 6;
    positions[base] = points[i][0] + px;
    positions[base + 1] = points[i][1];
    positions[base + 2] = points[i][2] + pz;
    positions[base + 3] = points[i][0] - px;
    positions[base + 4] = points[i][1];
    positions[base + 5] = points[i][2] - pz;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const indices: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(indices);
  return geometry;
}

interface GateEntry extends GateVisuals {
  spec: GateSpec;
  dot: THREE.Sprite;
  dotOpacity: UniformNode<'float', number>;
  dotScale: UniformNode<'float', number>;
  label: TextSprite | null;
  center3: THREE.Vector3;
  endA3: THREE.Vector3;
  endB3: THREE.Vector3;
}

/**
 * The track editor's 3D overlay: one yellow gate per waypoint (semi-transparent face,
 * opaque edges, straight from the waypoint's full 3D data), a waypoint dot that shows
 * from far away and fades out as the camera closes in (like an in-game waypoint),
 * optional number labels and the orange selected-point overlay. While the selected
 * waypoint is being dragged, its committed gate stays visible as the ghost; when the
 * drag commits, the ghost clears and the overlay is the waypoint.
 */
export function createTrackGates(scene: THREE.Scene, getViewport: () => ViewportScale): TrackGates {
  const group = new THREE.Group();
  scene.add(group);

  let viewport = getViewport();

  const entries: GateEntry[] = [];
  let line: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;

  // Selected overlay (live editing-buffer position of the selected waypoint).
  let selectedIndex: number | undefined = undefined;
  let selectedSpec: GateSpec | undefined = undefined;
  let selectedVisuals: GateVisuals | null = null;
  let selectedDot: THREE.Sprite | null = null;
  let selectedDotOpacity: UniformNode<'float', number> | null = null;
  let selectedDotScale: UniformNode<'float', number> | null = null;
  const selectedCenter3 = new THREE.Vector3();

  let numbers = false;
  /** Label rebuild keys — labels are canvas sprites, so only remake them when needed. */
  let labelCount = -1;
  let hoveredIndex: number | undefined = undefined;
  /** While a drag is live the committed gate stays as the ghost; after commit it hides. */
  let dragging = false;

  let normalDot = makeGateDotTexture(colorYellow500, colorYellow950, viewport);
  let selectedDotTex = makeGateDotTexture(colorAmber500, colorWhite, viewport);

  function disposeEntryVisuals(entry: GateEntry): void {
    disposeGateVisuals(group, entry);
    entry.dot.material.dispose();
    if (entry.label) {
      group.remove(entry.label.sprite);
      const material = entry.label.sprite.material;
      material.map?.dispose();
      material.dispose();
    }
  }

  function makeEntry(spec: GateSpec): GateEntry {
    const visuals = buildGateVisuals(spec, colorYellow500);
    const dot = makeDotSprite(normalDot, viewport, 2);
    dot.sprite.visible = false;
    group.add(visuals.face, visuals.edgeTop, visuals.edgeBottom, dot.sprite);
    return {
      spec,
      ...visuals,
      dot: dot.sprite,
      dotOpacity: dot.opacity,
      dotScale: dot.scale,
      label: null,
      center3: new THREE.Vector3(...spec.center),
      endA3: new THREE.Vector3(...spec.a),
      endB3: new THREE.Vector3(...spec.b),
    };
  }

  function makeLabel(entry: GateEntry): void {
    entry.label = makeTextSprite(
      String(entry.spec.index + 1),
      {
        weight: 600,
        sizeCss: NUMBER_SIZE_CSS_PX,
        family: fontSans,
        fillStyle: colorTextDark,
        strokeStyle: adjustOpacity(colorGray950, 0.4),
        strokeWidthCss: 3,
      },
      viewport,
    );
    entry.label.sprite.visible = numbers;
    entry.label.sprite.renderOrder = 3;
    group.add(entry.label.sprite);
  }

  function disposeSelectedOverlay(): void {
    if (selectedVisuals) {
      disposeGateVisuals(group, selectedVisuals);
      selectedVisuals = null;
    }
    if (selectedDot) {
      group.remove(selectedDot);
      selectedDot.material.dispose();
      selectedDot = null;
      selectedDotOpacity = null;
      selectedDotScale = null;
    }
  }

  function makeSelectedOverlay(): void {
    disposeSelectedOverlay();
    if (!selectedSpec) return;
    const visuals = buildGateVisuals(selectedSpec, colorOrange500);
    selectedVisuals = visuals;
    const dot = makeDotSprite(selectedDotTex, viewport, 2);
    selectedDot = dot.sprite;
    selectedDotOpacity = dot.opacity;
    selectedDotScale = dot.scale;
    group.add(visuals.face, visuals.edgeTop, visuals.edgeBottom, selectedDot);
    selectedCenter3.set(...selectedSpec.center);
    selectedDot.position.copy(selectedCenter3);
  }

  function applyFaceColor(visuals: GateVisuals, color: string): void {
    visuals.faceMat.color.copy(makeColor(color));
    visuals.edgeMat.color.copy(makeColor(color));
  }

  function applyBandColor(entry: GateEntry): void {
    const color =
      entry.spec.index === selectedIndex
        ? colorYellow100
        : entry.spec.index === hoveredIndex
          ? colorYellow300
          : colorYellow500;
    applyFaceColor(entry, color);
  }

  function refreshLabels(): void {
    if (entries.length === labelCount) return;
    labelCount = entries.length;
    for (const entry of entries) {
      if (!entry.label) makeLabel(entry);
    }
  }

  return {
    setTrack(specs, linePoints, nextSelectedIndex, nextSelectedSpec, nextNumbers) {
      for (const entry of entries) disposeEntryVisuals(entry);
      entries.length = 0;
      if (line) {
        group.remove(line);
        line.geometry.dispose();
        line.material.dispose();
        line = null;
      }

      for (const spec of specs) {
        const entry = makeEntry(spec);
        applyBandColor(entry);
        entries.push(entry);
      }

      if (linePoints.length >= 2) {
        const material = new THREE.MeshBasicMaterial({
          color: makeColor(colorWhite),
          transparent: true,
          opacity: TRACK_LINE_OPACITY,
          depthWrite: false,
          // No depth test: the connector reads on top of the terrain like the 2D line.
          depthTest: false,
          side: THREE.DoubleSide,
        });
        line = new THREE.Mesh(ribbonGeometry(linePoints), material);
        line.renderOrder = 0;
        group.add(line);
      }

      selectedIndex = nextSelectedIndex;
      selectedSpec = nextSelectedSpec;
      makeSelectedOverlay();
      for (const entry of entries) applyBandColor(entry);

      numbers = nextNumbers;
      refreshLabels();
      for (const entry of entries) {
        if (entry.label) entry.label.sprite.visible = numbers;
      }
    },

    setHovered(index) {
      if (index === hoveredIndex) return;
      hoveredIndex = index;
      for (const entry of entries) applyBandColor(entry);
    },

    setDragging(next) {
      dragging = next;
    },

    pick(ndcX, ndcY, camera, rectWidth, rectHeight) {
      const pointerX = (ndcX * 0.5 + 0.5) * rectWidth;
      const pointerY = (1 - (ndcY * 0.5 + 0.5)) * rectHeight;
      const projected = new THREE.Vector3();
      /** The pick radius folds the "close enough" gate into the min-search. */
      const pickRadius = TRACK_GATE_PICK_RADIUS_PX;
      const toScreen = (v: THREE.Vector3): [x: number, y: number] | null => {
        projected.copy(v).project(camera);
        if (projected.z <= -1 || projected.z >= 1) return null;
        return [
          (projected.x * 0.5 + 0.5) * rectWidth,
          (1 - (projected.y * 0.5 + 0.5)) * rectHeight,
        ];
      };
      /** Point-to-segment distance in screen px, or Infinity when off-screen. */
      const segmentDistance = (a: THREE.Vector3, b: THREE.Vector3): number => {
        const pa = toScreen(a);
        const pb = toScreen(b);
        if (!pa || !pb) return Infinity;
        const dx = pb[0] - pa[0];
        const dy = pb[1] - pa[1];
        const lengthSq = dx * dx + dy * dy;
        const t =
          lengthSq === 0
            ? 0
            : Math.min(
                1,
                Math.max(0, ((pointerX - pa[0]) * dx + (pointerY - pa[1]) * dy) / lengthSq),
              );
        return Math.hypot(pointerX - (pa[0] + dx * t), pointerY - (pa[1] + dy * t));
      };

      const candidates: { index: number; distance: number; world: THREE.Vector3 }[] = [];
      const consider = (
        index: number,
        a: THREE.Vector3,
        b: THREE.Vector3,
        center: THREE.Vector3,
      ) => {
        const distance = segmentDistance(a, b);
        if (distance >= pickRadius) return;
        candidates.push({ index, distance, world: center.clone() });
      };
      for (const entry of entries) {
        consider(entry.spec.index, entry.endA3, entry.endB3, entry.center3);
      }
      if (selectedSpec && selectedVisuals) {
        // The live overlay is pickable at its dragged position too.
        consider(
          selectedSpec.index,
          new THREE.Vector3(...selectedSpec.a),
          new THREE.Vector3(...selectedSpec.b),
          selectedCenter3,
        );
      }
      if (candidates.length === 0) return null;
      const best = candidates.reduce((acc, next) => (next.distance < acc.distance ? next : acc));
      return { index: best.index, world: best.world };
    },

    dragTo(x, z) {
      if (!selectedSpec || !selectedVisuals) return;
      // A drag moves the waypoint on the map plane; the data's z height is kept.
      const shiftX = x - selectedSpec.center[0];
      const shiftZ = z - selectedSpec.center[2];
      selectedSpec = {
        ...selectedSpec,
        center: [x, selectedSpec.center[1], z],
        a: [selectedSpec.a[0] + shiftX, selectedSpec.a[1], selectedSpec.a[2] + shiftZ],
        b: [selectedSpec.b[0] + shiftX, selectedSpec.b[1], selectedSpec.b[2] + shiftZ],
      };
      selectedCenter3.set(x, selectedSpec.center[1], z);
      const halfH = GATE_FACE_HEIGHT_M / 2;
      const edge = GATE_EDGE_THICKNESS_M;
      const visuals = selectedVisuals;
      visuals.face.geometry.dispose();
      visuals.face.geometry = quadGeometry(
        selectedSpec.a,
        selectedSpec.b,
        selectedSpec.a[1] - halfH,
        selectedSpec.a[1] + halfH,
        selectedSpec.b[1] - halfH,
        selectedSpec.b[1] + halfH,
      );
      visuals.edgeTop.geometry.dispose();
      visuals.edgeTop.geometry = quadGeometry(
        selectedSpec.a,
        selectedSpec.b,
        selectedSpec.a[1] + halfH - edge,
        selectedSpec.a[1] + halfH,
        selectedSpec.b[1] + halfH - edge,
        selectedSpec.b[1] + halfH,
      );
      visuals.edgeBottom.geometry.dispose();
      visuals.edgeBottom.geometry = quadGeometry(
        selectedSpec.a,
        selectedSpec.b,
        selectedSpec.a[1] - halfH,
        selectedSpec.a[1] - halfH + edge,
        selectedSpec.b[1] - halfH,
        selectedSpec.b[1] - halfH + edge,
      );
      selectedDot?.position.copy(selectedCenter3);
    },

    update(camera) {
      // Distance fade: the dot is the far waypoint marker, the gate face + opaque edges
      // take over up close. Both ramp smoothly over the same range.
      const nearSpan = GATE_FADE_FAR_M - GATE_FADE_NEAR_M;
      for (const entry of entries) {
        const d = camera.position.distanceTo(entry.center3);
        const t = THREE.MathUtils.clamp((d - GATE_FADE_NEAR_M) / nearSpan, 0, 1);
        // While the selected waypoint is dragged its committed gate is the ghost; once
        // the drag commits (overlay == waypoint) the ghost clears.
        const ghost = entry.spec.index === selectedIndex && !!selectedSpec && dragging;
        entry.faceMat.opacity = GATE_FACE_OPACITY * (1 - t);
        entry.edgeMat.opacity = 1 - t;
        const gateVisible = t < 0.999 && !ghost;
        entry.face.visible = gateVisible;
        entry.edgeTop.visible = gateVisible;
        entry.edgeBottom.visible = gateVisible;
        entry.dotOpacity.value = t;
        entry.dot.visible = t > 0.001 && !ghost;
      }

      // The selected overlay is always fully drawn (it IS the live waypoint); its dot
      // fades out up close like every other dot.
      if (selectedVisuals && selectedDotOpacity) {
        selectedVisuals.faceMat.opacity = GATE_FACE_OPACITY;
        selectedVisuals.edgeMat.opacity = 1;
        const d = camera.position.distanceTo(selectedCenter3);
        const t = THREE.MathUtils.clamp((d - GATE_FADE_NEAR_M) / nearSpan, 0, 1);
        selectedDotOpacity.value = t;
        if (selectedDot) selectedDot.visible = t > 0.001;
      }

      // Number labels hang above their dots along the screen-up direction.
      if (numbers) {
        const upView = new THREE.Vector3();
        const upWorld = new THREE.Vector3();
        camera.getWorldDirection(upView);
        upWorld.copy(camera.up).projectOnPlane(upView).normalize();
        const position = new THREE.Vector3();
        for (const entry of entries) {
          if (!entry.label) continue;
          entry.label.sprite.position.copy(upWorld).add(position.copy(entry.center3));
        }
      }
    },

    refit() {
      const next = getViewport();
      if (next.dpr === viewport.dpr && next.pxPerWorld === viewport.pxPerWorld) return;
      const dprChanged = next.dpr !== viewport.dpr;
      viewport = next;
      if (dprChanged) {
        normalDot.texture.dispose();
        selectedDotTex.texture.dispose();
        normalDot = makeGateDotTexture(colorYellow500, colorYellow950, viewport);
        selectedDotTex = makeGateDotTexture(colorAmber500, colorWhite, viewport);
        for (const entry of entries) {
          entry.dot.material.colorNode = texture(normalDot.texture);
        }
        if (selectedDot) selectedDot.material.colorNode = texture(selectedDotTex.texture);
        labelCount = -1;
        refreshLabels();
        for (const entry of entries) {
          if (entry.label) entry.label.sprite.visible = numbers;
        }
      }
      for (const entry of entries) {
        entry.dotScale.value = gateDotScale(normalDot, viewport);
      }
      if (selectedDotScale) selectedDotScale.value = gateDotScale(selectedDotTex, viewport);
    },

    dispose() {
      for (const entry of entries) disposeEntryVisuals(entry);
      entries.length = 0;
      if (line) {
        group.remove(line);
        line.geometry.dispose();
        line.material.dispose();
        line = null;
      }
      disposeSelectedOverlay();
      normalDot.texture.dispose();
      selectedDotTex.texture.dispose();
      scene.remove(group);
    },
  };
}
