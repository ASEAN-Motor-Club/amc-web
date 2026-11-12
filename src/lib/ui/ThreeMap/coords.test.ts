import { describe, expect, it } from 'vitest';
import { gamePlaneToWorldXZ, ringInteriorPoint, worldXZToGamePlane } from './coords.ts';
import type { TilesMeta } from './three-map-types.ts';

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

describe('ringInteriorPoint (OL getInteriorPoint)', () => {
  it('is the middle of the longest cut through the bounding-box centre', () => {
    // A 10x10 square.
    expect(
      ringInteriorPoint([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
    ).toEqual([5, 5]);
  });

  it('stays inside a U shape whose bbox centre is in the gap', () => {
    // U opening upward: arms at x 0..2 and 8..10, base z 8..10; centre line z=5 cuts both arms.
    const u: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 8],
      [8, 8],
      [8, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const [x, z] = ringInteriorPoint(u);
    expect(z).toBe(5);
    // The two arms are equally long (2 wide): the first one wins, centred at x = 1.
    expect(x).toBeCloseTo(1);
  });

  it('closes the ring itself, with or without a repeated closing point', () => {
    const open: [number, number][] = [
      [0, 0],
      [4, 0],
      [4, 6],
      [0, 6],
    ];
    expect(ringInteriorPoint(open)).toEqual(ringInteriorPoint([...open, open[0]]));
  });

  it('falls back to the bounding-box centre for a degenerate ring', () => {
    expect(
      ringInteriorPoint([
        [0, 0],
        [4, 4],
      ]),
    ).toEqual([2, 2]);
  });
});
