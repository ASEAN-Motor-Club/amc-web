import * as THREE from 'three';
import {
  OVERLAY_GROUND_OFFSET_M,
  SHORTCUT_ZONE_DASH_M,
  SHORTCUT_ZONE_FILL_OPACITY,
  SHORTCUT_ZONE_GAP_M,
  SHORTCUT_ZONE_LABEL_OFFSET_M,
  SHORTCUT_ZONE_MAX_EDGE_M,
  SHORTCUT_ZONE_MAX_SUBDIV_DEPTH,
  SHORTCUT_ZONE_MAX_TILES,
} from './constants';
import { gamePlaneToWorldXZ, ringInteriorPoint } from './coords';
import type { GroundHeights } from './groundHeights';
import { makeColor, makeTextSprite, type TextSprite, type ViewportScale } from './poi';
import type { TilesMeta } from './three-map-types';
import type { ShortcutZone } from '$lib/api/shortcutZone';
import { adjustOpacity, colorGray950, colorRed500, colorTextDark } from '$lib/tw-var';

export interface ShortcutZoneLayer {
  /** Replaces the zone set. Zones drape once their ground data arrives. */
  setZones: (zones: ShortcutZone[]) => void;
  setVisible: (visible: boolean) => void;
  setLabelsVisible: (visible: boolean) => void;
  /** Builds pending zones whose ground data has arrived. */
  update: () => void;
  setViewport: () => void;
  dispose: () => void;
}

type Ring = [x: number, z: number][];
/** One triangle as three world-XZ points. */
type Tri = [[number, number], [number, number], [number, number]];

interface ZoneEntry {
  zone: ShortcutZone;
  ring: Ring;
  /** Interior point anchoring the name label, in world XZ. */
  labelAt: [x: number, z: number];
  zoom: number;
  group: THREE.Group;
  label: TextSprite | null;
  built: boolean;
}

/** Midpoint-subdivides a triangle until no edge exceeds maxEdge (or the depth cap). */
function subdivide(tri: Tri, maxEdge: number, depth: number, out: Tri[]): void {
  const [[ax, az], [bx, bz], [cx, cz]] = tri;
  const e = Math.max(
    Math.hypot(bx - ax, bz - az),
    Math.hypot(cx - bx, cz - bz),
    Math.hypot(ax - cx, az - cz),
  );
  if (e <= maxEdge || depth === 0) {
    out.push(tri);
    return;
  }
  const m1: [number, number] = [(ax + bx) / 2, (az + bz) / 2];
  const m2: [number, number] = [(bx + cx) / 2, (bz + cz) / 2];
  const m3: [number, number] = [(cx + ax) / 2, (cz + az) / 2];
  const next = depth - 1;
  subdivide([tri[0], m1, m3], maxEdge, next, out);
  subdivide([m1, tri[1], m2], maxEdge, next, out);
  subdivide([m3, m2, tri[2]], maxEdge, next, out);
  subdivide([m1, m2, m3], maxEdge, next, out);
}

