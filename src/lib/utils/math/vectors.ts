import type { Vector3 } from '$lib/types';

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
