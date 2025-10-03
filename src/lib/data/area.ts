import type { Vector2 } from '$lib/types';
import areaVolume from '$lib/assets/data/out_area_volume.json';
import { getMtLocale } from '$lib/utils/getMtLocale';

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
  return matchArea.map((area) => getMtLocale(area.name)).join(', ');
};
