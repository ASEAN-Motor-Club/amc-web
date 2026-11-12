import * as THREE from 'three';

/** A ring point in world XZ meters. */
export type XZ = [x: number, z: number];

/** An indexed triangle list over XZ points. */
export interface Triangulation {
  points: XZ[];
  /** Triples of indices into `points`. */
  indices: number[];
}

function dropClosingPoint(ring: XZ[]): XZ[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  return ring.length > 1 && first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring;
}

/**
 * Triangulates a polygon (outer ring plus optional holes, any winding, closing point optional)
 * into one indexed triangle list. Rings with fewer than three distinct points yield no triangles.
 */
export function triangulate(outer: XZ[], holes: XZ[][] = []): Triangulation {
  const contour = dropClosingPoint(outer);
  const cleanHoles = holes.map(dropClosingPoint).filter((hole) => hole.length >= 3);
  if (contour.length < 3) return { points: contour, indices: [] };
  const toVec = ([x, z]: XZ) => new THREE.Vector2(x, z);
  const faces = THREE.ShapeUtils.triangulateShape(
    contour.map(toVec),
    cleanHoles.map((h) => h.map(toVec)),
  );
  // triangulateShape indexes the contour first, then each hole in order.
  const points: XZ[] = [...contour, ...cleanHoles.flat()];
  return { points, indices: faces.flat() };
}

/**
 * Splits every triangle into four, `rounds` times, sharing edge midpoints so neighbouring
 * triangles stay watertight. Used to give flat triangles enough vertices to follow terrain.
 */
export function subdivide(tri: Triangulation, rounds: number): Triangulation {
  let { points, indices } = tri;
  for (let round = 0; round < rounds; round++) {
    const next = points.slice();
    const midpoints = new Map<number, number>();
    // Constant for the round (unlike next.length), so one edge always maps to one key.
    const stride = points.length;
    const mid = (a: number, b: number): number => {
      const key = a < b ? a * stride + b : b * stride + a;
      let index = midpoints.get(key);
      if (index === undefined) {
        index = next.length;
        next.push([(points[a][0] + points[b][0]) / 2, (points[a][1] + points[b][1]) / 2]);
        midpoints.set(key, index);
      }
      return index;
    };
    const out: number[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      out.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }
    points = next;
    indices = out;
  }
  return { points, indices };
}

/** Subdivision rounds so no triangle edge exceeds `maxEdge` meters, capped at `maxRounds`. */
export function roundsForMaxEdge(tri: Triangulation, maxEdge: number, maxRounds: number): number {
  let longest = 0;
  for (let i = 0; i < tri.indices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = tri.points[tri.indices[i + k]];
      const b = tri.points[tri.indices[i + ((k + 1) % 3)]];
      longest = Math.max(longest, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
  }
  return longest <= maxEdge ? 0 : Math.min(maxRounds, Math.ceil(Math.log2(longest / maxEdge)));
}

/**
 * Inserts points so no segment of the polyline exceeds `maxSegment` meters (so it can follow
 * terrain). `closed` also splits the closing edge from the last point back to the first; the
 * result then ends on the first point again, so it can be walked edge by edge.
 */
export function subdividePolyline(points: XZ[], maxSegment: number, closed = false): XZ[] {
  const source = closed ? [...dropClosingPoint(points), points[0]] : points;
  const out: XZ[] = [];
  for (let i = 0; i < source.length - 1; i++) {
    const [ax, az] = source[i];
    const [bx, bz] = source[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / maxSegment));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([ax + (bx - ax) * t, az + (bz - az) * t]);
    }
  }
  if (source.length > 0) out.push(source[source.length - 1]);
  return out;
}
