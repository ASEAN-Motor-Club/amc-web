import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { flatTileZoom, selectFlatTiles } from './flatTiles.ts';
import type { TilesMeta } from './three-map-types.ts';

const meta: TilesMeta = {
  widthMeters: 22000,
  heightMeters: 22000,
  originXMeters: -12800,
  originYMeters: -3200,
  maxZoom: 5,
  oceanLevelMeters: 0,
  minZ: 0,
  maxZ: 2000,
  tileInnerResolution: 44,
  tileSampleCount: 46,
};

/** An orthographic camera over (x, z) showing `halfW` x `halfH` meters, north up. */
function topDown(x: number, z: number, halfW: number, halfH: number): THREE.OrthographicCamera {
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH);
  camera.position.set(x, 1000, z);
  return camera;
}

describe('flatTileZoom', () => {
  it('rounds the view zoom and stays within the tile pyramid (OL min 2, colour max 5)', () => {
    expect(flatTileZoom(0.7)).toBe(2);
    expect(flatTileZoom(1.4)).toBe(2);
    expect(flatTileZoom(2.49)).toBe(2);
    expect(flatTileZoom(2.5)).toBe(3);
    expect(flatTileZoom(4.6)).toBe(5);
    expect(flatTileZoom(8)).toBe(5);
  });
});

describe('selectFlatTiles', () => {
  it('covers the view with the tiles it touches, edges inclusive of partial tiles', () => {
    // z2 is a 4x4 grid of 5500 m tiles; world x/z run -11000..11000.
    const tiles = selectFlatTiles(topDown(0, 0, 2000, 2000), meta, 2);
    // A 4 km square around the centre straddles the middle seam on both axes: the four middle tiles.
    expect(tiles).toEqual([
      [2, 1, 1],
      [2, 2, 1],
      [2, 1, 2],
      [2, 2, 2],
    ]);
  });

  it('keeps north up: a view shifted north (-Z) selects the upper rows', () => {
    const tiles = selectFlatTiles(topDown(0, -8000, 1000, 1000), meta, 2);
    expect(new Set(tiles.map(([, , y]) => y))).toEqual(new Set([0]));
  });

  it('clamps to the map: a view hanging off the edge yields only real tiles', () => {
    const tiles = selectFlatTiles(topDown(-30000, 0, 5000, 5000), meta, 2);
    expect(tiles).toEqual([]);
    const edge = selectFlatTiles(topDown(-10000, 0, 3000, 1000), meta, 2);
    expect(new Set(edge.map(([, x]) => x))).toEqual(new Set([0]));
  });

  it('covers the whole map when zoomed out past it', () => {
    expect(selectFlatTiles(topDown(0, 0, 40000, 40000), meta, 3)).toHaveLength(64);
  });

  it('honours the camera zoom', () => {
    const camera = topDown(0, 0, 8000, 8000);
    camera.zoom = 4; // shows a 4 km square
    expect(selectFlatTiles(camera, meta, 2)).toHaveLength(4);
  });
});
