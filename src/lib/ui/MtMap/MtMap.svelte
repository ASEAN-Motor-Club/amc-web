<script lang="ts">
  import 'mt-map';
  import type {
    PointsGroups as MtPointsGroups,
    MotorTownMap,
    Vector2 as MtVector2,
    MotorTownMapEvent,
  } from 'mt-map';
  import { onMount, untrack } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  export type PointsGroups = MtPointsGroups;
  export type Vector2 = MtVector2;
  export type PointClickEventDetail = MotorTownMapEvent['mt-map:point-click']['detail'];
  export type PointHoverEventDetail = MotorTownMapEvent['mt-map:point-hover']['detail'];
  export type PointMoveEventDetail = MotorTownMapEvent['mt-map:point-move']['detail'];

  export interface MtMapProps {
    /*
     * The class to apply to the map element
     */
    class?: ClassValue;
    /*
     * Road image URL
     */
    roadImage?: string;
    /*
     * Map image URL
     */
    mapImage?: string /*
     * Map points groups
     */;
    groups: PointsGroups;
    /*
     * Whether to automatically fit zoom to group when `groups` change. only work if `groups` have only one `trackMode` group
     */
    zoomFit?: boolean;
    /*
     * Group ID of the currently selected point
     */
    selectedPointId?: string;
    /*
     * Index of the currently selected point within its group
     */
    selectedPointIndex?: number;
    /*
     * Yaw rotation angle for the selected point (in radians)
     */
    selectedPointYaw?: number;
    /*
     * Y-axis scale factor for selected points
     */
    selectedPointsScaleY?: number;
    /*
     * Position offset for selected points
     */
    selectedPointsPosition?: Vector2;
    /*
     * Callback fired when a point is clicked
     */
    onPointClick?: (event: PointClickEventDetail) => void;
    /*
     * Callback fired when a point is hovered over
     */
    onPointHover?: (event: PointHoverEventDetail) => void;
    /*
     * Callback fired when a point is moved/dragged in draggable group
     */
    onPointMove?: (event: PointMoveEventDetail) => void;
  }

  const {
    class: propsClassName,
    roadImage,
    mapImage,
    groups,
    zoomFit,
    selectedPointId,
    selectedPointIndex,
    selectedPointYaw,
    selectedPointsScaleY,
    selectedPointsPosition,
    onPointClick,
    onPointHover,
    onPointMove,
  }: MtMapProps = $props();

  let map: MotorTownMap;

  $effect(() => {
    map.setPoints(groups);
    const zoom = untrack(() => zoomFit);
    if (zoom) {
      map.zoomFit();
    }
  });

  $effect(() => {
    map.setSelectedIndex(selectedPointId, selectedPointIndex);
    if (selectedPointYaw) {
      map.setSelectedPointYaw(selectedPointYaw);
    }
    if (selectedPointsScaleY) {
      map.setSelectedPointScaleY(selectedPointsScaleY);
    }
    if (selectedPointsPosition) {
      map.setSelectedPointPosition(selectedPointsPosition);
    }
  });
  onMount(() => {
    const handlePointClick = (event: MotorTownMapEvent['mt-map:point-click']) => {
      onPointClick?.(event.detail);
    };
    const handlePointHover = (event: MotorTownMapEvent['mt-map:point-hover']) => {
      onPointHover?.(event.detail);
    };
    const handlePointMove = (event: MotorTownMapEvent['mt-map:point-move']) => {
      onPointMove?.(event.detail);
    };

    map.addEventListener('mt-map:point-click', handlePointClick);
    map.addEventListener('mt-map:point-hover', handlePointHover);
    map.addEventListener('mt-map:point-move', handlePointMove);

    return () => {
      map.removeEventListener('mt-map:point-click', handlePointClick);
      map.removeEventListener('mt-map:point-hover', handlePointHover);
      map.removeEventListener('mt-map:point-move', handlePointMove);
    };
  });
</script>

<mt-map class={propsClassName} road={roadImage} map={mapImage} bind:this={map}></mt-map>
