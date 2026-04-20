import { reProjectPoint } from '$lib/ui/OlMap/utils';
import { PointType } from './types';
import { deliveryPoints, type DeliveryPoint } from '$lib/data/deliveryPoint';
import { houses } from '$lib/data/house';
import type { Map as MaplibreMap, LayerSpecification } from 'maplibre-gl';
import {
  colorAmber200,
  colorAmber300,
  colorAmber400,
  colorBlue500,
  colorBlue600,
  colorCyan300,
  colorCyan500,
  colorCyan600,
  colorGreen500,
  colorGreen600,
  colorOrange300,
  colorOrange500,
  colorOrange600,
  colorWhite,
  colorYellow300,
  colorYellow500,
  colorYellow600,
  colorYellow950,
  colorAmber950,
  colorCyan950,
} from '$lib/tw-var';

// ──────────────────────────────────────────────────────────────────────────────
// MapLibre paint expression helpers (mirrors the original OL WebGL expressions)
// ──────────────────────────────────────────────────────────────────────────────

export const getDeliveryPointPaint = (jobOnly?: boolean): Record<string, unknown> => ({
  'circle-radius': 6,
  'circle-opacity': jobOnly
    ? ['case', ['>', ['to-number', ['get', 'jobs']], 0], 1, 0]
    : 1,
  'circle-color': [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    ['match', ['to-number', ['get', 'jobs']], 1, colorOrange300, colorYellow300],
    ['boolean', ['feature-state', 'selected'], false],
    ['case', ['>', ['to-number', ['get', 'jobs']], 0], colorOrange600, colorYellow600],
    ['case', ['>', ['to-number', ['get', 'jobs']], 0], colorOrange500, colorYellow500],
  ],
  'circle-stroke-color': [
    'match',
    ['to-number', ['get', 'jobs']],
    1,
    ['case', ['boolean', ['feature-state', 'selected'], false], colorGreen500, colorGreen600],
    2,
    ['case', ['boolean', ['feature-state', 'selected'], false], colorBlue500, colorBlue600],
    ['case', ['boolean', ['feature-state', 'selected'], false], colorWhite, colorYellow950],
  ],
  'circle-stroke-width': ['case', ['>', ['to-number', ['get', 'jobs']], 0], 2, 1],
});

export const getResidentPointPaint = (jobOnly?: boolean): Record<string, unknown> => ({
  'circle-radius': 5,
  'circle-opacity': jobOnly
    ? ['case', ['>', ['to-number', ['get', 'jobs']], 0], 1, 0]
    : 1,
  'circle-color': [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    ['match', ['to-number', ['get', 'jobs']], 1, colorOrange300, colorAmber200],
    ['boolean', ['feature-state', 'selected'], false],
    ['case', ['>', ['to-number', ['get', 'jobs']], 0], colorOrange600, colorAmber400],
    ['case', ['>', ['to-number', ['get', 'jobs']], 0], colorOrange500, colorAmber300],
  ],
  'circle-stroke-color': [
    'match',
    ['to-number', ['get', 'jobs']],
    1,
    ['case', ['boolean', ['feature-state', 'selected'], false], colorGreen500, colorGreen600],
    2,
    ['case', ['boolean', ['feature-state', 'selected'], false], colorBlue500, colorBlue600],
    ['case', ['boolean', ['feature-state', 'selected'], false], colorWhite, colorAmber950],
  ],
  'circle-stroke-width': ['case', ['>', ['to-number', ['get', 'jobs']], 0], 2, 1],
});

export const getHousePaint = (vacantOnly?: boolean): Record<string, unknown> => ({
  'circle-radius': 6,
  'circle-opacity': vacantOnly
    ? ['case', ['==', ['to-number', ['get', 'vacant']], 1], 1, 0]
    : 1,
  'circle-color': [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    colorCyan300,
    ['boolean', ['feature-state', 'selected'], false],
    colorCyan600,
    colorCyan500,
  ],
  'circle-stroke-color': [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    colorWhite,
    colorCyan950,
  ],
  'circle-stroke-width': 1,
});

// ──────────────────────────────────────────────────────────────────────────────
// GeoJSON builders
// ──────────────────────────────────────────────────────────────────────────────

