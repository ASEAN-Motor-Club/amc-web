import { describe, expect, it } from 'vitest';
import { anchoredCenter, clampOrthoCenter, inAndOut, orthoMinZoom } from './orthoView.ts';
import type { TilesMeta } from './three-map-types.ts';
import { metersPerCssPx } from './view.ts';

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

describe('orthoMinZoom', () => {
  it('matches the OL view limits measured on the real map', () => {
    expect(orthoMinZoom(meta, 1236)).toBeCloseTo(0.6865, 3);
    expect(orthoMinZoom(meta, 756)).toBe(0);
    expect(orthoMinZoom(meta, 400)).toBe(0);
  });
});

describe('clampOrthoCenter', () => {
  const mpp = metersPerCssPx(2);

  it('leaves a centre alone while the viewport stays inside the pan extent', () => {
    expect(clampOrthoCenter(1000, -2000, mpp, 800, 600, meta)).toEqual([1000, -2000]);
  });

  it('stops the viewport edge at one map size past the map edge', () => {
    const halfW = (800 * mpp) / 2;
    const [x, z] = clampOrthoCenter(1e9, -1e9, mpp, 800, 600, meta);
    // Extent edge = 1.5 map widths from the centre; the viewport may not cross it.
    expect(x).toBeCloseTo(33000 - halfW);
    expect(z).toBeCloseTo(-(33000 - (600 * mpp) / 2));
  });

  it('centres a viewport bigger than the extent', () => {
    expect(clampOrthoCenter(500, 500, metersPerCssPx(0), 8000, 8000, meta)).toEqual([0, 0]);
  });
});

describe('anchoredCenter', () => {
  it('keeps the world point under the anchor fixed across a zoom', () => {
    const from = metersPerCssPx(2);
    const to = metersPerCssPx(3.4);
    const anchor = { x: 120, y: -80 };
    const centre: [number, number] = [500, -300];
    const pointBefore = [centre[0] + anchor.x * from, centre[1] + anchor.y * from];
    const next = anchoredCenter(centre[0], centre[1], from, to, anchor);
    const pointAfter = [next[0] + anchor.x * to, next[1] + anchor.y * to];
    expect(pointAfter[0]).toBeCloseTo(pointBefore[0]);
    expect(pointAfter[1]).toBeCloseTo(pointBefore[1]);
  });

  it('is the identity when zooming about the viewport centre', () => {
    expect(anchoredCenter(10, 20, 5, 2, { x: 0, y: 0 })).toEqual([10, 20]);
  });
});

describe('inAndOut', () => {
  it('eases from 0 to 1 with a flat start and end', () => {
    expect(inAndOut(0)).toBe(0);
    expect(inAndOut(1)).toBe(1);
    expect(inAndOut(0.5)).toBe(0.5);
    expect(inAndOut(0.1)).toBeLessThan(0.1);
    expect(inAndOut(0.9)).toBeGreaterThan(0.9);
  });
});
