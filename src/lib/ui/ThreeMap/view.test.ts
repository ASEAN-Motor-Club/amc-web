import { describe, expect, it } from 'vitest';
import type { TilesMeta } from './three-map-types.ts';
import {
  MAP_TILE_SIZE_PX,
  metersPerCssPx,
  pxToWorldXZ,
  topDownDistance,
  worldXZToPx,
  zoomForMetersPerCssPx,
  zoomToFitExtent,
} from './view.ts';

const meta: TilesMeta = {
  widthMeters: 22000,
  heightMeters: 22000,
  originXMeters: -12800,
  originYMeters: -3200,
  maxZoom: 5,
  oceanLevelMeters: 0,
  minZ: 0,
  maxZ: 2000,
  tileInnerResolution: 44,
  tileSampleCount: 46,
};

describe('metersPerCssPx', () => {
  it('shows the whole map across one tile at zoom 0 and halves per zoom', () => {
    expect(metersPerCssPx(0) * MAP_TILE_SIZE_PX).toBeCloseTo(22000);
    // The OL map's measured resolution at zoom 1 was 4296.875 cm/px.
    expect(metersPerCssPx(1) * 100).toBeCloseTo(4296.875);
    expect(metersPerCssPx(5) * 2 ** 5).toBeCloseTo(metersPerCssPx(0));
  });

  it('round-trips through its inverse, fractional zooms included', () => {
    for (const zoom of [0, 1, 1.37, 4.5, 8]) {
      expect(zoomForMetersPerCssPx(metersPerCssPx(zoom))).toBeCloseTo(zoom);
    }
  });
});

describe('px / world conversion', () => {
  it('maps the map centre to the world origin and keeps north at -Z', () => {
    expect(pxToWorldXZ([1_100_000, 1_100_000], meta)).toEqual([0, 0]);
    const [, northZ] = pxToWorldXZ([1_100_000, 2_200_000], meta);
    expect(northZ).toBe(-11000);
  });

  it('round-trips px → world → px', () => {
    for (const px of [
      [0, 0],
      [12345, 987654],
      [2_200_000, 2_200_000],
    ] as [number, number][]) {
      const [x, z] = pxToWorldXZ(px, meta);
      const back = worldXZToPx(x, z, meta);
      expect(back[0]).toBeCloseTo(px[0]);
      expect(back[1]).toBeCloseTo(px[1]);
    }
  });
});

describe('topDownDistance', () => {
  it('spans the same world height as the ortho view at that zoom', () => {
    const fov = 55;
    const cssHeight = 700;
    const distance = topDownDistance(2, cssHeight, fov);
    const visibleHeight = 2 * distance * Math.tan((fov / 2) * (Math.PI / 180));
    expect(visibleHeight).toBeCloseTo(cssHeight * metersPerCssPx(2));
  });
});

describe('zoomToFitExtent', () => {
  const viewport = { width: 1000, height: 600 };

  it('fits the limiting axis inside the padding', () => {
    // 872 x 472 px available: a wide extent is limited by its width.
    const zoom = zoomToFitExtent({ widthMeters: 8720, heightMeters: 100 }, viewport, 64, 8);
    expect(metersPerCssPx(zoom)).toBeCloseTo(10, 6);
    // ...and a tall one by its height.
    const tall = zoomToFitExtent({ widthMeters: 100, heightMeters: 4720 }, viewport, 64, 8);
    expect(metersPerCssPx(tall)).toBeCloseTo(10, 6);
  });

  it('zooms all the way in on a single point', () => {
    expect(zoomToFitExtent({ widthMeters: 0, heightMeters: 0 }, viewport, 64, 8)).toBe(8);
  });

  it('never zooms in past the limit for a tiny extent', () => {
    expect(zoomToFitExtent({ widthMeters: 0.01, heightMeters: 0.01 }, viewport, 64, 8)).toBe(8);
  });

  it('survives a viewport smaller than its padding', () => {
    const zoom = zoomToFitExtent(
      { widthMeters: 100, heightMeters: 100 },
      { width: 50, height: 50 },
      64,
      8,
    );
    expect(Number.isFinite(zoom)).toBe(true);
  });
});
