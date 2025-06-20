export function normalizedRotation(rad: number): number {
  const r = rad % (2 * Math.PI);
  if (r <= -Math.PI) {
    return r + 2 * Math.PI;
  } else if (r > Math.PI) {
    return r - 2 * Math.PI;
  }
  return r;
}
