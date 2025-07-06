<script lang="ts">
  import { onMount } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import Map from 'ol/Map';
  import View from 'ol/View';
  import WebGLTileLayer from 'ol/layer/WebGLTile';
  import 'ol/ol.css';
  import { Projection } from 'ol/proj';
  import { ImageTile } from 'ol/source';
  import { getCenter } from 'ol/extent';
  import { Zoom } from 'ol/control';
  import clsx from 'clsx';
  import type BaseLayer from 'ol/layer/Base';
  import { MAP_SIZE } from './utils';
  import type { MapBrowserEvent } from 'ol';
  import { defaults } from 'ol/interaction';
  import { defaultTransitionDurationMs } from '$lib/tw-var';

  let map: Map;

  export type OlMapProps = {
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
    onPointerMove?: (e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) => void;
    /**
     * Callback for pointer click events
     */
    onClick?: (e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) => void;
    /**
     * Callback for pointer right click events
     */
    onRightClick?: (e: MouseEvent, map: Map) => void;
  };

  let target: HTMLDivElement;
  let {
    class: propsClassName,
    zoomClass,
    zoomInClass,
    zoomOutClass,
    layers,
    onPointerMove,
    onClick,
    onRightClick,
  }: OlMapProps = $props();

  onMount(() => {
    const projection = new Projection({
      code: 'customData',
      units: 'pixels',
      extent: [0, 0, MAP_SIZE, MAP_SIZE],
      worldExtent: [0, 0, MAP_SIZE, MAP_SIZE],
    });

    const zoom = new Zoom({
      className: clsx('ol-zoom', zoomClass),
      zoomInClassName: clsx('ol-zoom-in', zoomInClass),
      zoomOutClassName: clsx('ol-zoom-out', zoomOutClass),
      duration: defaultTransitionDurationMs * 2,
    });

    const interactions = defaults({ altShiftDragRotate: false, pinchRotate: false });

    map = new Map({
      interactions,
      controls: [zoom],
      layers: [
        new WebGLTileLayer({
          source: new ImageTile({
            url: '/map_tiles/{z}_{x}_{y}.avif',
            minZoom: 2,
            maxZoom: 6,
            wrapX: false,
            projection: projection,
          }),
        }),
        ...(layers ?? []),
      ],
      target: target,
      view: new View({
        projection: projection,
        center: getCenter(projection.getExtent()),
        zoom: 1,
        maxZoom: 8,
        extent: [0 - MAP_SIZE, 0 - MAP_SIZE, MAP_SIZE + MAP_SIZE, MAP_SIZE + MAP_SIZE],
      }),
    });

    const handlePointerMove = (e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) => {
      onPointerMove?.(e);
    };

    map.on('pointermove', handlePointerMove);

    const handleClick = (e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) => {
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

    return () => {
      map.un('pointermove', handlePointerMove);
      map.un('click', handleClick);
      map.getViewport().removeEventListener('contextmenu', handleContextMenu);
      map.setTarget();
    };
  });

  export const centerOn = ([x, y]: [number, number], instant = false) => {
    map.getView().animate({
      zoom: 5,
      center: [x, y],
      duration: instant ? 0 : defaultTransitionDurationMs * 4,
    });
  };
</script>

<div class={propsClassName} bind:this={target}></div>
