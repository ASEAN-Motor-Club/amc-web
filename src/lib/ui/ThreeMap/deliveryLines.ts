import * as THREE from 'three';
import {
  DELIVERY_FLOW_DASH_GAP_PX,
  DELIVERY_FLOW_DASH_LENGTH_PX,
  DELIVERY_FLOW_DASH_SPEED_PX,
  DELIVERY_LINE_MAX_SAMPLES,
  DELIVERY_LINE_MAX_TILES,
  DELIVERY_LINE_MIN_SAMPLES,
  DELIVERY_LINE_OPACITY,
  DELIVERY_LINE_REFIT_LOG2_STEP,
  DELIVERY_LINE_WIDTH_PX,
  OVERLAY_GROUND_OFFSET_M,
} from './constants';
import { gamePlaneToWorldXZ } from './coords';
import { makeColor } from './poi';
import type { GroundHeights } from './groundHeights';
import type { TilesMeta } from './three-map-types';
import type { DeliveryLineData } from '$lib/components/Map/Map/deliveryLine';
import { DeliveryLineType } from '$lib/api/types';
import { colorBlue500, colorGreen500, colorYellow500 } from '$lib/tw-var';

export interface DeliveryLineLayer {
  /** Replaces the ribbon set (null clears). Ribbons drape once their ground data arrives. */
  setData: (data: DeliveryLineData | null) => void;
  setVisible: (visible: boolean) => void;
  /** Freezes the dash flow (reduced motion), matching OL's flowSpeed 0. */
  setFlowFrozen: (frozen: boolean) => void;
  /** Finalizes pending ribbons, refits to the camera zoom, advances the dash flow. */
  update: (camera: THREE.PerspectiveCamera, dt: number) => void;
  /** Flags a refit - the CSS viewport height changed (world-per-px derives from it). */
  setViewport: () => void;
  dispose: () => void;
}

interface LineSpec {
  from: [x: number, z: number];
  to: [x: number, z: number];
  type: DeliveryLineType;
}

/**
 * One draped ribbon. The geometry is allocated immediately (topology never changes) and
 * the ground heights fill in asynchronously; refit rewrites the vertices so the line is
 * DELIVERY_LINE_WIDTH_PX CSS px wide and dashes are OL-px sized at the camera's distance.
 */
interface Ribbon {
  spec: LineSpec;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  from: [x: number, z: number];
  to: [x: number, z: number];
  perp: [x: number, z: number];
  length: number;
  sampleCount: number;
  zoom: number;
  heights: number[] | null;
  refitFor: number | null;
}

