import type { TeleportResponse } from '$lib/api/teleport';
import type { TeleportPoint } from './types';

/**
 * Collapses teleport points sharing the exact same coordinate into a single point:
 * the longest name wins as the main point, the others become its aliases.
 * Ties keep the earlier name as the main one.
 */
export const mergeTeleportPoints = (data: TeleportResponse): TeleportPoint[] => {
  const points: TeleportPoint[] = [];
  const pointByCoord = new Map<string, TeleportPoint>();

  for (const { name, x, y, z } of data) {
    const coordKey = `${x},${y},${z}`;
    const existing = pointByCoord.get(coordKey);
    if (existing) {
      if (name === existing.name || existing.aliases?.includes(name)) continue;
      if (name.length > existing.name.length) {
        (existing.aliases ??= []).push(existing.name);
        existing.name = name;
      } else {
        (existing.aliases ??= []).push(name);
      }
      continue;
    }
    const point: TeleportPoint = { name, coord: { x, y, z } };
    pointByCoord.set(coordKey, point);
    points.push(point);
  }

  return points;
};