export function createShortcutZoneLayer(
  scene: THREE.Scene,
  meta: TilesMeta,
  groundHeights: GroundHeights,
  getViewport: () => ViewportScale,
): ShortcutZoneLayer {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const fillMaterial = new THREE.MeshBasicMaterial({
    color: makeColor(colorRed500),
    transparent: true,
    opacity: SHORTCUT_ZONE_FILL_OPACITY,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const borderMaterial = new THREE.LineBasicMaterial({
    color: makeColor(colorRed500),
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  let entries: ZoneEntry[] = [];
  let visible = false;
  let labelsVisible = false;

  function buildLabel(entry: ZoneEntry): void {
    if (entry.label) return;
    const h = groundHeights.sample(entry.labelAt[0], entry.labelAt[1], entry.zoom);
    if (h === null) return; // Ground data still loading - retry on a later frame.
    const label = makeTextSprite(
      entry.zone.name,
      {
        weight: 600,
        sizeCss: 8,
        family: 'sans-serif',
        fillStyle: colorTextDark,
        strokeStyle: adjustOpacity(colorGray950, 0.4),
        strokeWidthCss: 3,
      },
      getViewport(),
    );
    label.sprite.position.set(entry.labelAt[0], h + SHORTCUT_ZONE_LABEL_OFFSET_M, entry.labelAt[1]);
    label.sprite.visible = labelsVisible;
    entry.group.add(label.sprite);
    entry.label = label;
  }

  function buildZone(entry: ZoneEntry): void {
    // Sample heights for every vertex of the subdivided fill and the dashed border; wait
    // until all tiles are cached, then mount the whole zone in one go.
    const contours = entry.ring.map((p) => new THREE.Vector2(p[0], p[1]));
    const triangles: Tri[] = [];
    try {
      const index = THREE.ShapeUtils.triangulateShape(contours, []);
      for (const [a, b, c] of index) {
        subdivide(
          [
            [contours[a].x, contours[a].y],
            [contours[b].x, contours[b].y],
            [contours[c].x, contours[c].y],
          ],
          SHORTCUT_ZONE_MAX_EDGE_M,
          SHORTCUT_ZONE_MAX_SUBDIV_DEPTH,
          triangles,
        );
      }
    } catch {
      return; // Degenerate ring - skip rather than render garbage.
    }

    const sampled = new Map<string, number | null>();
    const heightAt = (x: number, z: number): number | null => {
      const key = `${x.toFixed(2)},${z.toFixed(2)}`;
      if (!sampled.has(key)) {
        sampled.set(key, groundHeights.sample(x, z, entry.zoom));
      }
      return sampled.get(key) ?? null;
    };

    const fillPositions: number[] = [];
    for (const tri of triangles) {
      const h0 = heightAt(tri[0][0], tri[0][1]);
      const h1 = heightAt(tri[1][0], tri[1][1]);
      const h2 = heightAt(tri[2][0], tri[2][1]);
      if (h0 === null || h1 === null || h2 === null) return; // Retry once every tile is cached.
      fillPositions.push(tri[0][0], h0 + OVERLAY_GROUND_OFFSET_M, tri[0][1]);
      fillPositions.push(tri[1][0], h1 + OVERLAY_GROUND_OFFSET_M, tri[1][1]);
      fillPositions.push(tri[2][0], h2 + OVERLAY_GROUND_OFFSET_M, tri[2][1]);
    }

    // Dashed border: resample the ring perimeter, emit LineSegments for the dash portions.
    const perimeter: [x: number, z: number][] = [];
    for (let i = 0; i < entry.ring.length; i++) {
      const [x0, z0] = entry.ring[i];
      const [x1, z1] = entry.ring[(i + 1) % entry.ring.length];
      const segLen = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.max(1, Math.ceil(segLen / (SHORTCUT_ZONE_DASH_M / 2)));
      for (let s = 0; s < steps; s++) {
        perimeter.push([x0 + ((x1 - x0) * s) / steps, z0 + ((z1 - z0) * s) / steps]);
      }
    }
    const borderPositions: number[] = [];
    const cycle = SHORTCUT_ZONE_DASH_M + SHORTCUT_ZONE_GAP_M;
    let arc = 0;
    for (let i = 0; i < perimeter.length; i++) {
      const p0 = perimeter[i];
      const p1 = perimeter[(i + 1) % perimeter.length];
      const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const h0 = heightAt(p0[0], p0[1]);
      const h1 = heightAt(p1[0], p1[1]);
      if (h0 === null || h1 === null) return;
      if (arc % cycle < SHORTCUT_ZONE_DASH_M && segLen > 0) {
        borderPositions.push(p0[0], h0 + OVERLAY_GROUND_OFFSET_M, p0[1]);
        borderPositions.push(p1[0], h1 + OVERLAY_GROUND_OFFSET_M, p1[1]);
      }
      arc += segLen;
    }

    const fillGeometry = new THREE.BufferGeometry();
    fillGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(fillPositions), 3),
    );
    const fill = new THREE.Mesh(fillGeometry, fillMaterial);
    fill.renderOrder = 0;
    fill.frustumCulled = false;
    entry.group.add(fill);

    const borderGeometry = new THREE.BufferGeometry();
    borderGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(borderPositions), 3),
    );
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    border.renderOrder = 0;
    border.frustumCulled = false;
    entry.group.add(border);

    entry.built = true;
    buildLabel(entry);
  }

  return {
    setZones(zones) {
      for (const entry of entries) {
        disposeEntry(entry);
      }
      entries = [];
      for (const zone of zones) {
        if (zone.coordinates.length < 3) continue;
        const ring = zone.coordinates.map(([x, y]) => gamePlaneToWorldXZ(x, y, meta));
        const labelAt = ringInteriorPoint(ring);
        const xs = ring.map((p) => p[0]);
        const zs = ring.map((p) => p[1]);
        const zoom = groundHeights.zoomForBox(
          Math.min(...xs),
          Math.min(...zs),
          Math.max(...xs),
          Math.max(...zs),
          SHORTCUT_ZONE_MAX_TILES,
        );
        const g = new THREE.Group();
        g.visible = visible;
        group.add(g);
        entries.push({ zone, ring, labelAt, zoom, group: g, label: null, built: false });
      }
    },

    setVisible(v) {
      visible = v;
      group.visible = v;
    },

    setLabelsVisible(v) {
      labelsVisible = v;
      for (const entry of entries) {
        if (entry.label) entry.label.sprite.visible = v;
      }
    },

    update() {
      for (const entry of entries) {
        if (!entry.built) buildZone(entry);
        else buildLabel(entry);
      }
    },

    setViewport() {
      // Label sprites are sized from the drawing buffer - remake them on DPR changes.
      for (const entry of entries) {
        if (!entry.label) continue;
        const remade = makeTextSprite(entry.zone.name, entry.label.style, getViewport());
        remade.sprite.position.copy(entry.label.sprite.position);
        remade.sprite.visible = labelsVisible;
        entry.group.remove(entry.label.sprite);
        disposeSprite(entry.label);
        entry.group.add(remade.sprite);
        entry.label = remade;
      }
    },

    dispose() {
      for (const entry of entries) {
        disposeEntry(entry);
      }
      entries = [];
      fillMaterial.dispose();
      borderMaterial.dispose();
      scene.remove(group);
    },
  };

  function disposeSprite(label: TextSprite): void {
    const material = label.sprite.material;
    material.map?.dispose();
    material.dispose();
  }

  function disposeEntry(entry: ZoneEntry): void {
    entry.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
      }
    });
    if (entry.label) disposeSprite(entry.label);
    group.remove(entry.group);
  }
}
