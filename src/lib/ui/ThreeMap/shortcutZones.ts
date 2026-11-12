import * as THREE from 'three';
import type { ShortcutZone } from '#lib/api/shortcutZone.ts';
import { adjustOpacity, colorGray950, colorRed500, colorTextDark, fontSans } from '#lib/tw-var.ts';
import {
  SHORTCUT_ZONE_DASH_CSS,
  SHORTCUT_ZONE_FILL_OPACITY,
  SHORTCUT_ZONE_LABEL_SIZE_CSS,
  SHORTCUT_ZONE_RENDER_ORDER,
  SHORTCUT_ZONE_STROKE_WIDTH_CSS,
  OVERLAY_GROUND_OFFSET_M,
} from './constants.ts';
import { gamePlaneToWorldXZ, ringInteriorPoint } from './coords.ts';
import type { GroundHeights } from './groundHeights.ts';
import {
  makeTextSprite,
  snapLabelToPixelGrid,
  type TextSprite,
  type ViewportScale,
} from './poi.ts';
import { createPolygonLayer, rgba, type PolygonLayer } from './polygonLayer.ts';
import type { XZ } from './polygons.ts';
import type { TilesMeta } from './three-map-types.ts';

export interface ShortcutZoneLayer {
  /** Replaces the zones (game coordinates, ring closing point optional). */
  setZones: (zones: ShortcutZone[]) => void;
  /** Whole layer on/off (the POI toggle). */
  setVisible: (visible: boolean) => void;
  /** Zone names on/off (the labels toggle). */
  setLabelsVisible: (visible: boolean) => void;
  setFlat: (flat: boolean) => void;
  /** Builds polygons/labels whose ground data has arrived. */
  update: () => void;
  /** Pixel-aligns the visible labels and keeps the dashed outline continuous (call once per rendered frame). */
  snap: (camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, buffer: THREE.Vector2) => void;
  /** Re-bakes DPR-sized parts (stroke width, label canvases). */
  setViewport: () => void;
  dispose: () => void;
}

interface ZoneLabel {
  at: XZ;
  name: string;
  sprite: TextSprite;
  /** Ground height applied (or flat); false while the tile is loading. */
  placed: boolean;
}

const labelStyle = {
  weight: 600,
  sizeCss: SHORTCUT_ZONE_LABEL_SIZE_CSS,
  family: fontSans,
  fillStyle: colorTextDark,
  strokeStyle: adjustOpacity(colorGray950, 0.4),
  strokeWidthCss: 3,
  anchor: 'center' as const,
};

/**
 * OL's `shortcutZoneLayer`: a faint red polygon with a red dashed outline and the zone's name at
 * its interior point. Drawn over the dots, under POI labels.
 */
export function createShortcutZoneLayer(options: {
  scene: THREE.Scene;
  meta: TilesMeta;
  groundHeights: GroundHeights;
  getViewport: () => ViewportScale;
  invalidate: () => void;
}): ShortcutZoneLayer {
  const { scene, meta, groundHeights, getViewport, invalidate } = options;
  const polygons: PolygonLayer = createPolygonLayer({
    scene,
    groundHeights,
    renderOrder: SHORTCUT_ZONE_RENDER_ORDER,
    strokeWidthCss: SHORTCUT_ZONE_STROKE_WIDTH_CSS,
    dash: SHORTCUT_ZONE_DASH_CSS,
    dpr: getViewport().dpr,
    invalidate,
  });
  const labelGroup = new THREE.Group();
  scene.add(labelGroup);

  let labels: ZoneLabel[] = [];
  let visible = true;
  let labelsVisible = true;
  let flat = false;

  function applyLabelVisibility(): void {
    labelGroup.visible = visible && labelsVisible;
    invalidate();
  }

  function clearLabels(): void {
    for (const label of labels) {
      labelGroup.remove(label.sprite.sprite);
      label.sprite.sprite.material.map?.dispose();
      label.sprite.sprite.material.dispose();
    }
    labels = [];
  }

  function makeLabel(name: string, at: XZ): ZoneLabel {
    const sprite = makeTextSprite(name, labelStyle, getViewport());
    sprite.sprite.position.set(at[0], 0, at[1]);
    labelGroup.add(sprite.sprite);
    return { at, name, sprite, placed: false };
  }

  return {
    setZones(zones) {
      const displayReferred = getViewport().displayReferred;
      const colorFill = rgba(colorRed500, SHORTCUT_ZONE_FILL_OPACITY, displayReferred);
      const colorStroke = rgba(colorRed500, 1, displayReferred);
      const rings = zones.map((zone) =>
        zone.coordinates.map(([x, y]) => gamePlaneToWorldXZ(x, y, meta)),
      );
      polygons.setPolygons(rings.map((ring) => ({ ring, fill: colorFill, stroke: colorStroke })));
      clearLabels();
      labels = zones.flatMap((zone, i) =>
        rings[i].length >= 3 ? [makeLabel(zone.name, ringInteriorPoint(rings[i]))] : [],
      );
      invalidate();
    },
    setVisible(next) {
      visible = next;
      polygons.setVisible(next);
      applyLabelVisibility();
    },
    setLabelsVisible(next) {
      labelsVisible = next;
      applyLabelVisibility();
    },
    setFlat(next) {
      flat = next;
      polygons.setFlat(next);
      for (const label of labels) label.placed = false;
    },
    update() {
      polygons.update();
      for (const label of labels) {
        if (label.placed) continue;
        const height = flat ? 0 : groundHeights.sample(label.at[0], label.at[1], meta.maxZoom);
        if (height === null) continue; // the ground tile is still loading: retry next tick
        label.sprite.sprite.position.y = flat ? 0 : height + OVERLAY_GROUND_OFFSET_M;
        label.placed = true;
        invalidate();
      }
    },
    snap(camera, buffer) {
      polygons.syncDashPhase(camera, buffer);
      if (!labelGroup.visible) return;
      camera.updateMatrixWorld();
      for (const label of labels) snapLabelToPixelGrid(label.sprite, camera, buffer);
    },
    setViewport() {
      polygons.setDpr(getViewport().dpr);
      const old = labels;
      labels = [];
      for (const label of old) {
        labelGroup.remove(label.sprite.sprite);
        label.sprite.sprite.material.map?.dispose();
        label.sprite.sprite.material.dispose();
        const remade = makeLabel(label.name, label.at);
        remade.sprite.sprite.position.y = label.sprite.sprite.position.y;
        remade.placed = label.placed;
        labels.push(remade);
      }
      invalidate();
    },
    dispose() {
      clearLabels();
      scene.remove(labelGroup);
      polygons.dispose();
    },
  };
}
