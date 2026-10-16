import * as THREE from 'three';
import {
  GATE_FACE_OPACITY,
  GATE_FADE_FAR_M,
  GATE_FADE_NEAR_M,
  GATE_XRAY_EDGE_OPACITY,
  GATE_XRAY_FACE_OPACITY,
  TRACK_GATE_PICK_RADIUS_PX,
  TRACK_LINE_OPACITY,
  TRACK_LINE_WIDTH_M,
  TRACK_LINE_XRAY_OPACITY,
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
  /** Box center in world meters. */
  center: [x: number, y: number, z: number];
  /** Width-axis (local Y × scale3D.y) endpoints in world meters — also the pick line. */
  a: [x: number, y: number, z: number];
  b: [x: number, y: number, z: number];
  /** Half-extent vectors (world meters) along the rotation's local X (depth,
   * scale3D.x) and local Z (height, scale3D.z). */
  ex: [x: number, y: number, z: number];
  ez: [x: number, y: number, z: number];
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

/** A camera-facing quad with the dot texture. Sprites (both SpriteMaterial and the
 * SpriteNodeMaterial pipeline) misbehaved here — one flavor never showed, the other
 * never faded — while MeshBasicMaterial opacity animation is proven in this renderer
 * (the gates run on it), so the dots ride the same class. The quad is billboarded to
 * the camera and scaled per frame, so it keeps a constant screen size at any distance. */
function makeDotMesh(dot: DotTexture, dotGeometry: THREE.BufferGeometry, renderOrder: number) {
  const material = new THREE.MeshBasicMaterial({
    map: dot.texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(dotGeometry, material);
  mesh.visible = false;
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  return { mesh, material };
}

/** The gate's full 3D box: the in-game gate object is a 1 m cube scaled by the
 * waypoint's scale3D (scale(1,1,1) IS a cube), so the overlay box spans
 * scale3D.y along the rotation's local Y (width, the a/b pick line), scale3D.x
 * along local X (depth) and scale3D.z along local Z (height). The ex/ez spec
 * fields are the world-space half-extent vectors for those two axes; the ey
 * half-extent is (a − center). */
function boxCorners(spec: GateSpec): THREE.Vector3[] {
  const c = new THREE.Vector3(...spec.center);
  const ex = new THREE.Vector3(...spec.ex);
  const ey = new THREE.Vector3(...spec.a).sub(c);
  const ez = new THREE.Vector3(...spec.ez);
  const corners: THREE.Vector3[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corners.push(
          c.clone().addScaledVector(ex, sx).addScaledVector(ey, sy).addScaledVector(ez, sz),
        );
      }
    }
  }
  return corners;
}

/** Corner index for the (sx, sy, sz) signs in [-1, 1]. */
function cornerIndex(sx: number, sy: number, sz: number): number {
  return (sx > 0 ? 4 : 0) + (sy > 0 ? 2 : 0) + (sz > 0 ? 1 : 0);
}

/** The 6 box faces as one indexed geometry (4 verts + 2 triangles per face). */
function boxFaceGeometry(spec: GateSpec): THREE.BufferGeometry {
  const corners = boxCorners(spec);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(24 * 3);
  const indices: number[] = [];
  /** The 4 corner-sign triples of one face, in winding order (DoubleSide material). */
  const faces: [number, number, number][][] = [];
  for (const sx of [-1, 1]) {
    faces.push([
      [sx, -1, -1],
      [sx, 1, -1],
      [sx, 1, 1],
      [sx, -1, 1],
    ]);
  }
  for (const sy of [-1, 1]) {
    faces.push([
      [-1, sy, -1],
      [1, sy, -1],
      [1, sy, 1],
      [-1, sy, 1],
    ]);
  }
  for (const sz of [-1, 1]) {
    faces.push([
      [-1, -1, sz],
      [1, -1, sz],
      [1, 1, sz],
      [-1, 1, sz],
    ]);
  }
  faces.forEach((quad, faceIndex) => {
    quad.forEach((signs, corner) => {
      const v = corners[cornerIndex(...signs)];
      const base = (faceIndex * 4 + corner) * 3;
      positions[base] = v.x;
      positions[base + 1] = v.y;
      positions[base + 2] = v.z;
    });
    const v0 = faceIndex * 4;
    indices.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
  });
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

/** The 12 box edges as line segments (the opaque frame). */
function boxEdgeGeometry(spec: GateSpec): THREE.BufferGeometry {
  const corners = boxCorners(spec);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(24 * 3);
  const edges: [number, number][] = [];
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      edges.push([cornerIndex(-1, sy, sz), cornerIndex(1, sy, sz)]);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      edges.push([cornerIndex(sx, -1, sz), cornerIndex(sx, 1, sz)]);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      edges.push([cornerIndex(sx, sy, -1), cornerIndex(sx, sy, 1)]);
    }
  }
  edges.forEach(([from, to], edgeIndex) => {
    for (const [slot, corner] of [
      [0, from],
      [1, to],
    ] as const) {
      const v = corners[corner];
      const base = (edgeIndex * 2 + slot) * 3;
      positions[base] = v.x;
      positions[base + 1] = v.y;
      positions[base + 2] = v.z;
    }
  });
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

interface GateVisuals {
  /** Semi-transparent box (all 6 faces), hidden where terrain/props occlude it. */
  face: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** X-ray twin of the face: shares the geometry, draws ONLY the occluded fragments
   * (depthFunc GreaterDepth) at a reduced opacity — the game's see-through style. */
  faceXray: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** Opaque frame: the box's 12 edges as line segments (depth-tested). */
  edges: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  /** X-ray twin of the frame, for the occluded fragments. */
  edgesXray: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  faceMat: THREE.MeshBasicMaterial;
  edgeMat: THREE.LineBasicMaterial;
  faceXrayMat: THREE.MeshBasicMaterial;
  edgeXrayMat: THREE.LineBasicMaterial;
}

function buildGateVisuals(spec: GateSpec, color: string): GateVisuals {
  const faceMat = new THREE.MeshBasicMaterial({
    color: makeColor(color),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: makeColor(color),
    transparent: true,
    opacity: 0,
  });
  // X-ray materials only draw fragments that FAIL the depth test against opaque
  // geometry (terrain, props) — the parts of the gate behind the landscape — at a
  // reduced opacity, like the game renders players through walls.
  const faceXrayMat = new THREE.MeshBasicMaterial({
    color: makeColor(color),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    depthFunc: THREE.GreaterDepth,
  });
  const edgeXrayMat = new THREE.LineBasicMaterial({
    color: makeColor(color),
    transparent: true,
    opacity: 0,
    depthFunc: THREE.GreaterDepth,
  });
  const face = new THREE.Mesh(boxFaceGeometry(spec), faceMat);
  const edges = new THREE.LineSegments(boxEdgeGeometry(spec), edgeMat);
  // The x-ray twins share the geometries — one buffer, two draw passes.
  const faceXray = new THREE.Mesh(face.geometry, faceXrayMat);
  const edgesXray = new THREE.LineSegments(edges.geometry, edgeXrayMat);
  face.renderOrder = 1;
  edges.renderOrder = 1;
  faceXray.renderOrder = 1;
  edgesXray.renderOrder = 1;
  face.visible = false;
  edges.visible = false;
  faceXray.visible = false;
  edgesXray.visible = false;
  return { face, faceXray, edges, edgesXray, faceMat, edgeMat, faceXrayMat, edgeXrayMat };
}

function disposeGateVisuals(group: THREE.Group, visuals: GateVisuals): void {
  group.remove(visuals.face, visuals.faceXray, visuals.edges, visuals.edgesXray);
  visuals.face.geometry.dispose();
  visuals.edges.geometry.dispose();
  visuals.faceMat.dispose();
  visuals.edgeMat.dispose();
  visuals.faceXrayMat.dispose();
  visuals.edgeXrayMat.dispose();
}

/** The track polyline as a flat ribbon `TRACK_LINE_WIDTH_M` wide, following each
 * point's data height. Plain lines are always 1px (linewidth is unsupported), so a
 * ribbon is the way to get a thick connector. Joints use a clamped miter: each vertex's
 * offset bisects its two segment normals, scaled so the strip keeps the half-width
 * distance from the centerline (a plain averaged-direction offset pinches corners —
 * the measured width shrinks by cos of the joint angle). The clamp keeps hairpin
 * turns from spiking into long horns; at the clamp the width narrows slightly. */
function ribbonGeometry(points: [x: number, y: number, z: number][]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  if (points.length < 2) return geometry;
  const half = TRACK_LINE_WIDTH_M / 2;
  /** Unit perpendicular of a segment direction, in XZ. */
  const perp = (dx: number, dz: number): [number, number] => {
    const length = Math.hypot(dx, dz) || 1;
    return [-dz / length, dx / length];
  };
  const offsets: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    if (i === 0) {
      const [nx, nz] = perp(next[0] - prev[0], next[2] - prev[2]);
      offsets.push([nx * half, nz * half]);
    } else if (i === points.length - 1) {
      const [nx, nz] = perp(next[0] - prev[0], next[2] - prev[2]);
      offsets.push([nx * half, nz * half]);
    } else {
      const [n1x, n1z] = perp(points[i][0] - prev[0], points[i][2] - prev[2]);
      const [n2x, n2z] = perp(next[0] - points[i][0], next[2] - points[i][2]);
      let mx = n1x + n2x;
      let mz = n1z + n2z;
      const mLength = Math.hypot(mx, mz);
      if (mLength < 1e-6) {
        // Near-180° reversal: the miter is undefined; keep the incoming normal.
        mx = n1x;
        mz = n1z;
        offsets.push([mx * half, mz * half]);
      } else {
        mx /= mLength;
        mz /= mLength;
        // dot(m, n1) = cos of the half joint angle; clamp so hairpins don't spike.
        const cosHalf = Math.max(0.35, Math.min(1, mx * n1x + mz * n1z));
        const scale = half / cosHalf;
        offsets.push([mx * scale, mz * scale]);
      }
    }
  }
  const positions = new Float32Array(points.length * 2 * 3);
  for (let i = 0; i < points.length; i++) {
    const [ox, oz] = offsets[i];
    const base = i * 6;
    positions[base] = points[i][0] + ox;
    positions[base + 1] = points[i][1];
    positions[base + 2] = points[i][2] + oz;
    positions[base + 3] = points[i][0] - ox;
    positions[base + 4] = points[i][1];
    positions[base + 5] = points[i][2] - oz;
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
  dot: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  dotMat: THREE.MeshBasicMaterial;
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
  /** X-ray twin of the connector, sharing its geometry (see setTrack). */
  let lineXrayMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;

  // Selected overlay (live editing-buffer position of the selected waypoint).
  let selectedIndex: number | undefined = undefined;
  let selectedSpec: GateSpec | undefined = undefined;
  let selectedVisuals: GateVisuals | null = null;
  let selectedDot: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  let selectedDotMat: THREE.MeshBasicMaterial | null = null;
  const selectedCenter3 = new THREE.Vector3();

  let numbers = false;
  /** Label rebuild keys — labels are canvas sprites, so only remake them when needed. */
  let labelCount = -1;
  let hoveredIndex: number | undefined = undefined;

  let normalDot = makeGateDotTexture(colorYellow500, colorYellow950, viewport);
  let selectedDotTex = makeGateDotTexture(colorAmber500, colorWhite, viewport);
  /** Shared unit quad for every dot mesh; scaled per frame to keep constant screen size. */
  const dotGeometry = new THREE.PlaneGeometry(1, 1);

  function disposeEntryVisuals(entry: GateEntry): void {
    disposeGateVisuals(group, entry);
    group.remove(entry.dot);
    entry.dotMat.dispose();
    if (entry.label) {
      group.remove(entry.label.sprite);
      const material = entry.label.sprite.material;
      material.map?.dispose();
      material.dispose();
    }
  }

  function makeEntry(spec: GateSpec): GateEntry {
    const visuals = buildGateVisuals(spec, colorYellow500);
    const dot = makeDotMesh(normalDot, dotGeometry, 2);
    group.add(visuals.face, visuals.faceXray, visuals.edges, visuals.edgesXray, dot.mesh);
    return {
      spec,
      ...visuals,
      dot: dot.mesh,
      dotMat: dot.material,
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
      selectedDotMat?.dispose();
      selectedDot = null;
      selectedDotMat = null;
    }
  }

  function makeSelectedOverlay(): void {
    disposeSelectedOverlay();
    if (!selectedSpec) return;
    const visuals = buildGateVisuals(selectedSpec, colorOrange500);
    selectedVisuals = visuals;
    const dot = makeDotMesh(selectedDotTex, dotGeometry, 2);
    selectedDot = dot.mesh;
    selectedDotMat = dot.material;
    group.add(visuals.face, visuals.faceXray, visuals.edges, visuals.edgesXray, selectedDot);
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
      if (lineXrayMesh) {
        group.remove(lineXrayMesh);
        lineXrayMesh.material.dispose();
        lineXrayMesh = null;
      }

      for (const spec of specs) {
        const entry = makeEntry(spec);
        applyBandColor(entry);
        entries.push(entry);
      }

      if (linePoints.length >= 2) {
        // Two passes share the ribbon geometry: the solid pass is depth-tested (hidden
        // behind terrain), the x-ray pass draws ONLY the occluded fragments (GreaterDepth)
        // at a reduced opacity, so the line stays readable behind hills like in game.
        const material = new THREE.MeshBasicMaterial({
          color: makeColor(colorWhite),
          transparent: true,
          opacity: TRACK_LINE_OPACITY,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const xrayMaterial = new THREE.MeshBasicMaterial({
          color: makeColor(colorWhite),
          transparent: true,
          opacity: TRACK_LINE_XRAY_OPACITY,
          depthWrite: false,
          side: THREE.DoubleSide,
          depthFunc: THREE.GreaterDepth,
        });
        const geometry = ribbonGeometry(linePoints);
        line = new THREE.Mesh(geometry, material);
        const lineXray = new THREE.Mesh(geometry, xrayMaterial);
        line.renderOrder = 0;
        lineXray.renderOrder = 0;
        group.add(line, lineXray);
        lineXrayMesh = lineXray;
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
      const visuals = selectedVisuals;
      visuals.face.geometry.dispose();
      visuals.face.geometry = boxFaceGeometry(selectedSpec);
      visuals.edges.geometry.dispose();
      visuals.edges.geometry = boxEdgeGeometry(selectedSpec);
      selectedDot?.position.copy(selectedCenter3);
    },

    update(camera) {
      // Distance fade: the dot is the far waypoint marker, the gate face + opaque edges
      // take over up close. Both ramp smoothly over the same range.
      const nearSpan = GATE_FADE_FAR_M - GATE_FADE_NEAR_M;
      for (const entry of entries) {
        const d = camera.position.distanceTo(entry.center3);
        const t = THREE.MathUtils.clamp((d - GATE_FADE_NEAR_M) / nearSpan, 0, 1);
        const gateVisible = t < 0.999;
        entry.face.visible = gateVisible;
        entry.faceXray.visible = gateVisible;
        entry.edges.visible = gateVisible;
        entry.edgesXray.visible = gateVisible;
        entry.faceMat.opacity = GATE_FACE_OPACITY * (1 - t);
        entry.edgeMat.opacity = 1 - t;
        entry.faceXrayMat.opacity = GATE_XRAY_FACE_OPACITY * (1 - t);
        entry.edgeXrayMat.opacity = GATE_XRAY_EDGE_OPACITY * (1 - t);
        entry.dotMat.opacity = t;
        entry.dot.visible = t > 0.001;
        if (entry.dot.visible) {
          // Constant screen size: world scale = (texture side in device px / pxPerWorld) ×
          // distance; billboarded to the camera so the circle always reads as a dot.
          entry.dot.position.copy(entry.center3);
          entry.dot.quaternion.copy(camera.quaternion);
          entry.dot.scale.setScalar((normalDot.sideDevice / viewport.pxPerWorld) * d);
        }
      }

      // The selected overlay is always fully drawn (it IS the live waypoint); its dot
      // fades out up close like every other dot. buildGateVisuals starts the meshes
      // hidden — the per-frame pass owns their visibility too.
      if (selectedVisuals) {
        selectedVisuals.face.visible = true;
        selectedVisuals.faceXray.visible = true;
        selectedVisuals.edges.visible = true;
        selectedVisuals.edgesXray.visible = true;
        selectedVisuals.faceMat.opacity = GATE_FACE_OPACITY;
        selectedVisuals.edgeMat.opacity = 1;
        selectedVisuals.faceXrayMat.opacity = GATE_XRAY_FACE_OPACITY;
        selectedVisuals.edgeXrayMat.opacity = GATE_XRAY_EDGE_OPACITY;
      }
      if (selectedDot && selectedDotMat) {
        const d = camera.position.distanceTo(selectedCenter3);
        const t = THREE.MathUtils.clamp((d - GATE_FADE_NEAR_M) / nearSpan, 0, 1);
        selectedDotMat.opacity = t;
        selectedDot.visible = t > 0.001;
        if (selectedDot.visible) {
          selectedDot.position.copy(selectedCenter3);
          selectedDot.quaternion.copy(camera.quaternion);
          selectedDot.scale.setScalar((selectedDotTex.sideDevice / viewport.pxPerWorld) * d);
        }
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
          entry.dotMat.map = normalDot.texture;
          entry.dotMat.needsUpdate = true;
        }
        if (selectedDotMat) {
          selectedDotMat.map = selectedDotTex.texture;
          selectedDotMat.needsUpdate = true;
        }
        labelCount = -1;
        refreshLabels();
        for (const entry of entries) {
          if (entry.label) entry.label.sprite.visible = numbers;
        }
      }
      // Dot scale is recomputed per frame from pxPerWorld — nothing static to refit here.
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
      if (lineXrayMesh) {
        group.remove(lineXrayMesh);
        lineXrayMesh.material.dispose();
        lineXrayMesh = null;
      }
      disposeSelectedOverlay();
      normalDot.texture.dispose();
      selectedDotTex.texture.dispose();
      dotGeometry.dispose();
      scene.remove(group);
    },
  };
}
