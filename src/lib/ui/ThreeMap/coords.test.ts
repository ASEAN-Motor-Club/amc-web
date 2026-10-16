import { describe, expect, it } from 'vitest';
import { gamePlaneToWorldXZ, worldXZToGamePlane } from './coords';
import type { TilesMeta } from './three-map-types';

const meta: TilesMeta = {
  widthMeters: 22000,
  heightMeters: 22000,
  originXMeters: -12800,
  originYMeters: -3200,
  maxZoom: 5,
  oceanLevelMeters: 0,
  minZ: 0,
  maxZ: 2000,
  tileInnerResolution: 512,
  tileSampleCount: 514,
};

describe('worldXZToGamePlane', () => {
  it('round-trips game-plane points through world XZ and back', () => {
    for (const [gx, gy] of [
      [0, 0],
      [100, 200],
      [-1280000, -320000],
      [919999, 1871234],
    ] as const) {
      const [wx, wz] = gamePlaneToWorldXZ(gx, gy, meta);
      expect(worldXZToGamePlane(wx, wz, meta)).toEqual([gx, gy]);
    }
  });
});
