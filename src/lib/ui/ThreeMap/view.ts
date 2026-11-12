import * as THREE from 'three';
import { MAP_REAL_SIZE } from '#lib/utils/mapProjection.ts';
import type { TilesMeta } from './three-map-types.ts';

/**
 * The map's view model, in the 2D map's own terms: a centre in px space (0..MAP_REAL_SIZE,
 * y up - what `reProjectPoint` produces) and a fractional zoom. Both renderers open at and
 * report one of these, so toggling modes or moving into picture-in-picture keeps the view.
 */
export interface MapViewState {
  center: [x: number, y: number];
  zoom: number;
}

/** Tile edge in CSS px at the zoom the tile pyramid is addressed by. */
export const MAP_TILE_SIZE_PX = 256;

const CM_PER_M = 100;

/** Map px-space units (cm) covered by one CSS px at zoom 0: the whole map across one tile. */
const ZOOM0_CM_PER_CSS_PX = MAP_REAL_SIZE / MAP_TILE_SIZE_PX;

/** World meters covered by one CSS px at a zoom. Each zoom halves it. */
export function metersPerCssPx(zoom: number): number {
  return ZOOM0_CM_PER_CSS_PX / CM_PER_M / 2 ** zoom;
}

/** Inverse of {@link metersPerCssPx}. */
export function zoomForMetersPerCssPx(metersPerPx: number): number {
  return Math.log2(ZOOM0_CM_PER_CSS_PX / CM_PER_M / metersPerPx);
}

/**
 * The zoom at which a world extent (meters) fills a viewport (CSS px) minus `paddingPx` on every
 * side, capped at `maxZoom`. An extent with no size (a single point) has nothing to fit, so it
 * zooms all the way in - what OL's `View.fit` does.
 */
export function zoomToFitExtent(
  extent: { widthMeters: number; heightMeters: number },
  viewport: { width: number; height: number },
  paddingPx: number,
  maxZoom: number,
): number {
  const availableW = Math.max(viewport.width - 2 * paddingPx, 1);
  const availableH = Math.max(viewport.height - 2 * paddingPx, 1);
  const metersPerPx = Math.max(extent.widthMeters / availableW, extent.heightMeters / availableH);
  return metersPerPx > 0 ? Math.min(zoomForMetersPerCssPx(metersPerPx), maxZoom) : maxZoom;
}

/** px-space point → world XZ meters (north is -Z, see `gameCoordToWorld`). */
export function pxToWorldXZ(
  [px, py]: [x: number, y: number],
  meta: TilesMeta,
): [x: number, z: number] {
  return [px / CM_PER_M - meta.widthMeters / 2, meta.heightMeters / 2 - py / CM_PER_M];
}

/** Inverse of {@link pxToWorldXZ}. */
export function worldXZToPx(x: number, z: number, meta: TilesMeta): [x: number, y: number] {
  return [(x + meta.widthMeters / 2) * CM_PER_M, (meta.heightMeters / 2 - z) * CM_PER_M];
}

/**
 * Distance a top-down perspective camera needs so the target plane spans the same world
 * height as an ortho view at `zoom` would across `cssHeight` px.
 */
export function topDownDistance(zoom: number, cssHeight: number, fovDeg: number): number {
  const visibleHeight = cssHeight * metersPerCssPx(zoom);
  return visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)));
}
