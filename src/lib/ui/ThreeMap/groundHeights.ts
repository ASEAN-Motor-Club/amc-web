import { rawHeightToWorldZMeters, tileWorldRect } from './heightmap';
import type { TilesMeta } from './three-map-types';
import { fetchHeightTile } from './tileGeometry';

export interface GroundHeights {
  /**
   * Ground height (world meters, y-up) at world (x, z) from the given zoom's tile
   * pyramid, bilinearly sampled. Returns null while the tile's data is still loading -
   * the fetch is kicked automatically, so re-sample on a later frame. Never throws.
   */
  sample: (x: number, z: number, zoom: number) => number | null;
  /** Finest zoom whose tile grid keeps a bbox within maxTiles tiles (bounds fetches). */
  zoomForBox: (minX: number, minZ: number, maxX: number, maxZ: number, maxTiles: number) => number;
  dispose: () => void;
}

/** Tile indices covering a world point at a zoom, or null off the map. */
function tileAt(meta: TilesMeta, x: number, z: number, zoom: number) {
  const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, zoom, 0, 0);
  const grid = 1 << zoom;
  const tx = Math.floor((x - worldX0) / tileSize);
  const ty = Math.floor((z - worldZ0) / tileSize);
  if (tx < 0 || ty < 0 || tx >= grid || ty >= grid) return null;
  return { tx, ty };
}

/**
 * Owns height-tile fetches for the ground overlays (delivery lines, shortcut zones, area
 * labels) - separate from tileManager's cache, which evicts fine tiles outside the camera
 * ring and only loads what the LOD needs. Overlays live in fixed places, so their tiles
 * stay cached here for the scene's lifetime; the shared abort signal cancels in-flight
 * fetches on dispose.
 */
export function createGroundHeights(meta: TilesMeta, signal: AbortSignal): GroundHeights {
  const cache = new Map<string, Uint16Array>();
  const inFlight = new Set<string>();

  function requestTile(zoom: number, tx: number, ty: number): void {
    const key = `${zoom}_${tx}_${ty}`;
    if (cache.has(key) || inFlight.has(key)) return;
    inFlight.add(key);
    fetchHeightTile(zoom, tx, ty, signal)
      .then((heights) => {
        cache.set(key, heights);
      })
      .catch(() => {
        // Aborted (dispose) or failed to fetch - allow a retry on a later sample call.
      })
      .finally(() => {
        inFlight.delete(key);
      });
  }

  return {
    sample(x, z, zoom) {
      const tile = tileAt(meta, x, z, zoom);
      if (!tile) return null;
      requestTile(zoom, tile.tx, tile.ty);
      const heights = cache.get(`${zoom}_${tile.tx}_${tile.ty}`);
      if (!heights) return null;

      const haloSize = Math.round(Math.sqrt(heights.length));
      const innerSize = haloSize - 2;
      const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, zoom, tile.tx, tile.ty);
      // Continuous inner-sample coordinates; buildTileGeometry maps u∈[0,1] to halo
      // index u*(innerSize-1)+1, so the halo cell around a sample spans [x0+1, x0+2].
      const fx = Math.min(Math.max((x - worldX0) / tileSize, 0), 1) * (innerSize - 1);
      const fz = Math.min(Math.max((z - worldZ0) / tileSize, 0), 1) * (innerSize - 1);
      const x0 = Math.floor(fx);
      const z0 = Math.floor(fz);
      const ax = fx - x0;
      const az = fz - z0;
      const at = (hx: number, hz: number) => rawHeightToWorldZMeters(heights[hz * haloSize + hx]);
      const top = at(x0 + 1, z0 + 1) * (1 - ax) + at(x0 + 2, z0 + 1) * ax;
      const bottom = at(x0 + 1, z0 + 2) * (1 - ax) + at(x0 + 2, z0 + 2) * ax;
      return top * (1 - az) + bottom * az;
    },

    zoomForBox(minX, minZ, maxX, maxZ, maxTiles) {
      for (let zoom = meta.maxZoom; zoom > 0; zoom--) {
        const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, zoom, 0, 0);
        const tx0 = Math.floor((minX - worldX0) / tileSize);
        const tx1 = Math.floor((maxX - worldX0) / tileSize);
        const tz0 = Math.floor((minZ - worldZ0) / tileSize);
        const tz1 = Math.floor((maxZ - worldZ0) / tileSize);
        if ((tx1 - tx0 + 1) * (tz1 - tz0 + 1) <= maxTiles) return zoom;
      }
      return 0;
    },

    dispose() {
      // Raw arrays only - no GPU resources; the shared abort signal kills fetches.
      cache.clear();
      inFlight.clear();
    },
  };
}
