import { PUBLIC_API_BASE } from '$env/static/public';

export interface TerrainHeightResponse {
  /** Terrain height at the requested location, in game Z centimeters. */
  z_cm: number;
}

/**
 * Terrain height (game Z, cm) at world X/Y from the backend's full-resolution
 * heightmap, or null when the location is outside the mapped area or no heightmap
 * is deployed. Imperative (not a TanStack Query): the track editor calls it from the
 * snap-to-ground button at the moment the user asks for it.
 */
export async function fetchTerrainZcm(
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<number | null> {
  const params = new URLSearchParams({ x: String(x), y: String(y) });
  const response = await fetch(
    `${PUBLIC_API_BASE}/api/tracks/terrain-height/?${params.toString()}`,
    { signal },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as TerrainHeightResponse;
  return data.z_cm;
}
