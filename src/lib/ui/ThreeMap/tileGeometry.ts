import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import { COLOR_MAX_ZOOM, SKIRT_DROP } from './constants';
import { rawHeightToWorldZMeters } from './heightmap';

const COLOR_BASE_URL = '/map_tiles/719a/colors';
const HEIGHT_BASE_URL = '/map_tiles/719a/heights';

export async function fetchHeightTile(
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<Uint16Array> {
  const r = await fetch(`${HEIGHT_BASE_URL}/${z}_${x}_${y}.bin`, { signal });
  if (!r.ok) throw new Error(`height tile ${z}_${x}_${y}: HTTP ${r.status}`);
  return new Uint16Array(await r.arrayBuffer());
}

export function loadColorTexture(
  z: number,
  x: number,
  y: number,
  renderer: Renderer,
  manager?: THREE.LoadingManager,
): Promise<THREE.Texture> {
  const { promise, resolve, reject } = Promise.withResolvers<THREE.Texture>();
  const depth = Math.max(0, z - COLOR_MAX_ZOOM);
  const colorZ = z - depth;
  const colorX = x >> depth;
  const colorY = y >> depth;
  const frac = 1 / (1 << depth);
  const offX = (x - (colorX << depth)) * frac;
  const offY = (y - (colorY << depth)) * frac;
  new THREE.TextureLoader(manager).load(
    `${COLOR_BASE_URL}/${colorZ}_${colorX}_${colorY}.avif`,
    (texture) => {
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.getMaxAnisotropy();
      if (depth > 0) {
        texture.repeat.set(frac, frac);
        texture.offset.set(offX, offY);
      }
      resolve(texture);
    },
    undefined,
    (err) => {
      const message = err instanceof Error ? err.message : String(err);
      reject(new Error(`color tile ${colorZ}_${colorX}_${colorY}.avif failed to load: ${message}`));
    },
  );
  return promise;
}

export function buildTileGeometry(
  rawHeights: Uint16Array,
  worldX0: number,
  worldZ0: number,
  tileWorldSize: number,
): THREE.BufferGeometry {
  const haloSize = Math.round(Math.sqrt(rawHeights.length));
  if (haloSize * haloSize !== rawHeights.length) {
    throw new Error(`height tile is not square: ${rawHeights.length} samples`);
  }
  const innerSize = haloSize - 2;
  const flat = rawHeights.every((h) => h === rawHeights[0]);
  const N = flat ? 2 : innerSize;
  const mainCount = N * N;
  const skirtCount = 4 * N;
  const total = mainCount + skirtCount;

  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const baseGradX = new Float32Array(total);
  const baseGradZ = new Float32Array(total);

  const sampleSpacing = tileWorldSize / (innerSize - 1);

  function heightAtHalo(hx: number, hy: number): number {
    return rawHeightToWorldZMeters(rawHeights[hy * haloSize + hx]);
  }

  for (let row = 0; row < N; row++) {
    const v = row / (N - 1);
    const hy = Math.round(v * (innerSize - 1)) + 1;
    for (let col = 0; col < N; col++) {
      const u = col / (N - 1);
      const hx = Math.round(u * (innerSize - 1)) + 1;
      const idx = row * N + col;

      const y = heightAtHalo(hx, hy);
      positions[idx * 3 + 0] = worldX0 + u * tileWorldSize;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = worldZ0 + v * tileWorldSize;
      baseGradX[idx] = (heightAtHalo(hx + 1, hy) - heightAtHalo(hx - 1, hy)) / (2 * sampleSpacing);
      baseGradZ[idx] = (heightAtHalo(hx, hy + 1) - heightAtHalo(hx, hy - 1)) / (2 * sampleSpacing);
      uvs[idx * 2 + 0] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  const edges = [
    { base: mainCount + 0 * N, mainIndices: Array.from({ length: N }, (_, col) => col) },
    {
      base: mainCount + 1 * N,
      mainIndices: Array.from({ length: N }, (_, col) => (N - 1) * N + col),
    },
    { base: mainCount + 2 * N, mainIndices: Array.from({ length: N }, (_, row) => row * N) },
    {
      base: mainCount + 3 * N,
      mainIndices: Array.from({ length: N }, (_, row) => row * N + (N - 1)),
    },
  ];
  for (const edge of edges) {
    edge.mainIndices.forEach((mainIdx, i) => {
      const sIdx = edge.base + i;
      positions[sIdx * 3 + 0] = positions[mainIdx * 3 + 0];
      positions[sIdx * 3 + 1] = positions[mainIdx * 3 + 1] - SKIRT_DROP;
      positions[sIdx * 3 + 2] = positions[mainIdx * 3 + 2];
      baseGradX[sIdx] = baseGradX[mainIdx];
      baseGradZ[sIdx] = baseGradZ[mainIdx];
      uvs[sIdx * 2 + 0] = uvs[mainIdx * 2 + 0];
      uvs[sIdx * 2 + 1] = uvs[mainIdx * 2 + 1];
    });
  }

  const indices: number[] = [];
  for (let row = 0; row < N - 1; row++) {
    for (let col = 0; col < N - 1; col++) {
      const a = row * N + col;
      const b = a + 1;
      const c = a + N;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  for (const edge of edges) {
    for (let i = 0; i < edge.mainIndices.length - 1; i++) {
      const m0 = edge.mainIndices[i];
      const m1 = edge.mainIndices[i + 1];
      const s0 = edge.base + i;
      const s1 = edge.base + i + 1;
      indices.push(m0, s0, m1, m1, s0, s1);
    }
  }

  for (let i = 0; i < baseGradX.length; i++) {
    const nx = -baseGradX[i];
    const nz = -baseGradZ[i];
    const len = Math.hypot(nx, 1, nz);
    normals[i * 3 + 0] = nx / len;
    normals[i * 3 + 1] = 1 / len;
    normals[i * 3 + 2] = nz / len;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  return geometry;
}
