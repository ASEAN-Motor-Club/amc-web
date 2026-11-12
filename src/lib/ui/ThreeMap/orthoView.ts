import { ORTHO_PAN_MARGIN_MAPS } from './constants.ts';
import type { TilesMeta } from './three-map-types.ts';
import { metersPerCssPx, zoomForMetersPerCssPx } from './view.ts';

/**
 * The 2D view's limits, reproduced from OL's `View`: it never shows more than the view extent (the
 * map plus a margin of one map size on every side) across the viewport WIDTH, and never zooms out
 * past zoom 0 (the whole map in one 256px tile). Measured on the OL map: a 1236px-wide viewport
 * bottoms out at zoom 0.6865, a 756px one at 0.
 */
export function orthoMinZoom(meta: TilesMeta, viewWidthCss: number): number {
  const extentMeters = meta.widthMeters * (1 + 2 * ORTHO_PAN_MARGIN_MAPS);
  const maxMetersPerPx = Math.min(metersPerCssPx(0), extentMeters / Math.max(viewWidthCss, 1));
  return Math.max(0, zoomForMetersPerCssPx(maxMetersPerPx));
}

/**
 * Keeps the viewport inside the pan extent: the view centre may go as far as the extent edge minus
 * half the viewport, and a viewport larger than the extent (a very tall window) just centres.
 */
export function clampOrthoCenter(
  x: number,
  z: number,
  metersPerPx: number,
  viewWidthCss: number,
  viewHeightCss: number,
  meta: TilesMeta,
): [x: number, z: number] {
  const halfW = (viewWidthCss * metersPerPx) / 2;
  const halfH = (viewHeightCss * metersPerPx) / 2;
  const reachX = (meta.widthMeters / 2) * (1 + 2 * ORTHO_PAN_MARGIN_MAPS);
  const reachZ = (meta.heightMeters / 2) * (1 + 2 * ORTHO_PAN_MARGIN_MAPS);
  const limit = (centre: number, reach: number, half: number) =>
    half >= reach ? 0 : Math.min(Math.max(centre, -reach + half), reach - half);
  return [limit(x, reachX, halfW), limit(z, reachZ, halfH)];
}

/**
 * The view centre after a zoom that keeps the world point under `anchor` (CSS px from the viewport
 * centre, y down - screen right is +X, screen down is +Z) fixed on screen.
 */
export function anchoredCenter(
  x: number,
  z: number,
  fromMetersPerPx: number,
  toMetersPerPx: number,
  anchor: { x: number; y: number },
): [x: number, z: number] {
  return [
    x + anchor.x * (fromMetersPerPx - toMetersPerPx),
    z + anchor.y * (fromMetersPerPx - toMetersPerPx),
  ];
}

/** OL's default view-animation easing (`inAndOut`): smoothstep. */
export const inAndOut = (t: number): number => 3 * t * t - 2 * t * t * t;