function buildDeliveryGeoJson(): [GeoJSON.FeatureCollection, GeoJSON.FeatureCollection] {
  const deliFeatures: GeoJSON.Feature[] = [];
  const residentFeatures: GeoJSON.Feature[] = [];

  deliveryPoints.forEach((point, i) => {
    const [lng, lat] = reProjectPoint([point.coord.x, point.coord.y]);
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      id: i,
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        pointType: PointType.Delivery,
        guid: point.guid,
        jobs: 0,
      },
    };
    if (point.type === 'Resident_C') {
      residentFeatures.push(feature);
    } else {
      deliFeatures.push(feature);
    }
  });

  return [
    { type: 'FeatureCollection', features: deliFeatures },
    { type: 'FeatureCollection', features: residentFeatures },
  ];
}

function buildHouseGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: houses.map((point, i) => {
      const [lng, lat] = reProjectPoint([point.coord.x, point.coord.y]);
      return {
        type: 'Feature',
        id: i,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          pointType: PointType.House,
          name: point.name,
          vacant: 0,
          label: '',
        },
      } satisfies GeoJSON.Feature;
    }),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Source / layer names (exported so Map.svelte can reference them)
// ──────────────────────────────────────────────────────────────────────────────
export const SRC_DELIVERY = 'delivery-source';
export const SRC_RESIDENT = 'resident-source';
export const SRC_HOUSE = 'house-source';
export const LYR_DELIVERY = 'delivery-layer';
export const LYR_RESIDENT = 'resident-layer';
export const LYR_HOUSE = 'house-layer';
export const LYR_HOUSE_LABEL = 'house-label-layer';

// ──────────────────────────────────────────────────────────────────────────────
// Main setup function
// ──────────────────────────────────────────────────────────────────────────────

export interface StaticPointsHandle {
  /** GeoJSON delivery features (non-resident), one per deliveryPoints entry */
  deliveryFeatures: GeoJSON.Feature[];
  /** GeoJSON resident features, one per resident entry */
  residentFeatures: GeoJSON.Feature[];
  /** GeoJSON house features, one per house entry */
  houseFeatures: GeoJSON.Feature[];
  /** Indices into deliveryPoints[] for each delivery feature (same order) */
  deliveryPointData: DeliveryPoint[];
  /** Indices into deliveryPoints[] for each resident feature (same order) */
  residentPointData: DeliveryPoint[];
}

/**
 * Add static delivery/house sources and layers to a MapLibre map instance and
 * return handles to the underlying GeoJSON features so that callers can update
 * feature properties (jobs count, vacant status, selection…) via
 * `map.setFeatureState`.
 */
export function addStaticLayers(map: MaplibreMap): StaticPointsHandle {
  const [deliveryGeoJson, residentGeoJson] = buildDeliveryGeoJson();
  const houseGeoJson = buildHouseGeoJson();

  // Track original DeliveryPoint data in the same order as GeoJSON features
  const deliveryPointData: DeliveryPoint[] = deliveryPoints.filter(
    (p) => p.type !== 'Resident_C',
  );
  const residentPointData: DeliveryPoint[] = deliveryPoints.filter(
    (p) => p.type === 'Resident_C',
  );

  map.addSource(SRC_DELIVERY, {
    type: 'geojson',
    data: deliveryGeoJson,
    promoteId: 'guid',
  });
  map.addSource(SRC_RESIDENT, {
    type: 'geojson',
    data: residentGeoJson,
    promoteId: 'guid',
  });
  map.addSource(SRC_HOUSE, {
    type: 'geojson',
    data: houseGeoJson,
    promoteId: 'name',
  });

  map.addLayer({
    id: LYR_DELIVERY,
    type: 'circle',
    source: SRC_DELIVERY,
    paint: getDeliveryPointPaint() as LayerSpecification['paint'],
  } as LayerSpecification);

  map.addLayer({
    id: LYR_RESIDENT,
    type: 'circle',
    source: SRC_RESIDENT,
    minzoom: 5,
    paint: getResidentPointPaint() as LayerSpecification['paint'],
  } as LayerSpecification);

  map.addLayer({
    id: LYR_HOUSE,
    type: 'circle',
    source: SRC_HOUSE,
    paint: getHousePaint() as LayerSpecification['paint'],
  } as LayerSpecification);

  map.addLayer({
    id: LYR_HOUSE_LABEL,
    type: 'symbol',
    source: SRC_HOUSE,
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 10,
      'text-offset': [0, -1.5],
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      visibility: 'none',
    },
    paint: {
      'text-color': '#f1f5f9',
      'text-halo-color': 'rgba(15,23,42,0.4)',
      'text-halo-width': 2,
    },
  });

  return {
    deliveryFeatures: deliveryGeoJson.features,
    residentFeatures: residentGeoJson.features,
    houseFeatures: houseGeoJson.features,
    deliveryPointData,
    residentPointData,
  };
}
