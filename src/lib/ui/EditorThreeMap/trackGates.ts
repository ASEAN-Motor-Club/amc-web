import * as THREE from 'three';
import {
  GATE_BAND_THICKNESS_M,
  GATE_FADE_FAR_M,
  GATE_FADE_NEAR_M,
  OVERLAY_GROUND_OFFSET_M,
  TRACK_GATE_PICK_RADIUS_PX,
} from '../ThreeMap/constants';
import type { GroundHeights } from '../ThreeMap/groundHeights';
import {
  makeColor,
  makeTextSprite,
  viewportScale,
  type TextSprite,
  type ViewportScale,
} from '../ThreeMap/poi';
import type { TilesMeta } from '../ThreeMap/three-map-types';
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

/** One waypoint's gate geometry in world meters (x right, z south... north is -z). */
export interface GateSpec {
  index: number;
  /** Gate center in world XZ meters. */
  center: [x: number, z: number];
  /** Gate direction angle in the world XZ plane (radians). */
  angle: number;
  /** Full gate width in meters. */
  widthM: number;
}

/** A gate hit by the pointer. */
export interface GatePick {
  index: number;
  /** The gate's world center (its draped height) — the drag reference point. */
  world: THREE.Vector3;
}

export interface TrackGates {
  /** Rebuilds the whole overlay. `selectedSpec` is the live editing-buffer position of
   * the selected waypoint (drawn as the orange overlay); `specs` come from the committed
   * track, so the selected waypoint's original position stays visible as a ghost. */
  setTrack: (
    specs: GateSpec[],
    line: [x: number, z: number][],
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
  /** Repositions the selected overlay during a drag (world XZ meters). */
  dragTo: (x: number, z: number) => void;
  /** Per-frame: drapes undraped meshes as ground data arrives, applies the
   * distance fade and hangs the number labels above their dots. */
  update: (camera: THREE.PerspectiveCamera) => void;
  /** Re-renders the dot textures and labels after a viewport (DPR) change. */
  refit: () => void;
  dispose: () => void;
}

/** Waypoint dot styling — mirrors the 2D editor's sky-colored point markers in gate mode's
 * yellow palette: a yellow dot like the OL delivery dot, gone up close (gate takes over). */
const GATE_DOT_DIAMETER_PX = 12;
const GATE_DOT_STROKE_CSS_PX = 1;
/** Device-px margin around the outer stroke edge so the AA fringe survives linear filtering. */
const DOT_AA_PAD_PX = 2;
/** Number labels: mirrors the 2D editor's trackPointNumberLayer text style. */
const NUMBER_SIZE_CSS_PX = 12;
/** Height tiles kept for draping: the track bbox sampled from at most this many tiles. */
const MAX_DRAPE_TILES = 9;

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

/** A gate strip: 4 world-space corners following the sampled terrain. */
function bandGeometry(spec: GateSpec, ya: number, yb: number): THREE.BufferGeometry {
  const dirX = Math.cos(spec.angle);
  const dirZ = Math.sin(spec.angle);
  const perpX = -dirZ;
  const perpZ = dirX;
  const halfW = spec.widthM / 2;
  const halfT = GATE_BAND_THICKNESS_M / 2;
  const ax = spec.center[0] + dirX * halfW;
  const az = spec.center[1] + dirZ * halfW;
  const bx = spec.center[0] - dirX * halfW;
  const bz = spec.center[1] - dirZ * halfW;
  const lift = OVERLAY_GROUND_OFFSET_M;
  const positions = new Float32Array([
    ax + perpX * halfT,
    ya + lift,
    az + perpZ * halfT,
    ax - perpX * halfT,
    ya + lift,
    az - perpZ * halfT,
    bx + perpX * halfT,
    yb + lift,
    bz + perpZ * halfT,
    bx - perpX * halfT,
    yb + lift,
    bz - perpZ * halfT,
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
  /** Sampled ground height at the center; null until the tile data arrives. */
  groundY: number | null;
  /** Center in world 3D once draped. */
  center3: THREE.Vector3;
  /** Segment endpoints in world 3D once draped (for picking). */
  endA3: THREE.Vector3;
  endB3: THREE.Vector3;
}

/**
 * The track editor's 3D overlay: one yellow gate strip per waypoint (ground-draped), a
 * waypoint dot that shows from far away and fades out as the camera closes in (like an
 * in-game waypoint), optional number labels and the orange selected-point overlay. The
 * committed track's meshes double as the drag ghost — the selected overlay moves during a
 * drag while the original stays where the track data still says it is.
 */
export function createTrackGates(
  scene: THREE.Scene,
  meta: TilesMeta,
  groundHeights: GroundHeights,
  getViewport: () => ViewportScale,
): TrackGates {
  const group = new THREE.Group();
  scene.add(group);

  let viewport = getViewport();

  const entries: GateEntry[] = [];
  let line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  let linePending = false;
  let sampleZoom = meta.maxZoom;

  // Selected overlay (live editing-buffer position of the selected waypoint).
  let selectedIndex: number | undefined = undefined;
  let selectedSpec: GateSpec | undefined = undefined;
  let selectedGroundY: number | null = null;
  let selectedCenter3 = new THREE.Vector3();
  let selectedBand: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  let selectedDot: THREE.Sprite | null = null;

  let numbers = false;
  /** Label rebuild keys — labels are canvas sprites, so only remake them when needed. */
  let labelCount = -1;
  let hoveredIndex: number | undefined = undefined;

  let normalDot = makeGateDotTexture(colorYellow500, colorYellow950, viewport);
  let hoverDot = makeGateDotTexture(colorYellow300, colorYellow950, viewport);
  let selectedDotTex = makeGateDotTexture(colorAmber500, colorWhite, viewport);

  function gateDotScale(dot: DotTexture): number {
    return dot.sideDevice / viewport.pxPerWorld;
  }

  function groundAt(x: number, z: number): number | null {
    return groundHeights.sample(x, z, sampleZoom);
  }

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
    const band = new THREE.Mesh(new THREE.BufferGeometry(), bandMaterial);
    band.visible = false;
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
    dot.scale.setScalar(gateDotScale(normalDot));
    dot.visible = false;
    dot.renderOrder = 1;
    group.add(band, dot);
    return {
      spec,
      band,
      dot,
      dotMaterial,
      label: null,
      groundY: null,
      center3: new THREE.Vector3(),
      endA3: new THREE.Vector3(),
      endB3: new THREE.Vector3(),
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

  function makeSelectedOverlay(): void {
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
    selectedGroundY = null;
    if (!selectedSpec) return;
    const bandMaterial = new THREE.MeshBasicMaterial({
      color: makeColor(colorOrange500),
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    selectedBand = new THREE.Mesh(new THREE.BufferGeometry(), bandMaterial);
    selectedBand.renderOrder = 0;
    const dotMaterial = new THREE.SpriteMaterial({
      map: selectedDotTex.texture,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    selectedDot = new THREE.Sprite(dotMaterial);
    selectedDot.scale.setScalar(gateDotScale(selectedDotTex));
    selectedDot.renderOrder = 1;
    group.add(selectedBand, selectedDot);
    drapeSelected();
  }

  function drapeEntry(entry: GateEntry): boolean {
    const [cx, cz] = entry.spec.center;
    const y = groundAt(cx, cz);
    if (y === null) return false;
    const dirX = Math.cos(entry.spec.angle);
    const dirZ = Math.sin(entry.spec.angle);
    const halfW = entry.spec.widthM / 2;
    const ya = groundAt(cx + dirX * halfW, cz + dirZ * halfW);
    const yb = groundAt(cx - dirX * halfW, cz - dirZ * halfW);
    if (ya === null || yb === null) return false;
    entry.groundY = y;
    entry.center3.set(cx, y, cz);
    entry.endA3.set(cx + dirX * halfW, ya, cz + dirZ * halfW);
    entry.endB3.set(cx - dirX * halfW, yb, cz - dirZ * halfW);
    entry.band.geometry.dispose();
    entry.band.geometry = bandGeometry(entry.spec, ya, yb);
    entry.band.visible = true;
    return true;
  }

  function drapeSelected(): void {
    if (!selectedSpec || !selectedBand || !selectedDot) return;
    const [cx, cz] = selectedSpec.center;
    const y = groundAt(cx, cz);
    if (y === null) return;
    const dirX = Math.cos(selectedSpec.angle);
    const dirZ = Math.sin(selectedSpec.angle);
    const halfW = selectedSpec.widthM / 2;
    const ya = groundAt(cx + dirX * halfW, cz + dirZ * halfW);
    const yb = groundAt(cx - dirX * halfW, cz - dirZ * halfW);
    if (ya === null || yb === null) return;
    selectedGroundY = y;
    selectedCenter3.set(cx, y, cz);
    selectedBand.geometry.dispose();
    selectedBand.geometry = bandGeometry(selectedSpec, ya, yb);
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
    const count = entries.length;
    if (count === labelCount) return;
    labelCount = count;
    for (const entry of entries) {
      if (!entry.label) makeLabel(entry);
    }
  }

  return {
    setTrack(specs, linePoints, nextSelectedIndex, nextSelectedSpec, nextNumbers) {
      const wasDragging = selectedIndex !== undefined && selectedGroundY !== null;
      const dragX = selectedCenter3.x;
      const dragZ = selectedCenter3.z;

      for (const entry of entries) disposeEntryVisuals(entry);
      entries.length = 0;
      if (line) {
        group.remove(line);
        line.geometry.dispose();
        line.material.dispose();
        line = null;
      }

      // One draping zoom for the whole overlay, bounded so the track spans few tiles.
      let minX = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxZ = -Infinity;
      const consider = (x: number, z: number) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      };
      for (const spec of specs) consider(spec.center[0], spec.center[1]);
      for (const [x, z] of linePoints) consider(x, z);
      if (minX <= maxX) {
        sampleZoom = groundHeights.zoomForBox(minX, minZ, maxX, maxZ, MAX_DRAPE_TILES);
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
          new THREE.BufferAttribute(new Float32Array(linePoints.flatMap(([x, z]) => [x, 0, z])), 3),
        );
        const material = new THREE.LineBasicMaterial({
          color: makeColor(colorWhite),
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        });
        line = new THREE.Line(geometry, material);
        line.visible = false;
        group.add(line);
        linePending = true;
      }

      const selectionChanged =
        nextSelectedIndex !== selectedIndex ||
        nextSelectedSpec?.center[0] !== selectedSpec?.center[0] ||
        nextSelectedSpec?.center[1] !== selectedSpec?.center[1] ||
        nextSelectedSpec?.angle !== selectedSpec?.angle ||
        nextSelectedSpec?.widthM !== selectedSpec?.widthM;
      selectedIndex = nextSelectedIndex;
      selectedSpec = nextSelectedSpec;
      if (selectionChanged || !selectedSpec) {
        makeSelectedOverlay();
        // A drag may still be in progress (setTrack re-fires from unrelated state);
        // restore the in-flight drag position so the overlay does not snap back.
        if (wasDragging && selectedSpec) {
          selectedSpec = { ...selectedSpec, center: [dragX, dragZ] };
          drapeSelected();
        }
      }
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
      const toScreen = (v: THREE.Vector3): [x: number, y: number] | null => {
        projected.copy(v).project(camera);
        if (projected.z <= -1 || projected.z >= 1) return null;
        return [
          (projected.x * 0.5 + 0.5) * rectWidth,
          (1 - (projected.y * 0.5 + 0.5)) * rectHeight,
        ];
      };
      /** Point-to-segment distance in screen px, or Infinity when off-screen. */
      const segmentDistance = (
        a: THREE.Vector3,
        b: THREE.Vector3,
      ): [distance: number, closestX: number, closestY: number] => {
        const pa = toScreen(a);
        const pb = toScreen(b);
        if (!pa || !pb) return [Infinity, 0, 0];
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
        const cx = pa[0] + dx * t;
        const cy = pa[1] + dy * t;
        return [Math.hypot(pointerX - cx, pointerY - cy), cx, cy];
      };

      let bestIndex = -1;
      let bestDistance = Infinity;
      let bestWorld: THREE.Vector3 | null = null;
      const consider = (
        index: number,
        a: THREE.Vector3,
        b: THREE.Vector3,
        center: THREE.Vector3,
      ) => {
        const [distance] = segmentDistance(a, b);
        if (distance >= bestDistance) return;
        bestIndex = index;
        bestDistance = distance;
        bestWorld = center.clone();
      };
      for (const entry of entries) {
        if (entry.groundY === null) continue;
        consider(entry.spec.index, entry.endA3, entry.endB3, entry.center3);
      }
      if (selectedSpec && selectedGroundY !== null && selectedBand) {
        // The live overlay is pickable at its dragged position too.
        const dirX = Math.cos(selectedSpec.angle);
        const dirZ = Math.sin(selectedSpec.angle);
        const halfW = selectedSpec.widthM / 2;
        const a = selectedCenter3.clone().add(new THREE.Vector3(dirX * halfW, 0, dirZ * halfW));
        const b = selectedCenter3.clone().add(new THREE.Vector3(-dirX * halfW, 0, -dirZ * halfW));
        consider(selectedSpec.index, a, b, selectedCenter3);
      }
      if (!bestWorld || bestDistance > TRACK_GATE_PICK_RADIUS_PX) return null;
      return { index: bestIndex, world: bestWorld };
    },

    dragTo(x, z) {
      if (!selectedSpec || !selectedBand || !selectedDot) return;
      selectedSpec = { ...selectedSpec, center: [x, z] };
      drapeSelected();
      if (selectedGroundY === null) return;
      selectedDot.position.copy(selectedCenter3);
    },

    update(camera) {
      // Drape meshes whose ground data has arrived since the last frame.
      for (const entry of entries) {
        if (entry.groundY === null) drapeEntry(entry);
      }
      if (linePending && line) {
        const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        const array = attr.array as Float32Array;
        let complete = true;
        for (let i = 0; i < array.length; i += 3) {
          const y = groundAt(array[i], array[i + 2]);
          if (y === null) {
            complete = false;
            continue;
          }
          array[i + 1] = y;
        }
        if (complete) {
          attr.needsUpdate = true;
          line.visible = true;
          linePending = false;
        }
      }
      if (selectedSpec && selectedGroundY === null) drapeSelected();

      // Distance fade: the dot is the far waypoint marker, the gate band takes over up close.
      const nearSpan = GATE_FADE_FAR_M - GATE_FADE_NEAR_M;
      for (const entry of entries) {
        if (entry.groundY === null) continue;
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
          if (!entry.label || entry.groundY === null) continue;
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
      for (const entry of entries) entry.dot.scale.setScalar(gateDotScale(normalDot));
      if (selectedDot) selectedDot.scale.setScalar(gateDotScale(selectedDotTex));
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
      normalDot.texture.dispose();
      hoverDot.texture.dispose();
      selectedDotTex.texture.dispose();
      scene.remove(group);
    },
  };
}
