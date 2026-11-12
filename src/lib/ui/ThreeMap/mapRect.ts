import type { TilesMeta } from './three-map-types.ts';

/** The map's world rect in meters (the map is centred on the world origin). */
export interface MapRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function mapRect(meta: TilesMeta): MapRect {
  return {
    minX: -meta.widthMeters / 2,
    maxX: meta.widthMeters / 2,
    minZ: -meta.heightMeters / 2,
    maxZ: meta.heightMeters / 2,
  };
}

/** XZ offset that moves a point back inside the rect (zero when it is already inside). */
export function clampDelta(rect: MapRect, x: number, z: number): [dx: number, dz: number] {
  const dx = Math.min(Math.max(x, rect.minX), rect.maxX) - x;
  const dz = Math.min(Math.max(z, rect.minZ), rect.maxZ) - z;
  return [dx, dz];
}
