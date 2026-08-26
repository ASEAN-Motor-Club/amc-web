import type { Vector3 } from '$lib/types';
import type { TilesMeta } from './three-map-types';

const CM_PER_M = 100;

/**
 * Game/map coordinates are UE-style: x right, y down, z up (all in cm).
 * tiles.json carries the map's UE origin and size; the 3D world is meters centered on
 * the map origin.
 *
 * The OL map projects UE coords into a px space [0, sizePx]:
 *   pxX = x - originXCm
 *   pxY = sizePx - (y - originYCm)      (UE y-down → px y-up)
 * The 3D world centers that px square on the map origin and works in meters.
 *
 * The terrain color textures put the image top (north) on each tile's -Z side, so looking
 * down, north is screen-up. Markers mirror that: UE y-increasing-south maps to -worldZ.
 */
export function gameCoordToWorld(
  coord: Vector3,
  meta: TilesMeta,
): [x: number, y: number, z: number] {
  const originXCm = meta.originXMeters * CM_PER_M;
  const originYCm = meta.originYMeters * CM_PER_M;
  const sizePx = meta.widthMeters * CM_PER_M; // square map

  const pxX = coord.x - originXCm;
  const pxY = sizePx - (coord.y - originYCm);

  const wx = pxX / CM_PER_M - meta.widthMeters / 2;
  const wz = meta.heightMeters / 2 - pxY / CM_PER_M;
  return [wx, coord.z / CM_PER_M, wz];
}