/** The dash texture: one cycle, white dash then transparent gap, flowing via offset.x. */
function makeDashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context for dash');
  const dashPx =
    (DELIVERY_FLOW_DASH_LENGTH_PX / (DELIVERY_FLOW_DASH_LENGTH_PX + DELIVERY_FLOW_DASH_GAP_PX)) *
    canvas.width;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, dashPx, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export function createDeliveryLineLayer(
  scene: THREE.Scene,
  meta: TilesMeta,
  groundHeights: GroundHeights,
  viewportHeight: () => number,
): DeliveryLineLayer {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  /** One material+texture per line type; the shared offset animates the dash flow. */
  const materials = new Map<DeliveryLineType, THREE.MeshBasicMaterial>();
  function materialFor(type: DeliveryLineType): THREE.MeshBasicMaterial {
    let material = materials.get(type);
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        color: makeColor(
          type === DeliveryLineType.Supply
            ? colorGreen500
            : type === DeliveryLineType.Demand
              ? colorBlue500
              : colorYellow500,
        ),
        transparent: true,
        opacity: DELIVERY_LINE_OPACITY,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        map: makeDashTexture(),
      });
      materials.set(type, material);
    }
    return material;
  }

  let ribbons: Ribbon[] = [];
  let visible = false;
  let flowFrozen = false;
  let flowOffset = 0;

  function lineSpecs(data: DeliveryLineData | null): LineSpec[] {
    if (!data) return [];
    const point = gamePlaneToWorldXZ(data.point.x, data.point.y, meta);
    const specs: LineSpec[] = [];
    for (const d of data.demand) {
      // Cargo flows from the matched source into the selected point.
      specs.push({
        from: gamePlaneToWorldXZ(d.coord.x, d.coord.y, meta),
        to: point,
        type: DeliveryLineType.Demand,
      });
    }
    for (const d of data.supply) {
      specs.push({
        from: point,
        to: gamePlaneToWorldXZ(d.coord.x, d.coord.y, meta),
        type: DeliveryLineType.Supply,
      });
    }
    for (const [d1, d2] of data.dropPoint) {
      specs.push({
        from: gamePlaneToWorldXZ(d1.coord.x, d1.coord.y, meta),
        to: gamePlaneToWorldXZ(d2.coord.x, d2.coord.y, meta),
        type: DeliveryLineType.Drop,
      });
    }
    return specs;
  }

  function createRibbon(spec: LineSpec): Ribbon {
    const from = spec.from;
    const to = spec.to;
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const length = Math.hypot(dx, dz);
    const zoom = groundHeights.zoomForBox(
      Math.min(from[0], to[0]),
      Math.min(from[1], to[1]),
      Math.max(from[0], to[0]),
      Math.max(from[1], to[1]),
      DELIVERY_LINE_MAX_TILES,
    );
    // ~2x the ground resolution per sample, clamped to a sane ribbon density.
    const groundStep = meta.widthMeters / (1 << zoom) / 32;
    const step = Math.max(groundStep, length / DELIVERY_LINE_MAX_SAMPLES);
    const sampleCount = Math.max(
      DELIVERY_LINE_MIN_SAMPLES,
      Math.min(Math.ceil(length / step) + 1, DELIVERY_LINE_MAX_SAMPLES),
    );

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(sampleCount * 2 * 3), 3),
    );
    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(sampleCount * 2 * 2), 2),
    );
    const indices: number[] = [];
    for (let i = 0; i < sampleCount - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, materialFor(spec.type));
    mesh.renderOrder = 0;
    mesh.frustumCulled = false;
    group.add(mesh);
    return {
      spec,
      mesh,
      from,
      to,
      perp:
        length > 0
          ? ([-dz / length, dx / length] as [x: number, z: number])
          : ([0, 0] as [x: number, z: number]),
      length,
      sampleCount,
      zoom,
      heights: null,
      refitFor: null,
    };
  }

  function finalizeRibbon(ribbon: Ribbon): void {
    const heights: number[] = [];
    for (let i = 0; i < ribbon.sampleCount; i++) {
      const t = i / (ribbon.sampleCount - 1);
      const h = groundHeights.sample(
        ribbon.from[0] + (ribbon.to[0] - ribbon.from[0]) * t,
        ribbon.from[1] + (ribbon.to[1] - ribbon.from[1]) * t,
        ribbon.zoom,
      );
      if (h === null) return; // Tile data still loading - retry on a later frame.
      heights.push(h);
    }
    ribbon.heights = heights;
  }

  /** Rewrites the vertices: width and dash cycle derive from the line's camera distance,
   * so the ribbon is DELIVERY_LINE_WIDTH_PX CSS px wide at every zoom (OL's screen space). */
  function refitRibbon(ribbon: Ribbon, camera: THREE.PerspectiveCamera): void {
    if (ribbon.heights === null) return;
    const midX = (ribbon.from[0] + ribbon.to[0]) / 2;
    const midZ = (ribbon.from[1] + ribbon.to[1]) / 2;
    const midY = Math.max(...ribbon.heights);
    _midpoint.set(midX, midY, midZ);
    const dist = Math.max(camera.position.distanceTo(_midpoint), 1);
    const worldPerCssPx =
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist) / viewportHeight();
    const half = (DELIVERY_LINE_WIDTH_PX * worldPerCssPx) / 2;
    const cycle = (DELIVERY_FLOW_DASH_LENGTH_PX + DELIVERY_FLOW_DASH_GAP_PX) * worldPerCssPx;

    const positionAttr = ribbon.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const uvAttr = ribbon.mesh.geometry.getAttribute('uv') as THREE.BufferAttribute;
    const [nx, nz] = ribbon.perp;
    for (let i = 0; i < ribbon.sampleCount; i++) {
      const t = i / (ribbon.sampleCount - 1);
      const x = ribbon.from[0] + (ribbon.to[0] - ribbon.from[0]) * t;
      const z = ribbon.from[1] + (ribbon.to[1] - ribbon.from[1]) * t;
      const y = ribbon.heights[i] + OVERLAY_GROUND_OFFSET_M;
      positionAttr.setXYZ(i * 2, x - nx * half, y, z - nz * half);
      positionAttr.setXYZ(i * 2 + 1, x + nx * half, y, z + nz * half);
      const u = (t * ribbon.length) / cycle;
      uvAttr.setXY(i * 2, u, 0);
      uvAttr.setXY(i * 2 + 1, u, 1);
    }
    positionAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
    ribbon.mesh.geometry.computeBoundingSphere();
    ribbon.refitFor = bucketOf(camera);
  }

  const _midpoint = new THREE.Vector3();
  function bucketOf(camera: THREE.PerspectiveCamera): number {
    // Camera height is the zoom proxy (the orbit target rides the ground plane).
    return Math.floor(Math.log2(Math.max(camera.position.y, 1)) / DELIVERY_LINE_REFIT_LOG2_STEP);
  }

  return {
    setData(data) {
      for (const ribbon of ribbons) {
        group.remove(ribbon.mesh);
        ribbon.mesh.geometry.dispose();
      }
      ribbons = lineSpecs(data).map(createRibbon);
    },

    setVisible(v) {
      visible = v;
      group.visible = v;
    },

    setFlowFrozen(frozen) {
      flowFrozen = frozen;
    },

    update(camera, dt) {
      const bucket = bucketOf(camera);
      for (const ribbon of ribbons) {
        if (ribbon.heights === null) finalizeRibbon(ribbon);
        // A freshly finalized ribbon has refitFor null, so it gets its first refit here.
        if (ribbon.heights !== null && ribbon.refitFor !== bucket) {
          refitRibbon(ribbon, camera);
        }
      }
      if (visible && !flowFrozen && ribbons.length > 0) {
        // Dash travel in UV units is zoom-independent: the world dash cycle and the world
        // distance traveled both derive from the same px scale, so OL's px/s rate holds.
        flowOffset =
          (flowOffset -
            (dt * DELIVERY_FLOW_DASH_SPEED_PX) /
              (DELIVERY_FLOW_DASH_LENGTH_PX + DELIVERY_FLOW_DASH_GAP_PX)) %
          1;
        for (const material of materials.values()) {
          if (material.map) material.map.offset.x = flowOffset;
        }
      }
    },

    setViewport() {
      // The CSS height feeds the px→world derivation - force a refit on the next frame.
      for (const ribbon of ribbons) ribbon.refitFor = null;
    },

    dispose() {
      for (const ribbon of ribbons) {
        group.remove(ribbon.mesh);
        ribbon.mesh.geometry.dispose();
      }
      for (const material of materials.values()) {
        material.map?.dispose();
        material.dispose();
      }
      materials.clear();
      ribbons = [];
      scene.remove(group);
    },
  };
}
