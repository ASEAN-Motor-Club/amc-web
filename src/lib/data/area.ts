import type { MtNameRecord, Vector2 } from '$lib/types';
import areaVolume from '$lib/assets/data/out_area_volume.json';
import { getMtLocale } from '$lib/utils/getMtLocale';
import { m } from '$messages';

const flagOrder = {
  '': 0,
  RaceTrack: 1,
  SmallArea: 2,
  LargeArea: 3,
  Zone: 4,
} as Record<string, number>;

// Precompute bounding boxes for all areas
const areaVolumeWithBBox = areaVolume.map((area) => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const v of area.vertex) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  return { ...area, order: flagOrder[area.flag], box: { minX, minY, maxX, maxY } };
});

export const getLocationAtPoint = (point: Vector2) => {
  const matchArea: typeof areaVolumeWithBBox = [];

  for (const area of areaVolumeWithBBox) {
    const inBoundingBox =
      point.x >= area.box.minX &&
      point.x <= area.box.maxX &&
      point.y >= area.box.minY &&
      point.y <= area.box.maxY;
    if (!inBoundingBox) continue;

    let count = 0;
    for (let i = 0; i < area.vertex.length; i += 2) {
      const a = area.vertex[i];
      const b = area.vertex[i + 1];
      const y1 = a.y;
      const y2 = b.y;
      const x1 = a.x;
      const x2 = b.x;
      if (y1 > point.y !== y2 > point.y) {
        const intersect = x1 + ((point.y - y1) * (x2 - x1)) / (y2 - y1);
        if (intersect > point.x) {
          count += 1;
        }
      }
    }
    if (count % 2 === 1) {
      matchArea.push(area);
    }
  }

  matchArea.sort((a, b) => a.order - b.order);
  return matchArea.map((area) => getMtLocale(area.name)).join(', ') || m.unknown_location();
};

/** Font size for area name labels per flag: Zone is the biggest, unspecified and RaceTrack the smallest */
export const areaNameFontSize: Record<string, string> = {
  Zone: '1rem',
  LargeArea: '0.75rem',
  SmallArea: '0.75rem',
  '': '0.6rem',
  RaceTrack: '0.6rem',
};

export interface AreaBoundary {
  name: MtNameRecord;
  flag: string;
  /** Closed polygon ring in game coordinates (first point repeated at the end) */
  ring: [x: number, y: number][];
}

/**
 * The vertex data is a shuffled list of 2-point segments. Chain the segments
 * by their shared endpoints back into one closed ring.
 */
const buildRing = (vertex: Vector2[]): [x: number, y: number][] => {
  const next = new Map<string, Vector2>();
  for (let i = 0; i < vertex.length; i += 2) {
    const a = vertex[i];
    const b = vertex[i + 1];
    if (a.x === b.x && a.y === b.y) continue;
    next.set(`${a.x},${a.y}`, b);
  }

  const start = next.keys().next().value;
  if (start === undefined) return [];

  const ring: [x: number, y: number][] = [];
  const [sx, sy] = start.split(',').map(Number);
  ring.push([sx, sy]);
  let cur = start;
  do {
    const p = next.get(cur);
    // Malformed data: stop instead of looping forever
    if (!p) break;
    ring.push([p.x, p.y]);
    cur = `${p.x},${p.y}`;
  } while (cur !== start);
  return ring;
};

export const areaBoundaries: AreaBoundary[] = areaVolume.map((area) => ({
  name: area.name,
  flag: area.flag,
  ring: buildRing(area.vertex),
}));
