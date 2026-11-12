import { describe, expect, it } from 'vitest';
import type { TilesMeta } from '../ThreeMap/three-map-types.ts';
import { gateEnds } from './trackFlat.ts';

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

const point = (yaw: number, scaleY: number) => ({ coord: { x: -1_000_000, y: 0 }, yaw, scaleY });
const centre = (g: ReturnType<typeof gateEnds>) => [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2];
const span = (g: ReturnType<typeof gateEnds>) => [
  Math.abs(g.a[0] - g.b[0]),
  Math.abs(g.a[1] - g.b[1]),
];

describe('gateEnds', () => {
  it('is centred on the point and `scaleY` metres wide', () => {
    const gate = gateEnds(point(0.7, 12), meta);
    expect(Math.hypot(gate.a[0] - gate.b[0], gate.a[1] - gate.b[1])).toBeCloseTo(12, 6);
    const mid = centre(gate);
    const flat = gateEnds(point(0.7, 0), meta);
    expect(mid[0]).toBeCloseTo(flat.a[0], 6);
    expect(mid[1]).toBeCloseTo(flat.a[1], 6);
  });

  it('runs perpendicular to the heading', () => {
    // Facing east (yaw 0) the gate runs north-south; facing south (yaw 90deg) east-west.
    const east = span(gateEnds(point(0, 10), meta));
    expect(east[0]).toBeCloseTo(0, 6);
    expect(east[1]).toBeCloseTo(10, 6);
    const south = span(gateEnds(point(Math.PI / 2, 10), meta));
    expect(south[0]).toBeCloseTo(10, 6);
    expect(south[1]).toBeCloseTo(0, 6);
  });
});
