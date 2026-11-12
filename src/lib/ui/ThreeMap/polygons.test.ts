import { describe, expect, it } from 'vitest';
import {
  roundsForMaxEdge,
  subdivide,
  subdividePolyline,
  triangulate,
  type Triangulation,
  type XZ,
} from './polygons.ts';

const area = ({ points, indices }: Triangulation): number => {
  let total = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [points[indices[i]], points[indices[i + 1]], points[indices[i + 2]]];
    total += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  }
  return total;
};

const square = (size: number, x = 0, z = 0): XZ[] => [
  [x, z],
  [x + size, z],
  [x + size, z + size],
  [x, z + size],
];

describe('triangulate', () => {
  it('covers a square exactly with two triangles', () => {
    const t = triangulate(square(10));
    expect(t.indices).toHaveLength(6);
    expect(area(t)).toBeCloseTo(100);
  });

  it('accepts a repeated closing point and either winding', () => {
    const ring = square(10);
    expect(area(triangulate([...ring, ring[0]]))).toBeCloseTo(100);
    expect(area(triangulate([...ring].reverse()))).toBeCloseTo(100);
  });

  it('keeps a concave outline concave (L shape)', () => {
    const l: XZ[] = [
      [0, 0],
      [20, 0],
      [20, 10],
      [10, 10],
      [10, 20],
      [0, 20],
    ];
    expect(area(triangulate(l))).toBeCloseTo(300);
  });

  it('cuts holes out of the fill', () => {
    const t = triangulate(square(100), [square(20, 40, 40)]);
    expect(area(t)).toBeCloseTo(100 * 100 - 20 * 20);
    // Hole vertices follow the outer ring in the point list.
    expect(t.points).toHaveLength(8);
  });

  it('returns nothing for a degenerate ring', () => {
    expect(
      triangulate([
        [0, 0],
        [1, 1],
      ]).indices,
    ).toEqual([]);
  });
});

describe('subdivide', () => {
  it('quadruples the triangles, keeps the area and shares edge midpoints', () => {
    const base = triangulate(square(100));
    const fine = subdivide(base, 2);
    expect(fine.indices.length / 3).toBe((base.indices.length / 3) * 16);
    expect(area(fine)).toBeCloseTo(100 * 100);
    // Welded: an edge shared by two triangles yields one midpoint, never two coincident ones.
    const unique = new Set(fine.points.map(([x, z]) => `${x},${z}`));
    expect(unique.size).toBe(fine.points.length);
  });

  it('is the identity for zero rounds', () => {
    const base = triangulate(square(10));
    expect(subdivide(base, 0)).toEqual(base);
  });
});

describe('roundsForMaxEdge', () => {
  it('halves the longest edge until it fits, up to the cap', () => {
    const t = triangulate(square(1000)); // diagonal edge ~1414 m
    expect(roundsForMaxEdge(t, 2000, 5)).toBe(0);
    expect(roundsForMaxEdge(t, 400, 5)).toBe(2);
    expect(roundsForMaxEdge(t, 1, 3)).toBe(3);
  });
});

describe('subdividePolyline', () => {
  it('splits long segments and keeps the end points', () => {
    const out = subdividePolyline(
      [
        [0, 0],
        [1000, 0],
      ],
      300,
    );
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([1000, 0]);
    expect(out).toHaveLength(5);
    for (let i = 1; i < out.length; i++) {
      expect(Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1])).toBeLessThanOrEqual(
        300,
      );
    }
  });

  it('closes a ring back on its first point, split too', () => {
    const out = subdividePolyline(square(1000), 500, true);
    expect(out[0]).toEqual(out[out.length - 1]);
    expect(out).toHaveLength(4 * 2 + 1);
  });
});
