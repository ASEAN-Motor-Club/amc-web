/**
 * Screen-space hash grid for hit-testing circles (marker dots) under a pointer in O(cells hit)
 * instead of O(markers): the dots are laid out once per camera/marker change, queries are lookups.
 *
 * All coordinates are CSS px relative to the canvas, y down. Circles must be no wider than one
 * cell (the caller picks `cellSize` >= the largest hit diameter), so a query only has to look at
 * the 3x3 block around the pointer.
 */
export interface PickGrid<T> {
  /** Forgets every circle and re-bounds the grid to a canvas of this CSS size. */
  reset: (width: number, height: number) => void;
  /** Registers a circle. Off-canvas circles (beyond one radius) are dropped. `rank` orders overlaps:
   * the highest rank under the pointer wins, later additions win ties (draw order). */
  add: (item: T, x: number, y: number, radius: number, rank: number) => void;
  /** The winning item whose circle contains the point, or undefined. */
  query: (x: number, y: number) => T | undefined;
}

export function createPickGrid<T>(cellSize: number): PickGrid<T> {
  let cols = 0;
  let rows = 0;
  let heads = new Int32Array(0);
  let items: T[] = [];
  let xs = new Float32Array(0);
  let ys = new Float32Array(0);
  let radii = new Float32Array(0);
  let ranks = new Float32Array(0);
  let next = new Int32Array(0);
  let count = 0;

  function grow(needed: number): void {
    if (needed <= xs.length) return;
    const size = Math.max(needed, xs.length * 2, 256);
    const copy = <A extends Float32Array | Int32Array>(old: A, ctor: new (n: number) => A): A => {
      const fresh = new ctor(size);
      fresh.set(old);
      return fresh;
    };
    xs = copy(xs, Float32Array);
    ys = copy(ys, Float32Array);
    radii = copy(radii, Float32Array);
    ranks = copy(ranks, Float32Array);
    next = copy(next, Int32Array);
  }

  return {
    reset(width, height) {
      cols = Math.max(1, Math.ceil(width / cellSize));
      rows = Math.max(1, Math.ceil(height / cellSize));
      if (heads.length < cols * rows) heads = new Int32Array(cols * rows);
      heads.fill(-1, 0, cols * rows);
      items = [];
      count = 0;
    },

    add(item, x, y, radius, rank) {
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      // A circle centred a cell outside the canvas can still reach in: keep it in the edge cell.
      if (cx < -1 || cy < -1 || cx > cols || cy > rows) return;
      const col = Math.min(Math.max(cx, 0), cols - 1);
      const row = Math.min(Math.max(cy, 0), rows - 1);
      grow(count + 1);
      const slot = count++;
      items[slot] = item;
      xs[slot] = x;
      ys[slot] = y;
      radii[slot] = radius;
      ranks[slot] = rank;
      const cell = row * cols + col;
      next[slot] = heads[cell];
      heads[cell] = slot;
    },

    query(x, y) {
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      let best = -1;
      for (let row = Math.max(cy - 1, 0); row <= Math.min(cy + 1, rows - 1); row++) {
        for (let col = Math.max(cx - 1, 0); col <= Math.min(cx + 1, cols - 1); col++) {
          for (let slot = heads[row * cols + col]; slot !== -1; slot = next[slot]) {
            const dx = xs[slot] - x;
            const dy = ys[slot] - y;
            const r = radii[slot];
            if (dx * dx + dy * dy > r * r) continue;
            if (
              best === -1 ||
              ranks[slot] > ranks[best] ||
              (ranks[slot] === ranks[best] && slot > best)
            ) {
              best = slot;
            }
          }
        }
      }
      return best === -1 ? undefined : items[best];
    },
  };
}
