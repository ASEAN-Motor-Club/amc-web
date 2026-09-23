import type { Vector2, Vector3 } from '$lib/types';

/** Squared planar distance between two points. Compare against squared thresholds —
 * sqrt-free, an order of magnitude faster than hypot for pure comparisons. */
export function dist2DSq(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

export function orientation2D(from: Vector3, to: Vector3): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.atan2(dy, dx);
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
