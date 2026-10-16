import * as THREE from 'three';
import {
  GATE_BAND_THICKNESS_M,
  GATE_FADE_FAR_M,
  GATE_FADE_NEAR_M,
  TRACK_GATE_PICK_RADIUS_PX,
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

/** A gate ribbon following the 3D segment: 4 corners, thickness measured vertically. */
function bandGeometry(a: GateSpec['a'], b: GateSpec['b']): THREE.BufferGeometry {
  const halfT = GATE_BAND_THICKNESS_M / 2;
  const positions = new Float32Array([
    a[0],
    a[1] + halfT,
    a[2],
    a[0],
    a[1] - halfT,
    a[2],
    b[0],
    b[1] + halfT,
    b[2],
    b[0],
    b[1] - halfT,
    b[2],
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  return geometry;
}

interface GateEntry {
  spec: GateSpec;
  band: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  dot: THREE.Sprite;
  dotMaterial: THREE.SpriteMaterial;
  label: TextSprite | null;
  center3: THREE.Vector3;
  endA3: THREE.Vector3;
  endB3: THREE.Vector3;
}

/**
 * The track editor's 3D overlay: one yellow gate ribbon per waypoint (straight from the
 * waypoint's full 3D data), a waypoint dot that shows from far away and fades out as the
 * camera closes in (like an in-game waypoint), optional number labels and the orange
 * selected-point overlay. The committed track's meshes double as the drag ghost — the
 * selected overlay moves during a drag while the original stays where the track data
 * still says it is.
 */
export function createTrackGates(scene: THREE.Scene, getViewport: () => ViewportScale): TrackGates {
  const group = new THREE.Group();
  scene.add(group);

  let viewport = getViewport();

  const entries: GateEntry[] = [];
  let line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;

  // Selected overlay (live editing-buffer position of the selected waypoint).
  let selectedIndex: number | undefined = undefined;
  let selectedSpec: GateSpec | undefined = undefined;
  let selectedBand: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  let selectedDot: THREE.Sprite | null = null;
  const selectedCenter3 = new THREE.Vector3();

  let numbers = false;
  /** Label rebuild keys — labels are canvas sprites, so only remake them when needed. */
  let labelCount = -1;
  let hoveredIndex: number | undefined = undefined;

  let normalDot = makeGateDotTexture(colorYellow500, colorYellow950, viewport);
  let hoverDot = makeGateDotTexture(colorYellow300, colorYellow950, viewport);
  let selectedDotTex = makeGateDotTexture(colorAmber500, colorWhite, viewport);

  function disposeEntryVisuals(entry: GateEntry): void {
    entry.band.geometry.dispose();
    entry.band.material.dispose();
    entry.dotMaterial.dispose();
    if (entry.label) {
      group.remove(entry.label.sprite);
      const material = entry.label.sprite.material;
      material.map?.dispose();
      material.dispose();
    }
  }

  function makeEntry(spec: GateSpec): GateEntry {
    const bandMaterial = new THREE.MeshBasicMaterial({
      color: makeColor(colorYellow500),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const band = new THREE.Mesh(bandGeometry(spec.a, spec.b), bandMaterial);
    band.renderOrder = 0;
    const dotMaterial = new THREE.SpriteMaterial({
      map: normalDot.texture,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    const dot = new THREE.Sprite(dotMaterial);
    dot.scale.setScalar(gateDotScale(normalDot, viewport));
    dot.visible = false;
    dot.renderOrder = 1;
    group.add(band, dot);
    return {
      spec,
      band,
      dot,
      dotMaterial,
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
    entry.label.sprite.renderOrder = 2;
    group.add(entry.label.sprite);
  }

  function disposeSelectedOverlay(): void {
    if (selectedBand) {
      group.remove(selectedBand);
      selectedBand.geometry.dispose();
      selectedBand.material.dispose();
      selectedBand = null;
    }
    if (selectedDot) {
      group.remove(selectedDot);
      selectedDot.material.dispose();
      selectedDot = null;
    }
  }

  function makeSelectedOverlay(): void {
    disposeSelectedOverlay();
    if (!selectedSpec) return;
    const bandMaterial = new THREE.MeshBasicMaterial({
      color: makeColor(colorOrange500),
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    selectedBand = new THREE.Mesh(bandGeometry(selectedSpec.a, selectedSpec.b), bandMaterial);
    selectedBand.renderOrder = 0;
    const dotMaterial = new THREE.SpriteMaterial({
      map: selectedDotTex.texture,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    selectedDot = new THREE.Sprite(dotMaterial);
    selectedDot.scale.setScalar(gateDotScale(selectedDotTex, viewport));
    selectedDot.renderOrder = 1;
    group.add(selectedBand, selectedDot);
    selectedCenter3.set(...selectedSpec.center);
    selectedDot.position.copy(selectedCenter3);
  }

  function applyBandColor(entry: GateEntry): void {
    const color =
      entry.spec.index === selectedIndex
        ? colorYellow100
        : entry.spec.index === hoveredIndex
          ? colorYellow300
          : colorYellow500;
    entry.band.material.color.copy(makeColor(color));
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
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(new Float32Array(linePoints.flat()), 3),
        );
        const material = new THREE.LineBasicMaterial({
          color: makeColor(colorWhite),
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        });
        line = new THREE.Line(geometry, material);
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
      if (selectedSpec && selectedBand) {
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
      if (!selectedSpec || !selectedBand || !selectedDot) return;
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
      selectedBand.geometry.dispose();
      selectedBand.geometry = bandGeometry(selectedSpec.a, selectedSpec.b);
      selectedDot.position.copy(selectedCenter3);
    },

    update(camera) {
      // Distance fade: the dot is the far waypoint marker, the gate ribbon takes over up close.
      const nearSpan = GATE_FADE_FAR_M - GATE_FADE_NEAR_M;
      for (const entry of entries) {
        const d = camera.position.distanceTo(entry.center3);
        const t = THREE.MathUtils.clamp((d - GATE_FADE_NEAR_M) / nearSpan, 0, 1);
        entry.band.material.opacity = 1 - t;
        entry.band.visible = t < 0.999;
        entry.dotMaterial.opacity = t;
        entry.dot.visible = t > 0.001;
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
      viewport = next;
      const dprChanged = next.dpr !== viewport.dpr;
      if (dprChanged) {
        normalDot.texture.dispose();
        hoverDot.texture.dispose();
        selectedDotTex.texture.dispose();
        normalDot = makeGateDotTexture(colorYellow500, colorYellow950, viewport);
        hoverDot = makeGateDotTexture(colorYellow300, colorYellow950, viewport);
        selectedDotTex = makeGateDotTexture(colorAmber500, colorWhite, viewport);
        for (const entry of entries) entry.dotMaterial.map = normalDot.texture;
        if (selectedDot) selectedDot.material.map = selectedDotTex.texture;
        labelCount = -1;
        refreshLabels();
        for (const entry of entries) {
          if (entry.label) entry.label.sprite.visible = numbers;
        }
      }
      for (const entry of entries) entry.dot.scale.setScalar(gateDotScale(normalDot, viewport));
      if (selectedDot) selectedDot.scale.setScalar(gateDotScale(selectedDotTex, viewport));
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
      hoverDot.texture.dispose();
      selectedDotTex.texture.dispose();
      scene.remove(group);
    },
  };
}
