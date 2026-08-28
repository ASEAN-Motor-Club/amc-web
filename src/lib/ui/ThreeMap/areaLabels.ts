import * as THREE from 'three';
import {
  AREA_NAME_STROKE_OPACITY,
  AREA_NAME_TEXT_OPACITY,
  AREA_NAME_TIERS,
  OVERLAY_GROUND_OFFSET_M,
} from './constants';
import { gamePlaneToWorldXZ, ringInteriorPoint } from './coords';
import { tileWorldRect } from './heightmap';
import type { GroundHeights } from './groundHeights';
import { makeTextSprite, type TextSprite, type ViewportScale } from './poi';
import type { TileManager } from './tileManager';
import type { TilesMeta } from './three-map-types';
import { areaBoundaries, areaNameFontSize } from '$lib/data/area';
import { getMtLocale } from '$lib/utils/getMtLocale';
import type { MtNameRecord } from '$lib/types';
import { adjustOpacity, colorBlue300, colorGray950, colorTextDark, fontSans } from '$lib/tw-var';

export interface AreaLabelLayer {
  /** Re-applies localized text (re-runs on locale changes, like OL's label effect). */
  setTexts: () => void;
  setVisible: (visible: boolean) => void;
  /** Recomputes tier visibility from each label's covering tile (OL's minZoom tiers). */
  syncCovers: () => void;
  /** Builds pending labels whose ground data has arrived. */
  update: () => void;
  setViewport: () => void;
  dispose: () => void;
}

/** rem font sizes like '0.75rem' → CSS px. */
const remToPx = (rem: string): number => Math.round(parseFloat(rem) * 16);

interface AreaEntry {
  flag: string;
  name: MtNameRecord;
  /** World XZ anchor (the ring's interior point). */
  at: [x: number, z: number];
  zoom: number;
  minCoverZ: number;
  coverZ: number | null;
  sprite: TextSprite | null;
}

function labelStyle(flag: string) {
  return {
    weight: flag === 'Zone' ? 700 : 600,
    sizeCss: remToPx(areaNameFontSize[flag] ?? areaNameFontSize['']),
    family: fontSans,
    fillStyle:
      flag === 'RaceTrack'
        ? adjustOpacity(colorBlue300, AREA_NAME_TEXT_OPACITY)
        : adjustOpacity(colorTextDark, AREA_NAME_TEXT_OPACITY),
    strokeStyle: adjustOpacity(colorGray950, AREA_NAME_STROKE_OPACITY),
    strokeWidthCss: 2,
  };
}

/** Floating area-name labels, ported from OL's areaNameLayers (text only - the colored
 * boundary fill is dev-only there). Labels drape above the ground at the ring's
 * interior point and appear by hierarchy as the covering tile zooms in. */
export function createAreaLabelLayer(
  scene: THREE.Scene,
  meta: TilesMeta,
  tileManager: TileManager,
  groundHeights: GroundHeights,
  getViewport: () => ViewportScale,
): AreaLabelLayer {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const entries: AreaEntry[] = areaBoundaries
    .filter((area) => area.ring.length >= 3)
    .map((area) => {
      const at = ringInteriorPoint(area.ring.map(([x, y]) => gamePlaneToWorldXZ(x, y, meta)));
      return {
        flag: area.flag,
        name: area.name,
        at,
        zoom: meta.maxZoom,
        minCoverZ: Math.min(
          ...AREA_NAME_TIERS.filter((tier) => tier.flags[area.flag]).map((tier) => tier.minCoverZ),
        ),
        coverZ: null,
        sprite: null,
      };
    });

  function buildSprite(entry: AreaEntry): TextSprite | null {
    if (entry.sprite) return entry.sprite;
    const h = groundHeights.sample(entry.at[0], entry.at[1], entry.zoom);
    if (h === null) return null; // Ground data still loading - retry on a later frame.
    const sprite = makeTextSprite(getMtLocale(entry.name), labelStyle(entry.flag), getViewport());
    sprite.sprite.position.set(entry.at[0], h + OVERLAY_GROUND_OFFSET_M, entry.at[1]);
    group.add(sprite.sprite);
    return sprite;
  }

  function remakeSprites(): void {
    for (const entry of entries) {
      if (!entry.sprite) continue;
      const remade = makeTextSprite(getMtLocale(entry.name), labelStyle(entry.flag), getViewport());
      remade.sprite.position.copy(entry.sprite.sprite.position);
      remade.sprite.visible = entry.sprite.sprite.visible;
      group.remove(entry.sprite.sprite);
      const material = entry.sprite.sprite.material;
      material.map?.dispose();
      material.dispose();
      group.add(remade.sprite);
      entry.sprite = remade;
    }
  }

  return {
    setTexts: remakeSprites,

    setVisible(visible) {
      group.visible = visible;
    },

    syncCovers() {
      const activeList = [...tileManager.activeTiles.values()];
      for (const entry of entries) {
        let cover: number | null = null;
        for (const tile of activeList) {
          const { worldX0, worldZ0, tileSize } = tileWorldRect(meta, tile.z, tile.x, tile.y);
          if (
            entry.at[0] >= worldX0 &&
            entry.at[0] <= worldX0 + tileSize &&
            entry.at[1] >= worldZ0 &&
            entry.at[1] <= worldZ0 + tileSize &&
            (cover === null || tile.z > cover)
          ) {
            cover = tile.z;
          }
        }
        entry.coverZ = cover;
        if (entry.sprite) {
          entry.sprite.sprite.visible = (cover ?? 0) >= entry.minCoverZ;
        }
      }
    },

    update() {
      for (const entry of entries) {
        const sprite = buildSprite(entry);
        entry.sprite = sprite;
        if (sprite) {
          // The tier gate re-applies here: sprites build lazily as their ground data
          // arrives, possibly after the last syncCovers.
          sprite.sprite.visible = (entry.coverZ ?? 0) >= entry.minCoverZ;
        }
      }
    },

    setViewport: remakeSprites,

    dispose() {
      for (const entry of entries) {
        if (!entry.sprite) continue;
        const material = entry.sprite.sprite.material;
        material.map?.dispose();
        material.dispose();
      }
      entries.length = 0;
      scene.remove(group);
    },
  };
}
