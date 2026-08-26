import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CACHE_MAX_ZOOM, MIN_RENDER_ZOOM, ZOOM_DEBUG_COLORS } from './constants';
import { tileWorldRect } from './heightmap';
import { selectLeafTiles } from './lod';
import { fetchHeightTile, loadColorTexture, buildTileGeometry } from './tileGeometry';
import type { TilesMeta, ActiveTile, LeafTile } from './three-map-types';

export interface TileManager {
  tileGroup: THREE.Group;
  activeTiles: ReadonlyMap<string, ActiveTile>;
  updateVisibleTiles: () => void;
  setZoomDebug: (enabled: boolean) => void;
  setWireframe: (enabled: boolean) => void;
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

interface TickContext {
  desired: DesiredTile[];
  desiredKeys: Set<string>;
  cover: Set<string>;
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

  const debugMaterials = ZOOM_DEBUG_COLORS.map(
    (color) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, wireframe: false }),
  );
  let showZoomDebug = false;
  let wireframeEnabled = false;

  const dataCache = new Map<string, CachedTile>();
  const loading = new Set<string>();

  const builtTiles = new Map<string, ActiveTile>();
  const activeTiles = new Map<string, ActiveTile>();

  function keyOf(z: number, x: number, y: number): string {
    return `${z}_${x}_${y}`;
  }

  function runLodStage(tick: TickContext): void {
    const leaves: LeafTile[] = selectLeafTiles(camera, meta, controls.target);
    for (const [z, x, y] of leaves) {
      const key = keyOf(z, x, y);
      tick.desiredKeys.add(key);
      tick.desired.push({ key, z, x, y, ...tileWorldRect(meta, z, x, y) });
    }
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
    const cover = new Set<string>();

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

    const root = choose(0, 0, 0);
    for (const k of root) cover.add(k);
    return cover;
  }

  function runLoadCacheStage(tick: TickContext): void {
    for (const { z, x, y } of tick.desired) ensureAncestorsCached(z, x, y);
    tick.cover = computeFallbackCover(tick.desired, tick.desiredKeys);
  }

  function buildTile(cached: CachedTile): ActiveTile {
    const { z, x, y, rawHeights, texture } = cached;
    const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, z, x, y);
    const { geometry } = buildTileGeometry(rawHeights, worldX0, worldZ0, tileSize);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
      wireframe: wireframeEnabled,
    });
    const mesh = new THREE.Mesh(geometry, showZoomDebug ? debugMaterials[z] : material);
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
    tile.mesh.material = showZoomDebug ? debugMaterials[tile.z] : tile.material;
    tile.material.wireframe = wireframeEnabled;
    tileGroup.add(tile.mesh);
    activeTiles.set(key, tile);
  }

  function unmountTile(tile: ActiveTile): void {
    tileGroup.remove(tile.mesh);
    activeTiles.delete(keyOf(tile.z, tile.x, tile.y));
    const key = keyOf(tile.z, tile.x, tile.y);
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

  function runGenerationStage(tick: TickContext): void {
    for (const [key, tile] of [...activeTiles]) {
      if (!tick.cover.has(key)) unmountTile(tile);
    }
    for (const key of tick.cover) {
      if (!activeTiles.has(key)) mountTile(key);
    }
  }

  function updateVisibleTiles(): void {
    const tick: TickContext = { desired: [], desiredKeys: new Set(), cover: new Set() };
    runLodStage(tick);
    runLoadCacheStage(tick);
    runGenerationStage(tick);
  }

  return {
    tileGroup,
    activeTiles,
    updateVisibleTiles,
    setZoomDebug(enabled: boolean) {
      showZoomDebug = enabled;
      for (const tile of activeTiles.values()) {
        tile.mesh.material = showZoomDebug ? debugMaterials[tile.z] : tile.material;
      }
      for (const tile of builtTiles.values()) {
        tile.mesh.material = showZoomDebug ? debugMaterials[tile.z] : tile.material;
      }
    },
    setWireframe(enabled: boolean) {
      wireframeEnabled = enabled;
      for (const material of debugMaterials) material.wireframe = wireframeEnabled;
      for (const tile of builtTiles.values()) tile.material.wireframe = wireframeEnabled;
    },
  };
}
