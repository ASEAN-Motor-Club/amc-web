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

/** Converts a game-plane point (x right, y down, cm) to world XZ meters. */
export function gamePlaneToWorldXZ(x: number, y: number, meta: TilesMeta): [x: number, z: number] {
  const [wx, , wz] = gameCoordToWorld({ x, y, z: 0 }, meta);
  return [wx, wz];
}

function pointInRing(px: number, pz: number, ring: [x: number, z: number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * A point inside the ring (odd-even test), for anchoring polygon labels: the bbox center
 * when it lies inside, otherwise a grid scan (mirrors OL's interior-point text placement).
 * Returns the first ring vertex as a last resort for degenerate rings.
 */
export function ringInteriorPoint(ring: [x: number, z: number][]): [x: number, z: number] {
  if (ring.length === 0) throw new Error('ring has no points');
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const center: [x: number, z: number] = [(minX + maxX) / 2, (minZ + maxZ) / 2];
  if (pointInRing(center[0], center[1], ring)) return center;
  for (let fz = 0.25; fz < 1; fz += 0.25) {
    for (let fx = 0.25; fx < 1; fx += 0.25) {
      const candidate: [x: number, z: number] = [
        minX + (maxX - minX) * fx,
        minZ + (maxZ - minZ) * fz,
      ];
      if (pointInRing(candidate[0], candidate[1], ring)) return candidate;
    }
  }
  return ring[0];
}
