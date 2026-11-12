import { describe, expect, it } from 'vitest';
import { createPickGrid } from './pickGrid.ts';

interface Dot {
  id: number;
  x: number;
  y: number;
  r: number;
  rank: number;
}

/** What the grid replaces: scan every dot, keep the winner by rank then insertion order. */
function bruteForce(dots: Dot[], x: number, y: number): Dot | undefined {
  let best: Dot | undefined;
  for (const d of dots) {
    if ((d.x - x) ** 2 + (d.y - y) ** 2 > d.r * d.r) continue;
    if (!best || d.rank >= best.rank) best = d;
  }
  return best;
}

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function scatter(n: number, w: number, h: number, seed = 7): Dot[] {
  const rnd = seeded(seed);
  return Array.from({ length: n }, (_, id) => ({
    id,
    x: rnd() * w,
    y: rnd() * h,
    r: 6 + rnd() * 6,
    rank: Math.floor(rnd() * 4),
  }));
}

function build(dots: Dot[], w: number, h: number) {
  const grid = createPickGrid<Dot>(32);
  grid.reset(w, h);
  for (const d of dots) grid.add(d, d.x, d.y, d.r, d.rank);
  return grid;
}

describe('createPickGrid', () => {
  it('returns exactly what a full scan would, overlaps and ties included', () => {
    const dots = scatter(3000, 1000, 700);
    const grid = build(dots, 1000, 700);
    const rnd = seeded(99);
    for (let i = 0; i < 2000; i++) {
      const x = rnd() * 1000;
      const y = rnd() * 700;
      expect(grid.query(x, y)?.id).toBe(bruteForce(dots, x, y)?.id);
    }
  });

  it('lets the higher rank win an overlap and the later dot win a tie', () => {
    const grid = createPickGrid<string>(32);
    grid.reset(100, 100);
    grid.add('under', 50, 50, 10, 0);
    grid.add('over', 62, 50, 10, 1);
    grid.add('later-tie', 56, 50, 10, 1);
    expect(grid.query(57, 50)).toBe('later-tie');
    expect(grid.query(70, 50)).toBe('over');
    expect(grid.query(41, 50)).toBe('under');
    expect(grid.query(90, 90)).toBeUndefined();
  });

  it('keeps dots hanging off the canvas edge hittable and drops far-away ones', () => {
    const grid = createPickGrid<string>(32);
    grid.reset(100, 100);
    grid.add('edge', -4, 50, 10, 0);
    grid.add('far', -500, 50, 10, 0);
    grid.add('corner', 104, 104, 10, 0);
    expect(grid.query(2, 50)).toBe('edge');
    expect(grid.query(98, 98)).toBe('corner');
    expect(grid.query(-500, 50)).toBeUndefined();
  });

  it('is much faster than a full scan with 10k markers', () => {
    const dots = scatter(10_000, 1000, 700);
    const grid = build(dots, 1000, 700);
    const queries = Array.from({ length: 2000 }, (_, i) => [(i * 37) % 1000, (i * 91) % 700]);
    const time = (fn: (x: number, y: number) => unknown) => {
      const start = performance.now();
      for (const [x, y] of queries) fn(x, y);
      return performance.now() - start;
    };
    time((x, y) => grid.query(x, y)); // warm both paths
    time((x, y) => bruteForce(dots, x, y));
    expect(time((x, y) => grid.query(x, y)) * 10).toBeLessThan(
      time((x, y) => bruteForce(dots, x, y)),
    );
  });
});
