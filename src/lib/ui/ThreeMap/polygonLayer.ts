import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import type { GroundHeights } from './groundHeights.ts';
import { colorComponents, makeColor } from './poi.ts';
import {
  roundsForMaxEdge,
  subdivide,
  subdividePolyline,
  triangulate,
  type Triangulation,
  type XZ,
} from './polygons.ts';
import { createScreenLines, type ScreenLines } from './screenLines.ts';

/** Straight-alpha colour for vertex/instance attributes: linear light in a normal scene,
 * sRGB-encoded numbers in a display-referred one (see `colorComponents`). */
export type Rgba = [r: number, g: number, b: number, a: number];

/** A css/oklch colour string plus an alpha as the rgba the GPU buffers want. */
export function rgba(color: string, alpha: number, displayReferred: boolean): Rgba {
  const [r, g, b] = colorComponents(makeColor(color), displayReferred);
  return [r, g, b, alpha];
}

export interface PolygonSpec {
  /** Outer ring in world XZ meters (closing point optional). */
  ring: XZ[];
  fill: Rgba;
  stroke: Rgba;
}

export interface PolygonLayerOptions {
  scene: THREE.Scene;
  groundHeights: GroundHeights;
  /** Draw order of the fill; the stroke draws just above it. */
  renderOrder: number;
  strokeWidthCss: number;
  dash?: { dashCss: number; gapCss: number };
  /** Device px per CSS px, re-read through `setDpr`. */
  dpr: number;
  /** Called after any change to what the layer draws (the scene renders on demand). */
  invalidate: () => void;
}

export interface PolygonLayer {
  /** Replaces every polygon; geometry builds as ground data arrives (see `update`). */
  setPolygons: (specs: PolygonSpec[]) => void;
  setVisible: (visible: boolean) => void;
  /** Flat layers sit at y=0 (orthographic 2D); otherwise they drape over the terrain. */
  setFlat: (flat: boolean) => void;
  /** Builds the polygons whose ground tiles have arrived. Cheap when nothing is pending. */
  update: () => void;
  setDpr: (dpr: number) => void;
  /** Keeps the dashed outline continuous across its segments (call once per rendered frame). */
  syncDashPhase: ScreenLines['syncDashPhase'];
  dispose: () => void;
}

/** No fill/stroke segment is longer than this, so the layer can follow the terrain. */
const MAX_EDGE_M = 300;
/** Cap on triangle subdivision rounds (4^rounds triangles per source triangle). */
const MAX_ROUNDS = 3;
/** Ground-height fetches allowed per polygon (bounds how many tiles one feature pulls in). */
const MAX_TILES_PER_POLYGON = 4;
/** Overlays sit this far above the sampled ground (the same as area labels) - purely cosmetic
 * with depth testing off, but keeps a draped layer above terrain when a camera tilts. */
const GROUND_OFFSET_M = 2;

interface Entry {
  spec: PolygonSpec;
  fill: Triangulation;
  /** Stroke path: the ring closed back on its first point, split into short segments. */
  path: XZ[];
  /** Ground heights for fill points / path points; undefined until sampled. */
  fillY?: Float32Array;
  pathY?: Float32Array;
  /** Sampling zoom, chosen once from the polygon's bounding box. */
  zoom: number;
}

