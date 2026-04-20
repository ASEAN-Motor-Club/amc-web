<script lang="ts">
  import { onMount } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import maplibregl, { type Map as MaplibreMap, type MapMouseEvent, type MapLibreEvent } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { MAP_REAL_SIZE } from './utils';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { prefersReducedMotion } from 'svelte/motion';
  import Button from '../Button/Button.svelte';
  import Icon from '../Icon/Icon.svelte';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';

  let mlMap: MaplibreMap;

  export interface OlMapProps {
    /**
     * CSS class applied to the map container element.
     */
    class?: ClassValue;
    /**
     * Callback for pointer-move events.
     */
    onPointerMove?: (e: MapMouseEvent) => void;
    /**
     * Callback for click events.
     */
    onClick?: (e: MapMouseEvent) => void;
    /**
     * Callback for right-click / context-menu events.
     */
    onRightClick?: (e: MapMouseEvent) => void;
    /**
     * Callback fired while the user drags the map.
     */
    onPointerDrag?: (e: MapLibreEvent) => void;
    /**
     * Callback fired when the map starts moving.
     */
    onMoveStart?: (e: MapLibreEvent) => void;
    /**
     * Callback fired once the map style has fully loaded and sources/layers can
     * be added.
     */
    onMapReady?: (map: MaplibreMap) => void;
  }

  let target: HTMLDivElement;
  const {
    class: propsClass,
    onPointerMove,
    onClick,
    onRightClick,
    onPointerDrag,
    onMoveStart,
    onMapReady,
  }: OlMapProps = $props();

  onMount(() => {
    mlMap = new maplibregl.Map({
      container: target,
      style: {
        version: 8,
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        sources: {
          'game-map': {
            type: 'raster',
            tiles: ['/map_tiles/718/{z}_{x}_{y}.avif'],
            minzoom: 2,
            maxzoom: 5,
            tileSize: 256,
            bounds: [-180, -85.051129, 180, 85.051129],
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#253352' },
          },
          {
            id: 'game-map-layer',
            type: 'raster',
            source: 'game-map',
            paint: {
              'raster-brightness-min': 0.5,
              'raster-gamma': 1.5,
            },
          } as maplibregl.RasterLayerSpecification,
        ],
      },
      center: [0, 0],
      zoom: 1,
      minZoom: 0,
      maxZoom: 8,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    });

    mlMap.on('mousemove', (e) => onPointerMove?.(e));
    mlMap.on('click', (e) => onClick?.(e));
    mlMap.on('contextmenu', (e) => onRightClick?.(e));
    mlMap.on('drag', (e) => onPointerDrag?.(e));
    mlMap.on('movestart', (e) => onMoveStart?.(e));

    mlMap.on('load', () => {
      onMapReady?.(mlMap);
    });

    return () => {
      mlMap.remove();
    };
  });

  /**
   * Fly to a position given as MapLibre [lng, lat] (i.e. the output of
   * `reProjectPoint`).
   */
  export const centerOn = (
    [lng, lat]: [number, number],
    duration = defaultTransitionDurationMs * 4,
    zoom = true,
  ) => {
    mlMap.flyTo({
      center: [lng, lat],
      zoom: zoom ? 5 : mlMap.getZoom(),
      duration: prefersReducedMotion.current ? 0 : duration,
    });
  };

  /**
   * Fit the map to a bounding box given as [west, south, east, north] in
   * MapLibre lng/lat.
   */
  export const fit = (
    bounds: [number, number, number, number],
    padding?: number | maplibregl.PaddingOptions,
    duration = defaultTransitionDurationMs * 4,
  ) => {
    mlMap.fitBounds(bounds, {
      padding: padding ?? 0,
      duration: prefersReducedMotion.current ? 0 : duration,
    });
  };

  /** Return the underlying MapLibre Map instance. */
  export const getMap = (): MaplibreMap => mlMap;
</script>

<div class="relative h-full w-full">
  <div
    class={twMerge('bg-[#253352]', clsx(propsClass))}
    bind:this={target}
  ></div>
  <div
    class="absolute right-4 bottom-4 flex flex-col rounded-sm shadow ring !shadow-white/3 !ring-white/5"
  >
    <Button
      class="text-text-dark pointer-events-auto rounded-b-none !bg-gray-900/50 backdrop-blur-sm hover:!bg-gray-900/40 focus:!bg-gray-900/60"
      color="custom"
      size="sm"
      icon
      onClick={() => {
        if (mlMap) {
          mlMap.flyTo({
            zoom: mlMap.getZoom() + 1,
            duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs * 2,
          });
        }
      }}
    >
      <Icon class="i-material-symbols:add-2-rounded" />
    </Button>
    <div class="w-full border-b border-b-white/25 bg-gray-900/50"></div>
    <Button
      class="text-text-dark pointer-events-auto rounded-t-none !bg-gray-900/50 backdrop-blur-sm hover:!bg-gray-900/40 focus:!bg-gray-900/60"
      color="custom"
      size="sm"
      icon
      onClick={() => {
        if (mlMap) {
          mlMap.flyTo({
            zoom: mlMap.getZoom() - 1,
            duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs * 2,
          });
        }
      }}
    >
      <Icon class="i-material-symbols:remove-rounded" />
    </Button>
  </div>
</div>
