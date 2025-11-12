<script lang="ts">
  import { onMount } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import Map from 'ol/Map';
  import View from 'ol/View';
  import WebGLTileLayer from 'ol/layer/WebGLTile';
  import 'ol/ol.css';
  import { Projection } from 'ol/proj';
  import { ImageTile } from 'ol/source';
  import { getCenter, type Extent } from 'ol/extent';
  import { Zoom } from 'ol/control';
  import clsx from 'clsx';
  import type BaseLayer from 'ol/layer/Base';
  import { MAP_REAL_SIZE } from './utils';
  import type { MapBrowserEvent, MapEvent } from 'ol';
  import { defaults } from 'ol/interaction';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { prefersReducedMotion } from 'svelte/motion';
  import type { SimpleGeometry } from 'ol/geom';

  let map: Map;

  export interface OlMapProps {
    /**
     * Others layer to display on the map, usually map points. Please use utils/reProjectPoint to convert coordinates
     */
    layers?: BaseLayer[];
    /*
     * The class to apply to the map element
     */
    class?: ClassValue;
    /**
     * The class to apply to ol zoom buttons
     */
    zoomClass?: ClassValue;
    /**
     * The class to apply to ol zoom in button
     */
    zoomInClass?: ClassValue;
    /**
     * The class to apply to ol zoom out button
     */
    zoomOutClass?: ClassValue;
    /**
     * Callback for pointer move events
     */
    onPointerMove?: (e: MapBrowserEvent) => void;
    /**
     * Callback for pointer click events
     */
    onClick?: (e: MapBrowserEvent) => void;
    /**
     * Callback for pointer right click events
     */
    onRightClick?: (e: MouseEvent, map: Map) => void;
    /**
     * Callback for pointer drag events
     */
    onPointerDrag?: (e: MapBrowserEvent) => void;
    /**
     * Callback for move start events
     */
    onMoveStart?: (e: MapEvent) => void;
  }

  let target: HTMLDivElement;
  const {
    class: propsClass,
    zoomClass,
    zoomInClass,
    zoomOutClass,
    layers,
    onPointerMove,
    onClick,
    onRightClick,
    onPointerDrag,
    onMoveStart,
  }: OlMapProps = $props();

  const projection = new Projection({
    code: 'customData',
    units: 'pixels',
    extent: [0, 0, MAP_REAL_SIZE, MAP_REAL_SIZE],
    worldExtent: [0, 0, MAP_REAL_SIZE, MAP_REAL_SIZE],
  });

  const tileLayer = new WebGLTileLayer({
    source: new ImageTile({
      url: '/map_tiles/716/{z}_{x}_{y}.avif',
      minZoom: 2,
      maxZoom: 6,
      wrapX: false,
      projection: projection,
    }),
    style: {
      exposure: 0.5,
      gamma: 1.5,
    },
  });

  const allLayers = $derived([tileLayer, ...(layers ?? [])]);

  onMount(() => {
    const zoom = new Zoom({
      className: clsx('ol-zoom', zoomClass),
      zoomInClassName: clsx('ol-zoom-in', zoomInClass),
      zoomOutClassName: clsx('ol-zoom-out', zoomOutClass),
      duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs * 2,
    });

    const interactions = defaults({ altShiftDragRotate: false, pinchRotate: false });

    map = new Map({
      interactions,
      controls: [zoom],
      layers: allLayers,
      target: target,
      view: new View({
        projection: projection,
        center: getCenter(projection.getExtent()),
        zoom: 1,
        maxZoom: 8,
        extent: [
          0 - MAP_REAL_SIZE,
          0 - MAP_REAL_SIZE,
          MAP_REAL_SIZE + MAP_REAL_SIZE,
          MAP_REAL_SIZE + MAP_REAL_SIZE,
        ],
      }),
    });

    const handlePointerMove = (e: MapBrowserEvent) => {
      onPointerMove?.(e);
    };

    map.on('pointermove', handlePointerMove);

    const handleClick = (e: MapBrowserEvent) => {
      onClick?.(e);
    };

    map.on('click', handleClick);

    const handleContextMenu = (ev: MouseEvent) => {
      if (onRightClick) {
        ev.preventDefault();
        onRightClick(ev, map);
      }
    };

    map.getViewport().addEventListener('contextmenu', handleContextMenu);

    const handlePointerDrag = (e: MapBrowserEvent) => {
      onPointerDrag?.(e);
    };

    map.on('pointerdrag', handlePointerDrag);

    const handleMoveStart = (e: MapEvent) => {
      onMoveStart?.(e);
    };

    map.on('movestart', handleMoveStart);

    return () => {
      map.un('pointermove', handlePointerMove);
      map.un('click', handleClick);
      map.un('pointerdrag', handlePointerDrag);
      map.un('movestart', handleMoveStart);
      map.getViewport().removeEventListener('contextmenu', handleContextMenu);
      map.setTarget();
    };
  });

  export const centerOn = (
    [x, y]: [number, number],
    duration = defaultTransitionDurationMs * 4,
    zoom = true,
  ) => {
    map.getView().animate({
      zoom: zoom ? 5 : undefined,
      center: [x, y],
      duration: prefersReducedMotion.current ? 0 : duration,
    });
  };

  export const fit = (
    geometryOrExtent: Extent | SimpleGeometry,
    padding?: number[],
    duration = defaultTransitionDurationMs * 4,
  ) => {
    map.getView().fit(geometryOrExtent, {
      duration: prefersReducedMotion.current ? 0 : duration,
      padding,
    });
  };

  export const getMap = () => map;

  $effect(() => {
    map.setLayers(allLayers);
  });
</script>

<div class={['bg-[lab(47.888%_-2.821_-32.915)]', propsClass]} bind:this={target}></div>
