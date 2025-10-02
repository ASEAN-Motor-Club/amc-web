<script lang="ts">
  import type { Vector2 } from '$lib/types';
  import type { ClassValue } from 'svelte/elements';
  import OlMap from '../OlMap/OlMap.svelte';
  import VectorSource from 'ol/source/Vector';
  import WebGLVectorLayer from 'ol/layer/WebGLVector';
  import { Feature } from 'ol';
  import { Point, LineString } from 'ol/geom';
  import {
    colorPrimary400,
    colorSecondary500,
    colorPrimary600,
    colorRed600,
    colorYellow500,
    colorYellow300,
    colorOrange500,
    colorYellow100,
  } from '$lib/tw-var';
  import type { MapBrowserEvent } from 'ol';
  import { reProjectPoint, reProjectPointInverse } from '../OlMap/utils';
  import Translate from 'ol/interaction/Translate';

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
     * The class to apply to the zoom element
     */
    zoomClass?: ClassValue;
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
     * Callback fired when a point is clicked
     */
    onPointClick?: (index: number | undefined) => void;
    /*
     * Callback fired when a point is moved/dragged in draggable group
     */
    onSelectedPointMove?: (newCoord: Vector2) => void;
  }

  const {
    class: propsClassName,
    points,
    onPointClick,
    onSelectedPointMove,
    selectedPoint,
    zoomClass,
    gateMode = false,
  }: EditorOlMapProps = $props();

  const trackPointSource = new VectorSource();
  const lineSource = new VectorSource();
  const selectedPointSource = new VectorSource();
  const gateSource = new VectorSource();
  const selectedGateSource = new VectorSource();

  const trackPointLayer = new WebGLVectorLayer({
    source: trackPointSource,
    style: {
      'circle-radius': 6,
      'circle-fill-color': ['match', ['get', 'hover'], 1, colorPrimary400, colorPrimary600],
      'circle-stroke-color': 'black',
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
      'circle-opacity': ['match', ['get', 'selected'], 1, 0.5, 1],
    },
  });

  const arrowLayer = new WebGLVectorLayer({
    source: trackPointSource,
    style: {
      'icon-src':
        'data:image/svg+xml;base64,' +
        btoa(`
        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2 L18 10 L14 10 L14 18 L6 18 L6 10 L2 10 Z" fill="${colorRed600}"/>
        </svg>
      `),
      'icon-width': 20,
      'icon-height': 20,
      'icon-rotation': ['+', ['get', 'yaw'], Math.PI / 2],
      'icon-rotate-with-view': false,
      'icon-anchor': [0.5, 0.8],
      'icon-opacity': ['match', ['get', 'selected'], 1, 0.5, 1],
    },
  });

  const lineLayer = new WebGLVectorLayer({
    source: lineSource,
    style: {
      'stroke-color': 'rgba(255, 255, 255, 0.25)',
      'stroke-width': 2,
      'stroke-line-cap': 'round',
      'stroke-line-join': 'round',
    },
  });

  const selectedPointLayer = new WebGLVectorLayer({
    source: selectedPointSource,
    style: {
      'circle-radius': 6,
      'circle-fill-color': colorSecondary500,
      'circle-stroke-color': 'white',
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  const selectedArrowLayer = new WebGLVectorLayer({
    source: selectedPointSource,
    style: {
      'icon-src':
        'data:image/svg+xml;base64,' +
        btoa(`
        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2 L18 10 L14 10 L14 18 L6 18 L6 10 L2 10 Z" fill="${colorRed600}"/>
        </svg>
      `),
      'icon-width': 20,
      'icon-height': 20,
      'icon-rotation': ['+', ['get', 'yaw'], Math.PI / 2],
      'icon-rotate-with-view': false,
      'icon-anchor': [0.5, 0.8],
    },
  });

  const gateLayer = new WebGLVectorLayer({
    source: gateSource,
    style: {
      'stroke-color': [
        'case',
        ['==', ['get', 'selected'], 1],
        colorYellow100,
        ['==', ['get', 'hover'], 1],
        colorYellow300,
        colorYellow500,
      ],
      'stroke-width': 4,
      'stroke-line-cap': 'butt',
    },
  });

  const selectedGateLayer = new WebGLVectorLayer({
    source: selectedGateSource,
    style: {
      'stroke-color': colorOrange500,
      'stroke-width': 4,
      'stroke-line-cap': 'butt',
    },
  });

  $effect(() => {
    trackPointSource.clear(true);
    lineSource.clear(true);
    selectedPointSource.clear(true);
    gateSource.clear(true);
    selectedGateSource.clear(true);

    const pointFeatures: Feature[] = [];
    const gateFeatures: Feature[] = [];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const reprojectedPoint = reProjectPoint([point.coord.x, point.coord.y]);

      const isSelected = selectedPoint && selectedPoint.index === i;

      if (gateMode) {
        const yaw = point.yaw ?? 0;
        const scaleY = point.scaleY ?? 1;
        const halfWidth = (scaleY * 100) / 2;

        const perpAngle = -(yaw + Math.PI / 2);

        const x1 = reprojectedPoint[0] + Math.cos(perpAngle) * halfWidth;
        const y1 = reprojectedPoint[1] + Math.sin(perpAngle) * halfWidth;
        const x2 = reprojectedPoint[0] - Math.cos(perpAngle) * halfWidth;
        const y2 = reprojectedPoint[1] - Math.sin(perpAngle) * halfWidth;

        const gateFeature = new Feature({
          geometry: new LineString([
            [x1, y1],
            [x2, y2],
          ]),
          index: i,
          selected: isSelected ? 1 : 0,
        });

        gateFeatures.push(gateFeature);
      } else {
        const pointFeature = new Feature({
          geometry: new Point(reprojectedPoint),
          yaw: point.yaw ?? 0,
          index: i,
          selected: isSelected ? 1 : 0,
        });

        pointFeatures.push(pointFeature);
      }
    }

    if (gateMode) {
      gateSource.addFeatures(gateFeatures);
    } else {
      trackPointSource.addFeatures(pointFeatures);
    }

    if (selectedPoint) {
      const selectedIndex = selectedPoint.index;
      if (selectedIndex >= 0 && selectedIndex < points.length) {
        const reprojectedPoint = reProjectPoint([selectedPoint.coord.x, selectedPoint.coord.y]);

        if (gateMode) {
          const yaw = selectedPoint.yaw ?? 0;
          const scaleY = selectedPoint.scaleY ?? 1;
          const halfWidth = (scaleY * 100) / 2;

          const perpAngle = -(yaw + Math.PI / 2);

          const x1 = reprojectedPoint[0] - Math.cos(perpAngle) * halfWidth;
          const y1 = reprojectedPoint[1] - Math.sin(perpAngle) * halfWidth;
          const x2 = reprojectedPoint[0] + Math.cos(perpAngle) * halfWidth;
          const y2 = reprojectedPoint[1] + Math.sin(perpAngle) * halfWidth;

          const selectedGateFeature = new Feature({
            geometry: new LineString([
              [x1, y1],
              [x2, y2],
            ]),
          });

          selectedGateSource.addFeatures([selectedGateFeature]);
        } else {
          console.log(selectedPoint.yaw);
          const selectedFeature = new Feature({
            geometry: new Point(reprojectedPoint),
            yaw: selectedPoint.yaw ?? 0,
          });

          selectedPointSource.addFeatures([selectedFeature]);
        }
      }
    }

    if (points.length >= 2) {
      const lineCoordinates = points.map((point) => reProjectPoint([point.coord.x, point.coord.y]));

      const lineFeature = new Feature({
        geometry: new LineString(lineCoordinates),
      });

      lineSource.addFeatures([lineFeature]);
    }
  });

  $effect(() => {
    if (translateInteraction && map.getMap) {
      map.getMap().removeInteraction(translateInteraction);
      translateInteraction = null;
    }

    if (selectedPoint && onSelectedPointMove && map.getMap) {
      translateInteraction = createTranslateInteraction();
      map.getMap().addInteraction(translateInteraction);
    }

    return () => {
      if (translateInteraction && map.getMap) {
        map.getMap().removeInteraction(translateInteraction);
        translateInteraction = null;
      }
    };
  });

  let map: OlMap;
  let currentHoveredFeature: Feature | null = null;
  let translateInteraction: Translate | null = null;

  const createTranslateInteraction = () => {
    const translate = new Translate({
      layers: gateMode ? [selectedGateLayer] : [selectedPointLayer],
    });

    translate.on('translateend', (event) => {
      if (!onSelectedPointMove || !selectedPoint) return;

      const features = event.features.getArray();
      if (features.length > 0) {
        const feature = features[0];
        const geometry = feature.getGeometry();
        let newCoordinates: [number, number];

        if (gateMode) {
          const lineGeometry = geometry as LineString;
          const coordinates = lineGeometry.getCoordinates();
          const center = [
            (coordinates[0][0] + coordinates[1][0]) / 2,
            (coordinates[0][1] + coordinates[1][1]) / 2,
          ];
          newCoordinates = center as [number, number];
        } else {
          const pointGeometry = geometry as Point;
          newCoordinates = pointGeometry.getCoordinates() as [number, number];
        }

        const originalCoord = reProjectPointInverse(newCoordinates);

        onSelectedPointMove({ x: originalCoord[0], y: originalCoord[1] });
      }
    });

    return translate;
  };

  const handleMapClick = (e: MapBrowserEvent) => {
    if (!onPointClick) return;

    let clickedIndex: number | undefined;
    e.map.forEachFeatureAtPixel(
      e.pixel,
      (feature) => {
        const index = feature.get('index');
        if (index !== undefined) {
          clickedIndex = index;
          return true;
        }
        return false;
      },
      {
        layerFilter: (layer) => layer === (gateMode ? gateLayer : trackPointLayer),
      },
    );

    onPointClick(clickedIndex);
  };

  const handlePointerMove = (e: MapBrowserEvent) => {
    currentHoveredFeature?.set('hover', false);

    e.map.forEachFeatureAtPixel(
      e.pixel,
      (feature) => {
        (feature as Feature).set('hover', true);
        currentHoveredFeature = feature as Feature;
        return true;
      },
      {
        layerFilter: (layer) => layer === (gateMode ? gateLayer : trackPointLayer),
      },
    );
  };

  export const zoomFit = () => {
    if (points.length) {
      const source = gateMode ? gateSource : trackPointSource;
      const extent = source.getExtent();
      map.fit(extent, [64, 64, 64, 64]);
    }
  };

  $effect(() => {
    if (gateMode) {
      gateLayer.setVisible(true);
      selectedGateLayer.setVisible(true);

      trackPointLayer.setVisible(false);
      arrowLayer.setVisible(false);
      selectedPointLayer.setVisible(false);
      selectedArrowLayer.setVisible(false);
    } else {
      gateLayer.setVisible(false);
      selectedGateLayer.setVisible(false);

      trackPointLayer.setVisible(true);
      arrowLayer.setVisible(true);
      selectedPointLayer.setVisible(true);
      selectedArrowLayer.setVisible(true);
    }
  });

  const layers = [
    lineLayer,
    arrowLayer,
    trackPointLayer,
    selectedArrowLayer,
    selectedPointLayer,
    gateLayer,
    selectedGateLayer,
  ];
</script>

<OlMap
  class={propsClassName}
  {zoomClass}
  {layers}
  onClick={handleMapClick}
  onPointerMove={handlePointerMove}
  bind:this={map}
></OlMap>
