<script lang="ts">
  import type { Vector2 } from '$lib/types';
  import type { ClassValue } from 'svelte/elements';
  import OlMap from '../OlMap/OlMap.svelte';
  import {
    colorSky400,
    colorSky600,
    colorAmber500,
    colorRed600,
    colorYellow500,
    colorYellow300,
    colorOrange500,
    colorYellow100,
    colorWhite,
    colorSky950,
    colorTextDark,
    defaultTransitionDurationMs,
  } from '$lib/tw-var';
  import { reProjectPoint, reProjectPointInverse } from '../OlMap/utils';
  import { prefersReducedMotion } from 'svelte/motion';
  import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';

  export interface TrackPoint {
    coord: Vector2;
    yaw?: number;
    scaleY?: number;
  }

  export interface SelectedTrackPoint extends TrackPoint {
    index: number;
  }

  export interface EditorOlMapProps {
    /*
     * The class to apply to the map element
     */
    class?: ClassValue;
    /*
     * Map points
     */
    points: TrackPoint[];
    /*
     * the currently selected point
     */
    selectedPoint?: SelectedTrackPoint;
    /*
     * show point as gate
     */
    gateMode?: boolean;
    /*
     * show point numbers
     */
    showNum?: boolean;
    /*
     * Callback fired when a point is clicked
     */
    onPointClick?: (index: number | undefined) => void;
    /*
     * Callback fired when a point is moved/dragged in draggable group
     */
    onSelectedPointMove?: (newCoord: Vector2) => void;
  }

  const {
    class: propsClass,
    points,
    onPointClick,
    onSelectedPointMove,
    selectedPoint,
    gateMode = false,
    showNum = false,
  }: EditorOlMapProps = $props();

  // ──────────────────────────────────────────────
  // Source IDs
  // ──────────────────────────────────────────────
  const SRC_TRACK = 'editor-track';
  const SRC_LINE = 'editor-line';
  const SRC_SELECTED = 'editor-selected';
  const SRC_GATE = 'editor-gate';
  const SRC_SELECTED_GATE = 'editor-selected-gate';

  // Layer IDs
  const LYR_LINE = 'editor-line-layer';
  const LYR_TRACK = 'editor-track-layer';
  const LYR_ARROW = 'editor-arrow-layer';
  const LYR_NUMBER = 'editor-number-layer';
  const LYR_SELECTED = 'editor-selected-layer';
  const LYR_SELECTED_ARROW = 'editor-selected-arrow-layer';
  const LYR_GATE = 'editor-gate-layer';
  const LYR_SELECTED_GATE = 'editor-selected-gate-layer';

  // Arrow icon as base64 SVG
  const ARROW_SVG =
    'data:image/svg+xml;base64,' +
    btoa(
      `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">` +
        `<path d="M10 2 L18 10 L14 10 L14 18 L6 18 L6 10 L2 10 Z" fill="${colorRed600}"/>` +
        `</svg>`,
    );

  let mlMap: MaplibreMap | undefined = $state();
  let mapComponent: OlMap | undefined = $state();
  // Track the feature id of the hovered track point (for feature-state hover)
  let hoveredTrackId: number | null = null;
  // Drag state
  let isDragging = $state(false);

  // ──────────────────────────────────────────────
  // GeoJSON builders
  // ──────────────────────────────────────────────
  const buildTrackGeoJson = (): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: points
      .filter((_, i) => selectedPoint?.index !== i)
      .map((pt, localIdx) => {
        // map back to original index
        const originalIdx =
          selectedPoint !== undefined && localIdx >= selectedPoint.index
            ? localIdx + 1
            : localIdx;
        const [lng, lat] = reProjectPoint([pt.coord.x, pt.coord.y]);
        return {
          type: 'Feature',
          id: originalIdx,
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            index: originalIdx,
            yaw: pt.yaw ?? 0,
          },
        } satisfies GeoJSON.Feature;
      }),
  });

  const buildLineGeoJson = (): GeoJSON.FeatureCollection => {
    if (points.length < 2) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 0,
          geometry: {
            type: 'LineString',
            coordinates: points.map((pt) => reProjectPoint([pt.coord.x, pt.coord.y])),
          },
          properties: {},
        },
      ],
    };
  };

  const buildSelectedGeoJson = (): GeoJSON.FeatureCollection => {
    if (!selectedPoint) return { type: 'FeatureCollection', features: [] };
    const [lng, lat] = reProjectPoint([selectedPoint.coord.x, selectedPoint.coord.y]);
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 0,
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { yaw: selectedPoint.yaw ?? 0 },
        },
      ],
    };
  };

  const buildGateGeoJson = (
    pts: TrackPoint[],
    excludeIdx?: number,
  ): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: pts
      .map((pt, i) => {
        if (i === excludeIdx) return null;
        return makeGateFeature(pt, i, false);
      })
      .filter((f) => f !== null),
  });

  const buildSelectedGateGeoJson = (): GeoJSON.FeatureCollection => {
    if (!selectedPoint) return { type: 'FeatureCollection', features: [] };
    const f = makeGateFeature(selectedPoint, 0, false);
    return { type: 'FeatureCollection', features: [f] };
  };

  const makeGateFeature = (
    pt: TrackPoint,
    id: number,
    _selected: boolean,
  ): GeoJSON.Feature => {
    const [cx, cy] = reProjectPoint([pt.coord.x, pt.coord.y]);
    const yaw = pt.yaw ?? 0;
    const scaleY = pt.scaleY ?? 1;
    const halfWidth = (scaleY * 100) / 2;
    // Compute perpendicular in screen-degree space (small enough to be linear)
    const perpAngle = -(yaw + Math.PI / 2);
    const dLng = Math.cos(perpAngle) * halfWidth * (360 / 2200000);
    const dLat = Math.sin(perpAngle) * halfWidth * (170.102258 / 2200000);
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'LineString',
        coordinates: [
          [cx + dLng, cy + dLat],
          [cx - dLng, cy - dLat],
        ],
      },
      properties: { index: id },
    };
  };

  // ──────────────────────────────────────────────
  // Map setup
  // ──────────────────────────────────────────────
  const handleMapReady = (map: MaplibreMap) => {
    mlMap = map;

    // Load arrow icon
    const img = new Image(20, 20);
    img.onload = () => {
      if (!map.hasImage('arrow-icon')) map.addImage('arrow-icon', img);
    };
    img.src = ARROW_SVG;

    // Sources
    map.addSource(SRC_LINE, { type: 'geojson', data: buildLineGeoJson() });
    map.addSource(SRC_TRACK, { type: 'geojson', data: buildTrackGeoJson(), promoteId: 'index' });
    map.addSource(SRC_SELECTED, { type: 'geojson', data: buildSelectedGeoJson() });
    map.addSource(SRC_GATE, { type: 'geojson', data: buildGateGeoJson(points, selectedPoint?.index), promoteId: 'index' });
    map.addSource(SRC_SELECTED_GATE, { type: 'geojson', data: buildSelectedGateGeoJson() });

    // ── Line ──
    map.addLayer({
      id: LYR_LINE,
      type: 'line',
      source: SRC_LINE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': 'rgba(255,255,255,0.25)', 'line-width': 2 },
    });

    // ── Track points (non-selected) ──
    map.addLayer({
      id: LYR_TRACK,
      type: 'circle',
      source: SRC_TRACK,
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          colorSky400,
          colorSky600,
        ],
        'circle-stroke-color': colorSky950,
        'circle-stroke-width': 1,
        'circle-opacity': 1,
      },
    });

    // ── Arrow layer for non-selected points (symbol) ──
    map.addLayer({
      id: LYR_ARROW,
      type: 'symbol',
      source: SRC_TRACK,
      layout: {
        'icon-image': 'arrow-icon',
        'icon-size': 1,
        'icon-rotate': ['*', ['get', 'yaw'], 180 / Math.PI],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });

    // ── Point numbers ──
    map.addLayer({
      id: LYR_NUMBER,
      type: 'symbol',
      source: SRC_TRACK,
      layout: {
        'text-field': ['to-string', ['+', ['get', 'index'], 1]],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-offset': [0, -2.5],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        visibility: showNum ? 'visible' : 'none',
      },
      paint: {
        'text-color': colorTextDark,
        'text-halo-color': 'rgba(15,23,42,0.4)',
        'text-halo-width': 2,
      },
    });

    // ── Selected point ──
    map.addLayer({
      id: LYR_SELECTED,
      type: 'circle',
      source: SRC_SELECTED,
      paint: {
        'circle-radius': 6,
        'circle-color': colorAmber500,
        'circle-stroke-color': colorWhite,
        'circle-stroke-width': 1,
      },
    });

    // ── Selected arrow ──
    map.addLayer({
      id: LYR_SELECTED_ARROW,
      type: 'symbol',
      source: SRC_SELECTED,
      layout: {
        'icon-image': 'arrow-icon',
        'icon-size': 1,
        'icon-rotate': ['*', ['get', 'yaw'], 180 / Math.PI],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });

    // ── Gate layer ──
    map.addLayer({
      id: LYR_GATE,
      type: 'line',
      source: SRC_GATE,
      layout: { 'line-cap': 'butt', visibility: 'none' },
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          colorYellow300,
          colorYellow500,
        ],
        'line-width': 4,
      },
    });

    // ── Selected gate ──
    map.addLayer({
      id: LYR_SELECTED_GATE,
      type: 'line',
      source: SRC_SELECTED_GATE,
      layout: { 'line-cap': 'butt', visibility: 'none' },
      paint: { 'line-color': colorOrange500, 'line-width': 4 },
    });

    // ── Hover interactions ──
    map.on('mousemove', LYR_TRACK, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features?.[0];
      if (f && f.id !== hoveredTrackId) {
        if (hoveredTrackId !== null)
          map.setFeatureState({ source: SRC_TRACK, id: hoveredTrackId }, { hover: false });
        hoveredTrackId = f.id as number;
        map.setFeatureState({ source: SRC_TRACK, id: hoveredTrackId }, { hover: true });
      }
    });
    map.on('mouseleave', LYR_TRACK, () => {
      map.getCanvas().style.cursor = '';
      if (hoveredTrackId !== null)
        map.setFeatureState({ source: SRC_TRACK, id: hoveredTrackId }, { hover: false });
      hoveredTrackId = null;
    });

    map.on('mousemove', LYR_GATE, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features?.[0];
      if (f && f.id !== hoveredTrackId) {
        if (hoveredTrackId !== null)
          map.setFeatureState({ source: SRC_GATE, id: hoveredTrackId }, { hover: false });
        hoveredTrackId = f.id as number;
        map.setFeatureState({ source: SRC_GATE, id: hoveredTrackId }, { hover: true });
      }
    });
    map.on('mouseleave', LYR_GATE, () => {
      map.getCanvas().style.cursor = '';
      if (hoveredTrackId !== null)
        map.setFeatureState({ source: SRC_GATE, id: hoveredTrackId }, { hover: false });
      hoveredTrackId = null;
    });

    // ── Click to select ──
    map.on('click', LYR_TRACK, (e) => {
      const f = e.features?.[0];
      onPointClick?.(f ? (f.id as number) : undefined);
    });

    map.on('click', LYR_GATE, (e) => {
      const f = e.features?.[0];
      onPointClick?.(f ? (f.id as number) : undefined);
    });

    map.on('click', (e) => {
      const trackFeats = map.queryRenderedFeatures(e.point, {
        layers: [gateMode ? LYR_GATE : LYR_TRACK],
      });
      if (!trackFeats.length) onPointClick?.(undefined);
    });

    // ── Drag selected point ──
    map.on('mousedown', LYR_SELECTED, startDrag);
    map.on('mousedown', LYR_SELECTED_GATE, startDrag);
  };

  // ──────────────────────────────────────────────
  // Drag implementation
  // ──────────────────────────────────────────────
  const startDrag = (e: MapMouseEvent) => {
    if (!mlMap || !onSelectedPointMove || !selectedPoint) return;
    e.preventDefault();
    isDragging = true;
    mlMap.getCanvas().style.cursor = 'grabbing';
    mlMap.dragPan.disable();

    const onMove = (moveEvt: MapMouseEvent) => {
      if (!isDragging || !mlMap) return;
      const { lng, lat } = moveEvt.lngLat;
      const [xGame, yGame] = reProjectPointInverse([lng, lat]);
      onSelectedPointMove({ x: xGame, y: yGame });
    };

    const onUp = () => {
      if (!mlMap) return;
      isDragging = false;
      mlMap.getCanvas().style.cursor = '';
      mlMap.dragPan.enable();
      mlMap.off('mousemove', onMove);
      mlMap.off('mouseup', onUp);
    };

    mlMap.on('mousemove', onMove);
    mlMap.on('mouseup', onUp);
  };

  // ──────────────────────────────────────────────
  // Reactive source/layer updates
  // ──────────────────────────────────────────────
  $effect(() => {
    if (!mlMap?.loaded()) return;
    (mlMap.getSource(SRC_TRACK) as maplibregl.GeoJSONSource | undefined)?.setData(
      buildTrackGeoJson(),
    );
    (mlMap.getSource(SRC_LINE) as maplibregl.GeoJSONSource | undefined)?.setData(
      buildLineGeoJson(),
    );
    (mlMap.getSource(SRC_SELECTED) as maplibregl.GeoJSONSource | undefined)?.setData(
      buildSelectedGeoJson(),
    );
    (mlMap.getSource(SRC_GATE) as maplibregl.GeoJSONSource | undefined)?.setData(
      buildGateGeoJson(points, selectedPoint?.index),
    );
    (mlMap.getSource(SRC_SELECTED_GATE) as maplibregl.GeoJSONSource | undefined)?.setData(
      buildSelectedGateGeoJson(),
    );
  });

  $effect(() => {
    if (!mlMap?.loaded()) return;
    const visibility = (on: boolean): 'visible' | 'none' => (on ? 'visible' : 'none');
    mlMap.setLayoutProperty(LYR_TRACK, 'visibility', visibility(!gateMode));
    mlMap.setLayoutProperty(LYR_ARROW, 'visibility', visibility(!gateMode));
    mlMap.setLayoutProperty(LYR_SELECTED, 'visibility', visibility(!gateMode));
    mlMap.setLayoutProperty(LYR_SELECTED_ARROW, 'visibility', visibility(!gateMode));
    mlMap.setLayoutProperty(LYR_GATE, 'visibility', visibility(gateMode));
    mlMap.setLayoutProperty(LYR_SELECTED_GATE, 'visibility', visibility(gateMode));
  });

  $effect(() => {
    if (!mlMap?.loaded()) return;
    mlMap.setLayoutProperty(LYR_NUMBER, 'visibility', showNum ? 'visible' : 'none');
  });

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────
  export const zoomFit = () => {
    if (!points.length || !mlMap) return;
    const coords = points.map((p) => reProjectPoint([p.coord.x, p.coord.y]));
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const bounds: [number, number, number, number] = [
      Math.min(...lngs),
      Math.min(...lats),
      Math.max(...lngs),
      Math.max(...lats),
    ];
    mlMap.fitBounds(bounds, {
      padding: 64,
      duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs * 4,
    });
  };

  // Expose underlying map for compatibility with existing call sites that call
  // map.getMap() (e.g. old translate interaction code, now unused).
  export const getMap = () => mlMap;

  // Import maplibregl namespace for type assertions in effects above
  import maplibregl from 'maplibre-gl';
</script>

<OlMap
  class={propsClass}
  onMapReady={handleMapReady}
  bind:this={mapComponent}
/>
