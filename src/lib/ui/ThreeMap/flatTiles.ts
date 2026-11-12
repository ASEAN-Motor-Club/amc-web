import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { clamp, pow, texture, vec3, vec4 } from 'three/tsl';
import {
  COLOR_MAX_ZOOM,
  FLAT_MIN_TILE_ZOOM,
  FLAT_TILE_EXPOSURE,
  FLAT_TILE_GAMMA,
  FLAT_TILE_RENDER_ORDER,
} from './constants.ts';
import { tileWorldRect } from './heightmap.ts';
import type { LeafTile, TilesMeta } from './three-map-types.ts';

/**
 * The tile zoom the 2D view draws at: the nearest whole zoom to the view's fractional zoom, within
 * the tile pyramid's colour range - what OL's tile source picks (`zDirection` 0, source min/max
 * zoom). Finer views just magnify the deepest tiles.
 */
export function flatTileZoom(viewZoom: number): number {
  return Math.min(Math.max(Math.round(viewZoom), FLAT_MIN_TILE_ZOOM), COLOR_MAX_ZOOM);
}

/**
 * The tiles of zoom `z` that intersect the orthographic camera's view of the ground: a plain
 * rectangle cover - no rings, no altitude cap. The view is axis-aligned (north up), so the visible
 * world rect is the camera position plus the frustum extents.
 */
export function selectFlatTiles(
  camera: THREE.OrthographicCamera,
  meta: TilesMeta,
  z: number,
): LeafTile[] {
  const grid = 1 << z;
  const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, z, 0, 0);
  // Screen-up is -Z: the frustum's top edge is the smaller z.
  const minX = camera.position.x + camera.left / camera.zoom;
  const maxX = camera.position.x + camera.right / camera.zoom;
  const minZ = camera.position.z - camera.top / camera.zoom;
  const maxZ = camera.position.z - camera.bottom / camera.zoom;
  const range = (min: number, max: number, origin: number): [number, number] => [
    Math.max(0, Math.floor((min - origin) / tileSize)),
    Math.min(grid - 1, Math.floor((max - origin) / tileSize)),
  ];
  const [x0, x1] = range(minX, maxX, worldX0);
  const [y0, y1] = range(minZ, maxZ, worldZ0);
  const tiles: LeafTile[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push([z, x, y]);
  return tiles;
}

/** One unit square on the ground plane (0..1 in X and Z, facing up) with UVs matching the colour
 * textures (north / -Z edge is the image top, `flipY` false). Scaled per tile. */
function createUnitTileGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1]), 3),
  );
  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2),
  );
  geometry.setIndex([0, 2, 3, 0, 3, 1]);
  return geometry;
}

export interface FlatTileFactory {
  /** A ground-plane mesh for one tile; the texture is sampled raw (see `FLAT_TILE_*`). */
  build: (
    texture: THREE.Texture,
    z: number,
    x: number,
    y: number,
  ) => {
    mesh: THREE.Mesh;
    material: MeshBasicNodeMaterial;
  };
  dispose: () => void;
}

/**
 * Builds flat tiles. The material is unlit and untone-mapped and reproduces OL's tile colour
 * pipeline exactly: the AVIF bytes are read raw (no sRGB decode), brightened by `(exposure + 1)`,
 * clamped, gamma-corrected, and written to the canvas as-is - the flat scene is display-referred
 * (`renderer.outputColorSpace` is linear, so there is no output conversion).
 */
export function createFlatTileFactory(meta: TilesMeta): FlatTileFactory {
  const geometry = createUnitTileGeometry();
  return {
    build(map, z, x, y) {
      const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, z, x, y);
      const raw = texture(map);
      const graded = pow(
        clamp(raw.rgb.mul(FLAT_TILE_EXPOSURE + 1), 0, 1),
        vec3(1 / FLAT_TILE_GAMMA),
      );
      const material = new MeshBasicNodeMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      });
      // Display-referred scene: the graded sRGB numbers go to the canvas as they are.
      material.colorNode = vec4(graded, raw.a);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(tileSize, 1, tileSize);
      mesh.position.set(worldX0, 0, worldZ0);
      mesh.renderOrder = FLAT_TILE_RENDER_ORDER;
      // Static, cheap geometry: skip per-frame matrix recomputation and frustum tests.
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.frustumCulled = false;
      return { mesh, material };
    },
    dispose() {
      geometry.dispose();
    },
  };
}