export function createPolygonLayer(options: PolygonLayerOptions): PolygonLayer {
  const { scene, groundHeights, invalidate } = options;
  const group = new THREE.Group();
  group.visible = true;
  scene.add(group);

  const fillMaterial = new MeshBasicNodeMaterial({
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const fillMesh = new THREE.Mesh(new THREE.BufferGeometry(), fillMaterial);
  fillMesh.renderOrder = options.renderOrder;
  fillMesh.frustumCulled = false;
  group.add(fillMesh);

  const stroke: ScreenLines = createScreenLines({
    renderOrder: options.renderOrder + 0.001,
    widthCss: options.strokeWidthCss,
    dpr: options.dpr,
    dash: options.dash,
  });
  group.add(stroke.mesh);

  let entries: Entry[] = [];
  let flat = false;
  /** True while polygons are still waiting for ground tiles (or were just replaced). */
  let stale = false;
  /** Entries or the flat/drape mode changed: the merged buffers must be rebuilt. */
  let rebuildNeeded = false;
  let builtReady = -1;

  function prepare(spec: PolygonSpec): Entry {
    const base = triangulate(spec.ring);
    const fill = subdivide(base, roundsForMaxEdge(base, MAX_EDGE_M, MAX_ROUNDS));
    const path = subdividePolyline(spec.ring, MAX_EDGE_M, true);
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of spec.ring) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    return {
      spec,
      fill,
      path,
      zoom: groundHeights.zoomForBox(minX, minZ, maxX, maxZ, MAX_TILES_PER_POLYGON),
    };
  }

  function heightsReady(entry: Entry): boolean {
    if (flat) return true;
    // sampleMany() kicks the fetch for a missing tile and returns null: retry on a later update().
    entry.fillY ??=
      groundHeights.sampleMany(entry.fill.points, entry.zoom, GROUND_OFFSET_M) ?? undefined;
    if (!entry.fillY) return false;
    entry.pathY ??= groundHeights.sampleMany(entry.path, entry.zoom, GROUND_OFFSET_M) ?? undefined;
    return entry.pathY !== undefined;
  }

  /** Concatenates every ready entry into the fill geometry and the stroke segments. */
  function rebuild(): void {
    let vertexCount = 0;
    let indexCount = 0;
    let segmentCount = 0;
    const ready = entries.filter(heightsReady);
    for (const e of ready) {
      vertexCount += e.fill.points.length;
      indexCount += e.fill.indices.length;
      segmentCount += Math.max(e.path.length - 1, 0);
    }
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 4);
    const indices = new Uint32Array(indexCount);
    const starts = new Float32Array(segmentCount * 3);
    const ends = new Float32Array(segmentCount * 3);
    const segColors = new Float32Array(segmentCount * 4);
    const distances = new Float32Array(segmentCount);

    let v = 0;
    let i = 0;
    let s = 0;
    for (const e of ready) {
      const base = v;
      for (let k = 0; k < e.fill.points.length; k++, v++) {
        positions.set(
          [e.fill.points[k][0], flat ? 0 : (e.fillY?.[k] ?? 0), e.fill.points[k][1]],
          v * 3,
        );
        colors.set(e.spec.fill, v * 4);
      }
      for (const index of e.fill.indices) indices[i++] = base + index;
      let travelled = 0;
      for (let k = 0; k + 1 < e.path.length; k++, s++) {
        const [ax, az] = e.path[k];
        const [bx, bz] = e.path[k + 1];
        starts.set([ax, flat ? 0 : (e.pathY?.[k] ?? 0), az], s * 3);
        ends.set([bx, flat ? 0 : (e.pathY?.[k + 1] ?? 0), bz], s * 3);
        segColors.set(e.spec.stroke, s * 4);
        distances[s] = travelled;
        travelled += Math.hypot(bx - ax, bz - az);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    fillMesh.geometry.dispose();
    fillMesh.geometry = geometry;
    stroke.setSegments(starts, ends, segColors, distances);
    invalidate();
  }

  return {
    setPolygons(specs) {
      entries = specs.filter((spec) => spec.ring.length >= 3).map(prepare);
      stale = true;
      rebuildNeeded = true;
    },
    setVisible(visible) {
      group.visible = visible;
      invalidate();
    },
    setFlat(next) {
      if (flat === next) return;
      flat = next;
      stale = true;
      rebuildNeeded = true;
    },
    update() {
      if (!stale) return;
      const ready = entries.reduce((n, e) => n + (heightsReady(e) ? 1 : 0), 0);
      // Rebuild when something changed or another polygon got its heights; keep polling until all have.
      if (rebuildNeeded || ready !== builtReady) {
        rebuild();
        builtReady = ready;
        rebuildNeeded = false;
      }
      stale = ready < entries.length;
    },
    syncDashPhase: stroke.syncDashPhase,
    setDpr(dpr) {
      stroke.setDpr(dpr);
      invalidate();
    },
    dispose() {
      scene.remove(group);
      fillMesh.geometry.dispose();
      fillMaterial.dispose();
      stroke.dispose();
    },
  };
}
