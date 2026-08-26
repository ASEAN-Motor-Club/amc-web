import type { Vector3 } from '$lib/types';
import type { TilesMeta } from './three-map-types';

export const MAP_REAL_X_LEFT = -1280000;
export const MAP_REAL_Y_TOP = -320000;
export const MAP_REAL_SIZE = 2200000;

/**
 * Game/map coordinates are UE-style: x right, y down, z up (all in cm).
 * The OL map projects them to a px space (0..2200000) via reProjectPoint, and the
 * 3D world centers that px space on the map origin in meters (cm/100).
 */
export function gameCoordToWorld(
  coord: Vector3,
  meta: TilesMeta,
): [x: number, y: number, z: number] {
  const pxX = coord.x - MAP_REAL_X_LEFT;
  const pxY = -(coord.y - MAP_REAL_Y_TOP) + MAP_REAL_SIZE;
  return [pxX / 100 - meta.widthMeters / 2, coord.z / 100, pxY / 100 - meta.heightMeters / 2];
}
