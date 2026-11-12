import { describe, expect, it } from 'vitest';
import { clampDelta, mapRect } from './mapRect.ts';
import type { TilesMeta } from './three-map-types.ts';

const meta: TilesMeta = {
  widthMeters: 22000,
  heightMeters: 20000,
  originXMeters: -12800,
  originYMeters: -3200,
  maxZoom: 5,
  oceanLevelMeters: 0,
  minZ: 0,
  maxZ: 2000,
  tileInnerResolution: 44,
  tileSampleCount: 46,
};

describe('mapRect', () => {
  it('is the tile grid centred on the origin, so the ocean quad covers exactly the map', () => {
    expect(mapRect(meta)).toEqual({ minX: -11000, maxX: 11000, minZ: -10000, maxZ: 10000 });
  });
});

describe('clampDelta', () => {
  const rect = mapRect(meta);

  it('is zero inside the rect, edges included', () => {
    expect(clampDelta(rect, 0, 0)).toEqual([0, 0]);
    expect(clampDelta(rect, 11000, -10000)).toEqual([0, 0]);
  });

  it('pulls each axis back independently', () => {
    expect(clampDelta(rect, 12000, 0)).toEqual([-1000, 0]);
    expect(clampDelta(rect, -15000, 10500)).toEqual([4000, -500]);
  });
});
