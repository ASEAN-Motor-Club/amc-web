import * as THREE from 'three';
import {
  ALTITUDE_CAP_FULL,
  ALTITUDE_CAP_MIN,
  MIN_RENDER_ZOOM,
  RING_EXTENT_COARSER_MULTIPLIER,
  RING_EXTENT_FINEST_MULTIPLIER,
} from './constants';
import { tileWorldRect } from './heightmap';
import type { TilesMeta, RingExtents, LeafTile } from './three-map-types';

export function computeRingExtents(
  camera: THREE.Camera,
  meta: TilesMeta,
  orbitTarget: THREE.Vector3,
): RingExtents {
  const altAboveOcean = camera.position.y - (meta.oceanLevelMeters ?? 0);
  const altFrac = THREE.MathUtils.clamp(
    (altAboveOcean - ALTITUDE_CAP_MIN) / (ALTITUDE_CAP_FULL - ALTITUDE_CAP_MIN),
    0,
    1,
  );
  const maxZoomByAltitude = Math.max(
    MIN_RENDER_ZOOM,
    Math.round(MIN_RENDER_ZOOM + (meta.maxZoom - MIN_RENDER_ZOOM) * (1 - altFrac)),
  );

  const finestGrid = 1 << maxZoomByAltitude;
  const cellSize = meta.widthMeters / finestGrid;
  const orbitCX = (orbitTarget.x + meta.widthMeters / 2) / cellSize;
  const orbitCY = (orbitTarget.z + meta.heightMeters / 2) / cellSize;

  const ringExtent: number[] = new Array(maxZoomByAltitude + 1);
  for (let z = MIN_RENDER_ZOOM; z <= maxZoomByAltitude; z++) {
    const tileSideCells = 1 << (maxZoomByAltitude - z);
    const diameterFactor =
      z === maxZoomByAltitude ? RING_EXTENT_FINEST_MULTIPLIER : RING_EXTENT_COARSER_MULTIPLIER;
    ringExtent[z] = (diameterFactor / 2) * tileSideCells;
  }

  return { maxZoomByAltitude, cellSize, orbitCX, orbitCY, ringExtent };
}

export function selectLeafTiles(
  camera: THREE.Camera,
  meta: TilesMeta,
  orbitTarget: THREE.Vector3,
): LeafTile[] {
  camera.updateMatrixWorld();
  const viewProjMatrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const frustum = new THREE.Frustum().setFromProjectionMatrix(viewProjMatrix);
  const minY = Math.min(meta.minZ, meta.maxZ, 0);
  const maxY = Math.max(meta.minZ, meta.maxZ, 0);

  const { maxZoomByAltitude, orbitCX, orbitCY, ringExtent } = computeRingExtents(
    camera,
    meta,
    orbitTarget,
  );
  const leaves: LeafTile[] = [];
  const box = new THREE.Box3();

  function visit(z: number, x: number, y: number): void {
    const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, z, x, y);
    box.min.set(worldX0, minY, worldZ0);
    box.max.set(worldX0 + tileSize, maxY, worldZ0 + tileSize);
    if (!frustum.intersectsBox(box)) return;

    const side = 1 << (maxZoomByAltitude - z);
    const x0 = x * side;
    const y0 = y * side;
    const xEdge = x0 + side;
    const yEdge = y0 + side;
    const dx = Math.max(0, x0 - orbitCX, orbitCX - xEdge);
    const dy = Math.max(0, y0 - orbitCY, orbitCY - yEdge);
    const nearestRing = Math.hypot(dx, dy);
    if (z >= maxZoomByAltitude || nearestRing > ringExtent[z + 1]) {
      leaves.push([z, x, y]);
      return;
    }
    visit(z + 1, x * 2, y * 2);
    visit(z + 1, x * 2 + 1, y * 2);
    visit(z + 1, x * 2, y * 2 + 1);
    visit(z + 1, x * 2 + 1, y * 2 + 1);
  }
  visit(0, 0, 0);
  return leaves;
}
