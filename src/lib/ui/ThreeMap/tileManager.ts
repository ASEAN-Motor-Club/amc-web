import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CACHE_MAX_ZOOM, MIN_RENDER_ZOOM } from './constants';
import { tileWorldRect } from './heightmap';
import { selectLeafTiles } from './lod';
import { fetchHeightTile, loadColorTexture, buildTileGeometry } from './tileGeometry';
import type { TilesMeta, ActiveTile } from './three-map-types';

export interface TileManager {
  tileGroup: THREE.Group;
  activeTiles: ReadonlyMap<string, ActiveTile>;
  updateVisibleTiles: () => void;
  /** Frees every cached texture and built geometry/material (GPU resources). */
  dispose: () => void;
}

interface DesiredTile {
  key: string;
  z: number;
  x: number;
  y: number;
  worldX0: number;
  worldZ0: number;
  tileSize: number;
}

interface CachedTile {
  z: number;
  x: number;
  y: number;
  rawHeights: Uint16Array;
  texture: THREE.Texture;
}

export function createTileManager(
  scene: THREE.Scene,
  meta: TilesMeta,
  renderer: Renderer,
  camera: THREE.Camera,
  controls: OrbitControls,
  signal: AbortSignal,
  loadingManager: THREE.LoadingManager,
): TileManager {
  const tileGroup = new THREE.Group();
  scene.add(tileGroup);

  const dataCache = new Map<string, CachedTile>();
  const loading = new Set<string>();

  const builtTiles = new Map<string, ActiveTile>();
  const activeTiles = new Map<string, ActiveTile>();

  function keyOf(z: number, x: number, y: number): string {
    return `${z}_${x}_${y}`;
  }

  async function loadTileData(z: number, x: number, y: number): Promise<void> {
    const key = keyOf(z, x, y);
    if (dataCache.has(key) || loading.has(key)) return;
    loading.add(key);
    try {
      const [rawHeights, texture] = await Promise.all([
        fetchHeightTile(z, x, y, signal),
        loadColorTexture(z, x, y, renderer, loadingManager),
      ]);
      dataCache.set(key, { z, x, y, rawHeights, texture });
    } catch (_err) {
      // Abort on dispose always rejects (fetch/image abort) - that is expected.
      if (!signal.aborted) throw _err;
    } finally {
      loading.delete(key);
    }
  }

  function ensureAncestorsCached(z: number, x: number, y: number): void {
    for (;;) {
      loadTileData(z, x, y);
      if (z <= MIN_RENDER_ZOOM) break;
      z--;
      x >>= 1;
      y >>= 1;
    }
  }

  function contains(
    outer: { worldX0: number; worldZ0: number; tileSize: number },
    inner: { worldX0: number; worldZ0: number; tileSize: number },
  ): boolean {
    const e = 1e-9;
    return (
      outer.worldX0 - e <= inner.worldX0 &&
      inner.worldX0 + inner.tileSize - e <= outer.worldX0 + outer.tileSize &&
      outer.worldZ0 - e <= inner.worldZ0 &&
      inner.worldZ0 + inner.tileSize - e <= outer.worldZ0 + outer.tileSize
    );
  }

  function computeFallbackCover(desired: DesiredTile[], desiredKeys: Set<string>): Set<string> {
    function containsDesiredDescendant(childZ: number, childX: number, childY: number): boolean {
      const cr = tileWorldRect(meta, childZ, childX, childY);
      return desired.some((d) => d.z >= childZ && contains(cr, d));
    }

    function choose(z: number, x: number, y: number): Set<string> {
      const key = keyOf(z, x, y);
      if (desiredKeys.has(key)) {
        return dataCache.has(key) ? new Set([key]) : new Set();
      }
      const children = new Set<string>();
      let allCovered = true;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const cz = z + 1;
          const cx = x * 2 + dx;
          const cy = y * 2 + dy;
          if (!containsDesiredDescendant(cz, cx, cy)) continue;
          const childCover = choose(cz, cx, cy);
          if (childCover.size === 0) allCovered = false;
          for (const k of childCover) children.add(k);
        }
      }
      if (allCovered) return children;
      if (dataCache.has(key)) return new Set([key]);
      return new Set();
    }

    return choose(0, 0, 0);
  }

  function buildTile(cached: CachedTile): ActiveTile {
    const { z, x, y, rawHeights, texture } = cached;
    const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, z, x, y);
    const geometry = buildTileGeometry(rawHeights, worldX0, worldZ0, tileSize);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    return { mesh, geometry, material, texture, z, x, y };
  }

  function mountTile(key: string): void {
    let tile = builtTiles.get(key);
    if (!tile) {
      const cached = dataCache.get(key);
      if (!cached) return;
      tile = buildTile(cached);
      builtTiles.set(key, tile);
    }
    tileGroup.add(tile.mesh);
    activeTiles.set(key, tile);
  }

  function unmountTile(tile: ActiveTile): void {
    tileGroup.remove(tile.mesh);
    const key = keyOf(tile.z, tile.x, tile.y);
    activeTiles.delete(key);
    if (tile.z > CACHE_MAX_ZOOM) {
      const cached = dataCache.get(key);
      if (cached) {
        cached.texture.dispose();
        dataCache.delete(key);
      }
      const built = builtTiles.get(key);
      if (built) {
        built.geometry.dispose();
        built.material.dispose();
        builtTiles.delete(key);
      }
    }
  }

  function updateVisibleTiles(): void {
    // 1. LOD: pick the leaf tiles the camera can see.
    const desired: DesiredTile[] = [];
    const desiredKeys = new Set<string>();
    for (const [z, x, y] of selectLeafTiles(camera, meta, controls.target)) {
      const key = keyOf(z, x, y);
      desiredKeys.add(key);
      desired.push({ key, z, x, y, ...tileWorldRect(meta, z, x, y) });
    }
    // 2. Cache: ensure the desired tiles and their ancestors have data, then compute
    // the best cover actually renderable right now.
    for (const { z, x, y } of desired) ensureAncestorsCached(z, x, y);
    const cover = computeFallbackCover(desired, desiredKeys);
    // 3. Generation: unmount what fell out of the cover, mount what entered it.
    for (const [key, tile] of [...activeTiles]) {
      if (!cover.has(key)) unmountTile(tile);
    }
    for (const key of cover) {
      if (!activeTiles.has(key)) mountTile(key);
    }
  }

  return {
    tileGroup,
    activeTiles,
    updateVisibleTiles,
    dispose() {
      // Every mounted tile's material shares its texture with the dataCache entry,
      // so textures go through dataCache (the superset) and geometry+material
      // through builtTiles - nothing is disposed twice, nothing is missed.
      for (const cached of dataCache.values()) cached.texture.dispose();
      for (const tile of builtTiles.values()) {
        tile.geometry.dispose();
        tile.material.dispose();
      }
      dataCache.clear();
      builtTiles.clear();
      activeTiles.clear();
    },
  };
}
