import { describe, expect, it } from 'vitest';
import {
  areaBoundaries,
  areaNameFontSize,
  getLocationAtPoint,
  getLocationNearPoint,
  isInMapBound,
} from './area';
import areaVolume from '$lib/assets/data/out_area_volume.json';

const vertexKey = (p: { x: number; y: number }) => `${p.x},${p.y}`;

describe('areaBoundaries', () => {
  it('covers every area in the source data', () => {
    expect(areaBoundaries).toHaveLength(areaVolume.length);
  });

  it('reconstructs each area into a closed ring of distinct points', () => {
    for (const boundary of areaBoundaries) {
      expect(boundary.ring.length, boundary.name.en).toBeGreaterThanOrEqual(3);
      // Closed: first point repeated as the last
      expect(boundary.ring[0], boundary.name.en).toEqual(boundary.ring[boundary.ring.length - 1]);
      // No repeated points inside the ring
      const keys = boundary.ring.slice(0, -1).map((p) => `${p[0]},${p[1]}`);
      expect(new Set(keys).size, boundary.name.en).toBe(keys.length);
    }
  });

  it('uses only edges from the source vertex pairs', () => {
    areaBoundaries.forEach((boundary, index) => {
      const area = areaVolume[index];
      const edgeKeys = new Set<string>();
      for (let i = 0; i < area.vertex.length; i += 2) {
        const a = vertexKey(area.vertex[i]);
        const b = vertexKey(area.vertex[i + 1]);
        edgeKeys.add(`${a}->${b}`);
        edgeKeys.add(`${b}->${a}`);
      }
      for (let i = 0; i < boundary.ring.length - 1; i++) {
        const a = `${boundary.ring[i][0]},${boundary.ring[i][1]}`;
        const b = `${boundary.ring[i + 1][0]},${boundary.ring[i + 1][1]}`;
        expect(edgeKeys.has(`${a}->${b}`), `${boundary.name.en} edge ${i}`).toBe(true);
      }
    });
  });
});

describe('location helpers', () => {
  it('isInMapBound accepts points inside the world extent and rejects outside', () => {
    expect(isInMapBound({ x: 0, y: 900000 })).toBe(true);
    expect(isInMapBound({ x: 1000000, y: 0 })).toBe(false);
    expect(isInMapBound({ x: 0, y: -400000 })).toBe(false);
  });

  it('getLocationAtPoint returns the containing area names in flag order, or null', () => {
    // Inside Jocheon Old Mansion (SmallArea) and Jeju (Zone)
    expect(getLocationAtPoint({ x: 100000, y: -100000 })?.map((name) => name.en)).toEqual([
      'Jocheon Old Mansion',
      'Jeju',
    ]);
    // Inside Gapa only
    expect(getLocationAtPoint({ x: 0, y: 900000 })?.map((name) => name.en)).toEqual(['Gapa']);
    // No area contains the point
    expect(getLocationAtPoint({ x: 500000, y: -100000 })).toBeNull();
  });

  it('getLocationNearPoint returns the closest zone', () => {
    expect(getLocationNearPoint({ x: 500000, y: -100000 }).en).toBe('Seongsan');
  });
});

describe('areaNameFontSize', () => {
  it('sizes Zone the largest, LargeArea/SmallArea mid, empty/RaceTrack the smallest', () => {
    const size = (flag: string) => areaNameFontSize[flag];
    expect(size('Zone')).toBe('1rem');
    expect(size('LargeArea')).toBe(size('SmallArea'));
    expect(size('')).toBe(size('RaceTrack'));
    // Zone text must be bigger than the mid tier, the mid tier bigger than the smallest
    const toPx = (v: string) => parseFloat(v);
    expect(toPx(size('Zone'))).toBeGreaterThan(toPx(size('LargeArea')));
    expect(toPx(size('LargeArea'))).toBeGreaterThan(toPx(size('RaceTrack')));
  });

  it('has a size for every flag present in the data', () => {
    const flags = new Set(areaVolume.map((a) => a.flag));
    for (const flag of flags) {
      expect(areaNameFontSize[flag], flag).toBeDefined();
    }
  });
});
