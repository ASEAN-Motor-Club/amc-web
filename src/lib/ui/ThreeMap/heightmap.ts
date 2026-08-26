import tilesJson from '$lib/assets/data/tiles.json';
import type { RawTilesJson, TilesMeta } from './three-map-types';

const raw = tilesJson as unknown as RawTilesJson;

export const TILES_META: TilesMeta = {
  widthMeters: raw.widthCm / 100,
  heightMeters: raw.heightCm / 100,
  originXMeters: raw.originXCm / 100,
  originYMeters: raw.originYCm / 100,
  maxZoom: raw.maxZoom,
  oceanLevelMeters: raw.oceanLevelCm === null ? null : raw.oceanLevelCm / 100,
  minZ: raw.minZ / 100,
  maxZ: raw.maxZ / 100,
  tileInnerResolution: raw.tileInnerResolution,
  tileSampleCount: raw.tileSampleCount,
};

export function tileWorldRect(meta: TilesMeta, z: number, x: number, y: number) {
  const grid = 1 << z;
  const tileSize = meta.widthMeters / grid;
  const worldX0 = -meta.widthMeters / 2 + x * tileSize;
  const worldZ0 = -meta.heightMeters / 2 + y * tileSize;
  return { worldX0, worldZ0, tileSize };
}

export function rawHeightToWorldZMeters(rawHeight: number): number {
  return (rawHeight - 32768) / 128.0;
}
