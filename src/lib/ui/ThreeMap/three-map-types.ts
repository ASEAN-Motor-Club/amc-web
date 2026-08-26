import type * as THREE from 'three';

export interface TilesMeta {
  widthMeters: number;
  heightMeters: number;
  /** World origin (game UE coords, meters) - the corner tiles.json calls origin*. */
  originXMeters: number;
  originYMeters: number;
  maxZoom: number;
  oceanLevelMeters: number | null;
  minZ: number;
  maxZ: number;
  tileInnerResolution: number;
  tileSampleCount: number;
  [key: string]: unknown;
}

export type LeafTile = readonly [z: number, x: number, y: number];

export interface RingExtents {
  maxZoomByAltitude: number;
  cellSize: number;
  orbitCX: number;
  orbitCY: number;
  ringExtent: number[];
}

export interface ActiveTile {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  texture: THREE.Texture;
  z: number;
  x: number;
  y: number;
}

export interface RawTilesJson {
  maxZoom: number;
  tileInnerResolution: number;
  tileSampleCount: number;
  widthCm: number;
  heightCm: number;
  originXCm: number;
  originYCm: number;
  minZ: number;
  maxZ: number;
  oceanLevelCm: number | null;
}
