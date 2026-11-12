import * as THREE from 'three';
import { areaBoundaries } from '#lib/data/area.ts';
import {
  AREA_BOUND_FILL_OPACITY,
  AREA_BOUND_RENDER_ORDER,
  AREA_BOUND_STROKE_WIDTH_CSS,
} from './constants.ts';
import { gamePlaneToWorldXZ } from './coords.ts';
import type { GroundHeights } from './groundHeights.ts';
import { colorComponents } from './poi.ts';
import { createPolygonLayer, type PolygonLayer, type PolygonSpec } from './polygonLayer.ts';
import type { TilesMeta } from './three-map-types.ts';

/** Debug-only colouring: a distinct, stable colour per area so neighbouring bounds read apart. */
function boundColor(index: number): THREE.Color {
  // Golden-angle hue steps keep neighbours apart; lightness/chroma vary a little per index.
  const hue = (index * 137.508) % 360;
  return new THREE.Color().setHSL(hue / 360, 0.6, 0.45 + (index % 3) * 0.08);
}

export interface AreaBoundLayer {
  setVisible: (visible: boolean) => void;
  setFlat: (flat: boolean) => void;
  update: () => void;
  setDpr: (dpr: number) => void;
  dispose: () => void;
}

/**
 * OL's dev-only `areaBoundLayer`: every area as a translucent coloured polygon with a thin
 * outline. Geometry is built the first time the layer is shown - it is a debugging aid, so
 * nobody pays for the triangulation otherwise.
 */
export function createAreaBoundLayer(options: {
  scene: THREE.Scene;
  meta: TilesMeta;
  groundHeights: GroundHeights;
  dpr: number;
  /** Buffer colours are sRGB-encoded numbers (the 2D scene) rather than linear light. */
  displayReferred: boolean;
  invalidate: () => void;
}): AreaBoundLayer {
  const layer: PolygonLayer = createPolygonLayer({
    scene: options.scene,
    groundHeights: options.groundHeights,
    renderOrder: AREA_BOUND_RENDER_ORDER,
    strokeWidthCss: AREA_BOUND_STROKE_WIDTH_CSS,
    dpr: options.dpr,
    invalidate: options.invalidate,
  });
  layer.setVisible(false);
  let populated = false;

  function populate(): void {
    populated = true;
    const specs: PolygonSpec[] = areaBoundaries.map((area, index) => {
      const color = boundColor(index);
      const solid = colorComponents(color, options.displayReferred);
      return {
        ring: area.ring.map(([x, y]) => gamePlaneToWorldXZ(x, y, options.meta)),
        fill: [...solid, AREA_BOUND_FILL_OPACITY],
        stroke: [...solid, 1],
      };
    });
    layer.setPolygons(specs);
  }

  return {
    setVisible(visible) {
      if (visible && !populated) populate();
      layer.setVisible(visible);
    },
    setFlat: layer.setFlat,
    update: layer.update,
    setDpr: layer.setDpr,
    dispose: layer.dispose,
  };
}
