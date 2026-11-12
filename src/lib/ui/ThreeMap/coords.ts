import type { Vector3 } from '#lib/types/index.ts';
import type { TilesMeta } from './three-map-types.ts';

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

/** Inverse of {@link gamePlaneToWorldXZ}: world XZ meters → game-plane cm (x right, y down). */
export function worldXZToGamePlane(
  x: number,
  z: number,
  meta: TilesMeta,
): [gx: number, gy: number] {
  const sizePx = meta.widthMeters * CM_PER_M; // square map
  const pxX = (x + meta.widthMeters / 2) * CM_PER_M;
  const pxY = (meta.heightMeters / 2 - z) * CM_PER_M;
  return [pxX + meta.originXMeters * CM_PER_M, meta.originYMeters * CM_PER_M + (sizePx - pxY)];
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
 * A point inside the ring for anchoring its label - OL's `Polygon#getInteriorPoint`, ported so
 * names land where OL put them: cut the ring with the horizontal line through the centre of its
 * bounding box, and take the middle of the longest cut segment whose middle is inside the ring.
 * Falls back to the bounding-box centre when no segment qualifies (a degenerate ring). A closing
 * point repeating the first is fine; the ring is closed implicitly either way.
 */
export function ringInteriorPoint(ring: [x: number, z: number][]): [x: number, z: number] {
  if (ring.length === 0) throw new Error('ring has no points');
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const crossings: number[] = [];
  let [x1, z1] = ring[ring.length - 1];
  for (const [x2, z2] of ring) {
    if ((centerZ <= z1 && z2 <= centerZ) || (z1 <= centerZ && centerZ <= z2)) {
      crossings.push(((centerZ - z1) / (z2 - z1)) * (x2 - x1) + x1);
    }
    x1 = x2;
    z1 = z2;
  }
  crossings.sort((a, b) => a - b);

  let pointX = NaN;
  let longest = -Infinity;
  for (let i = 1; i < crossings.length; i++) {
    const length = Math.abs(crossings[i] - crossings[i - 1]);
    const mid = (crossings[i - 1] + crossings[i]) / 2;
    if (length > longest && pointInRing(mid, centerZ, ring)) {
      pointX = mid;
      longest = length;
    }
  }
  return [Number.isNaN(pointX) ? centerX : pointX, centerZ];
}
