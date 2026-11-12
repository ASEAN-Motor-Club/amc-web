import type * as THREE from 'three';
import type { DeliveryLineData } from '#lib/components/Map/Map/deliveryLine.ts';
import { DeliveryLineType } from '#lib/api/types.ts';
import { colorBlue500, colorGreen500, colorYellow500 } from '#lib/tw-var.ts';
import type { Vector2 } from '#lib/types/index.ts';
import {
  DELIVERY_FLOW_DASH_GAP,
  DELIVERY_FLOW_DASH_LENGTH,
  DELIVERY_FLOW_DASH_SPEED,
  DELIVERY_FLOW_DASH_WIDTH,
  DELIVERY_LINE_OPACITY,
  DELIVERY_LINE_RENDER_ORDER,
  OVERLAY_GROUND_OFFSET_M,
} from './constants.ts';
import { gamePlaneToWorldXZ } from './coords.ts';
import type { GroundHeights } from './groundHeights.ts';
import { rgba, type Rgba } from './polygonLayer.ts';
import type { XZ } from './polygons.ts';
import { createScreenLines, type ScreenLines } from './screenLines.ts';
import type { TilesMeta } from './three-map-types.ts';

export interface DeliveryLineLayer {
  /** The lines to draw around a delivery point (or none). */
  setLines: (data: DeliveryLineData | undefined) => void;
  /** Whole layer on/off (the delivery POI toggle). */
  setVisible: (visible: boolean) => void;
  /** Reduced motion freezes the dash flow (the pattern still draws). */
  setReducedMotion: (reduced: boolean) => void;
  setFlat: (flat: boolean) => void;
  /** Builds the lines whose ground data has arrived. */
  update: () => void;
  setDpr: (dpr: number) => void;
  dispose: () => void;
}

const lineColors = (displayReferred: boolean): Record<DeliveryLineType, Rgba> => ({
  [DeliveryLineType.Supply]: rgba(colorGreen500, DELIVERY_LINE_OPACITY, displayReferred),
  [DeliveryLineType.Demand]: rgba(colorBlue500, DELIVERY_LINE_OPACITY, displayReferred),
  [DeliveryLineType.Drop]: rgba(colorYellow500, DELIVERY_LINE_OPACITY, displayReferred),
});

interface Line {
  path: XZ[];
  color: Rgba;
}

/**
 * OL's `deliveryLineLayer`: dashed lines from supplier to consumer around the hovered or locked
 * delivery point, coloured by role, with the dash pattern flowing downstream. The pattern lives in
 * screen pixels (`screenLines.ts`), so it reads the same at any zoom. Each line is one straight
 * segment between its two end points' ground heights; it deliberately does not follow the terrain.
 *
 * `onAnimatingChange` fires when the flow starts/stops needing frames: the scene renders on demand,
 * so while lines flow it must keep drawing.
 */
export function createDeliveryLineLayer(options: {
  scene: THREE.Scene;
  meta: TilesMeta;
  groundHeights: GroundHeights;
  dpr: number;
  /** Buffer colours are sRGB-encoded numbers (the 2D scene) rather than linear light. */
  displayReferred: boolean;
  invalidate: () => void;
  onAnimatingChange: (animating: boolean) => void;
}): DeliveryLineLayer {
  const { scene, meta, groundHeights, invalidate, onAnimatingChange } = options;
  const colors = lineColors(options.displayReferred);
  const lines: ScreenLines = createScreenLines({
    renderOrder: DELIVERY_LINE_RENDER_ORDER,
    widthCss: DELIVERY_FLOW_DASH_WIDTH,
    dpr: options.dpr,
    dash: { dashCss: DELIVERY_FLOW_DASH_LENGTH, gapCss: DELIVERY_FLOW_DASH_GAP },
    flowCssPerSecond: DELIVERY_FLOW_DASH_SPEED,
  });
  scene.add(lines.mesh);

  let current: Line[] = [];
  let heights: (Float32Array | undefined)[] = [];
  let zoom = 0;
  let pendingBuild = false;
  let visible = true;
  let reducedMotion = false;
  let flat = false;
  let animating = false;

  function world(coord: Vector2): XZ {
    return gamePlaneToWorldXZ(coord.x, coord.y, meta);
  }

  function setAnimating(next: boolean): void {
    if (animating === next) return;
    animating = next;
    onAnimatingChange(next);
  }

  function refreshAnimating(): void {
    setAnimating(visible && current.length > 0 && !reducedMotion);
  }

  /** Writes every ready line into the instance buffers. Returns false while heights are missing. */
  function build(): boolean {
    let missing = false;
    for (let i = 0; i < current.length; i++) {
      if (flat || heights[i]) continue;
      heights[i] =
        groundHeights.sampleMany(current[i].path, zoom, OVERLAY_GROUND_OFFSET_M) ?? undefined;
      if (!heights[i]) missing = true;
    }
    if (missing) return false;
    let segmentCount = 0;
    for (const line of current) segmentCount += Math.max(line.path.length - 1, 0);
    const starts = new Float32Array(segmentCount * 3);
    const ends = new Float32Array(segmentCount * 3);
    const colors = new Float32Array(segmentCount * 4);
    const distances = new Float32Array(segmentCount);
    let s = 0;
    current.forEach((line, i) => {
      let travelled = 0;
      for (let k = 0; k + 1 < line.path.length; k++, s++) {
        const [ax, az] = line.path[k];
        const [bx, bz] = line.path[k + 1];
        starts.set([ax, flat ? 0 : (heights[i]?.[k] ?? 0), az], s * 3);
        ends.set([bx, flat ? 0 : (heights[i]?.[k + 1] ?? 0), bz], s * 3);
        colors.set(line.color, s * 4);
        distances[s] = travelled;
        travelled += Math.hypot(bx - ax, bz - az);
      }
    });
    lines.setSegments(starts, ends, colors, distances);
    invalidate();
    return true;
  }

  return {
    setLines(data) {
      current = [];
      heights = [];
      if (data) {
        const point = world(data.point);
        const ends: [XZ, XZ, DeliveryLineType][] = [];
        // Cargo flows from the matched source into the point, and from the point to its consumers.
        for (const d of data.demand) ends.push([world(d.coord), point, DeliveryLineType.Demand]);
        for (const d of data.supply) ends.push([point, world(d.coord), DeliveryLineType.Supply]);
        for (const [from, to] of data.dropPoint) {
          ends.push([world(from.coord), world(to.coord), DeliveryLineType.Drop]);
        }
        // A straight chord from one end's ground height to the other's: only the two end points
        // are sampled, at the finest zoom, so the line never follows the terrain in between.
        zoom = meta.maxZoom;
        for (const [from, to, type] of ends)
          current.push({ path: [from, to], color: colors[type] });
      }
      pendingBuild = true;
      if (current.length === 0)
        lines.setSegments(
          new Float32Array(),
          new Float32Array(),
          new Float32Array(),
          new Float32Array(),
        );
      refreshAnimating();
      invalidate();
    },
    setVisible(next) {
      visible = next;
      lines.mesh.visible = next;
      refreshAnimating();
      invalidate();
    },
    setReducedMotion(next) {
      reducedMotion = next;
      lines.setFlow(next ? 0 : DELIVERY_FLOW_DASH_SPEED);
      refreshAnimating();
      invalidate();
    },
    setFlat(next) {
      if (flat === next) return;
      flat = next;
      pendingBuild = true;
    },
    update() {
      if (pendingBuild && current.length > 0) pendingBuild = !build();
      else pendingBuild = false;
    },
    setDpr(dpr) {
      lines.setDpr(dpr);
      invalidate();
    },
    dispose() {
      setAnimating(false);
      scene.remove(lines.mesh);
      lines.dispose();
    },
  };
}
