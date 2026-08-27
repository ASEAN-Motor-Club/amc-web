<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import Feature from 'ol/Feature';
  import type { DeliveryJob, HouseData } from '$lib/api/types';
  import {
    PointType,
    type MapSelection,
    type MapState,
    type PlayerData,
    type TeleportPoint,
  } from '$lib/components/Map/Map/types';
  import {
    deliveryPoints as deliveryPointsList,
    type DeliveryPoint,
  } from '$lib/data/deliveryPoint';
  import { getMatchJobDestFn, getMatchJobSourceFn } from '$lib/utils/delivery';
  import { houses as housesList } from '$lib/data/house';
  import type { House } from '$lib/data/house';
  import type { DeliveryLineData } from './deliveryLine';
  import type { Pins } from '$lib/schema/pin';
  import { createThreeMapScene, type ThreeMapScene } from '$lib/ui/ThreeMap/scene';
  import { ZOOM_BUTTON_LOG_STEP } from '$lib/ui/ThreeMap/constants';
  import type { PoiMarker, PoiInput } from '$lib/ui/ThreeMap/poiManager';
  import { m } from '$messages';
  import { reProjectPointInverse } from '$lib/ui/OlMap/utils';
  import type { Vector3 } from '$lib/types';
  import Button from '$lib/ui/Button/Button.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export interface ThreeMapWrapperProps {
    /** CSS class to apply to the 3D map container */
    class?: ClassValue;
    /** Whether the map is currently detached into a picture-in-picture window */
    pipActive: boolean;
    enterPip: () => void;
    mapState: MapState;
    jobsData: DeliveryJob[];
    playerData: PlayerData[];
    houseData: HouseData | undefined;
    pinsData: Pins;
    teleportData: TeleportPoint[];
    /** Lines to draw around the hovered or locked delivery point - not drawn in 3D (stage 2) */
    deliveryLineData?: DeliveryLineData;
    /** Point to highlight and lock the map onto, driven by the URL */
    selection?: MapSelection;
    onHover?: (feature: Feature | undefined, pixel: [x: number, y: number]) => void;
    onClick?: (feature: Feature | undefined) => void;
    onRightClick?: (feature: Feature | undefined) => void;
  }

  const {
    class: propsClass,
    pipActive,
    mapState,
    playerData,
    houseData,
    pinsData,
    teleportData,
    selection,
    onHover,
    onClick,
    onRightClick,
    enterPip: _enterPip,
    jobsData,
    deliveryLineData: _deliveryLineData,
  }: ThreeMapWrapperProps = $props();

  // One +/- click steps log-distance by ZOOM_BUTTON_LOG_STEP: ×e^0.2 ≈ ×1.22,
  // matched to the OL map's button feel. Positive = zoom out.

  let container: HTMLDivElement;
  let three = $state<ThreeMapScene | undefined>(undefined);

  /** px-space (0..2200000) point → game Vector3 (x right, y down, z up). */
  function pxToGame(px: [x: number, y: number]): Vector3 {
    const g = reProjectPointInverse(px);
    return { x: g.x, y: g.y, z: 0 };
  }

  function playerCoord(point: PlayerData): Vector3 {
    // PlayerData.coord is the raw game coord (proto x/y/z); geometry is px-only.
    return { x: point.coord.x, y: point.coord.y, z: point.coord.z ?? 0 };
  }

  function pinCoord(point: Pins[number]): Vector3 {
    return pxToGame([point.x, point.y]);
  }
  /** OL's job role for a delivery point: 1 = job source, 2 = job destination, else 0. */
  function jobsFor(point: DeliveryPoint): 0 | 1 | 2 {
    return jobsData.some(getMatchJobSourceFn(point))
      ? 1
      : jobsData.some(getMatchJobDestFn(point))
        ? 2
        : 0;
  }

  // ---- Per-type POI sets: one data source each, so a changing source (e.g. live
  // player updates) only touches its own markers, never the other layers. ----
  const deliveryPois = $derived.by(() => {
    if (!mapState.delivery) return [];
    return deliveryPointsList.map((point) => ({
      pointType: PointType.Delivery,
      id: point.guid,
      coord: point.coord,
      info: point,
      jobs: jobsFor(point),
    }));
  });

  const housePois = $derived.by(() => {
    if (!mapState.house) return [];
    return housesList.map((point) => ({
      pointType: PointType.House,
      id: point.name,
      coord: point.coord,
      info: point,
    }));
  });

  const playerPois = $derived.by(() => {
    if (!mapState.player) return [];
    return playerData.map((point) => ({
      pointType: PointType.Player,
      id: point.guid,
      coord: playerCoord(point),
      info: point,
    }));
  });

  const pinPois = $derived.by(() => {
    if (!mapState.pins) return [];
    const pois: PoiInput[] = [];
    for (let i = 0; i < pinsData.length; i++) {
      const point = pinsData[i];
      pois.push({
        pointType: PointType.Pin,
        id: i.toString(),
        coord: pinCoord(point),
        info: point,
      });
    }
    return pois;
  });

  const teleportPois = $derived.by(() => {
    if (!mapState.teleport) return [];
    return teleportData.map((point) => ({
      pointType: PointType.Teleport,
      id: point.name,
      coord: point.coord,
      info: point,
    }));
  });

  // ---- POI set effects: one per data source, so each only reconciles its own type. ----
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.Delivery, deliveryPois);
  });
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.House, housePois);
  });
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.Player, playerPois);
  });
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.Pin, pinPois);
  });
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.Teleport, teleportPois);
  });

  // ---- visibility toggles ----
  $effect(() => {
    if (!three) return;
    const pm = three.poiManager;
    for (const marker of pm.markers()) {
      const visible = (() => {
        switch (marker.pointType) {
          case PointType.Delivery:
            return mapState.delivery;
          case PointType.House:
            return mapState.house;
          case PointType.Player:
            return mapState.player;
          case PointType.Pin:
            return mapState.pins;
          case PointType.Teleport:
            return mapState.teleport;
          default:
            return true;
        }
      })();
      pm.setMarkerVisible(marker.id, visible);
    }
  });

  // ---- labels: one label concern per effect, re-applied when that type's set changes
  // (a toggled layer recreates markers which need their labels set again). ----
  $effect(() => {
    if (!three) return;
    void playerPois;
    const pm = three.poiManager;
    const show = mapState.playerName;
    for (const marker of pm.markersOf(PointType.Player)) {
      pm.setLabel(marker.id, show ? (marker.info as PlayerData).name : '');
    }
  });
  $effect(() => {
    if (!three) return;
    void teleportPois;
    const pm = three.poiManager;
    const show = mapState.teleportLabels;
    for (const marker of pm.markersOf(PointType.Teleport)) {
      pm.setLabel(marker.id, show ? (marker.info as TeleportPoint).name : '');
    }
  });
  $effect(() => {
    if (!three) return;
    void pinPois;
    const pm = three.poiManager;
    const show = mapState.pinLabels;
    for (const marker of pm.markersOf(PointType.Pin)) {
      pm.setLabel(marker.id, show ? (marker.info as Pins[number]).label : '');
    }
  });
  $effect(() => {
    if (!three) return;
    void housePois;
    const pm = three.poiManager;
    const show = mapState.houseLabels;
    const vacantOnly = mapState.houseVacantOnly;
    for (const marker of pm.markersOf(PointType.House)) {
      if (!show) {
        pm.setLabel(marker.id, '');
        continue;
      }
      const house = marker.info as House;
      const owner = houseData?.[house.name]?.ownerName;
      if (vacantOnly && !owner) {
        pm.setLabel(marker.id, '');
        continue;
      }
      pm.setLabel(marker.id, owner ?? m['housing.vacant']());
    }
  });

  // ---- hover ----
  let hoveredMarker: PoiMarker | undefined = $state();
  let lastPixel: [x: number, y: number] | undefined = $state();

  function markerFeature(marker: PoiMarker | undefined): Feature | undefined {
    if (!marker) return undefined;
    const f = new Feature();
    f.set('pointType', marker.pointType);
    f.set('info', marker.info);
    return f;
  }

  let pendingRaycaster = new THREE.Raycaster();

  function pickAtPointer(event: { clientX: number; clientY: number }): PoiMarker | undefined {
    if (!three) return undefined;
    const rect = three.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    pendingRaycaster.setFromCamera(ndc, three.camera);
    return three.poiManager.pick(pendingRaycaster, ndc) ?? undefined;
  }

  function updateHoverAt(event: { clientX: number; clientY: number }): void {
    const marker = pickAtPointer(event);
    if (marker === hoveredMarker) return;
    hoveredMarker = marker;
    onHover?.(markerFeature(marker), lastPixel ?? [-1, -1]);
  }

  // ---- pointer events ----
  function onPointerMove(event: PointerEvent): void {
    if (!three) return;
    // OL reports container-relative pixels; the tooltip is positioned inside the map
    // container, so client coords would float it by the container's viewport offset.
    const rect = container.getBoundingClientRect();
    lastPixel = [event.clientX - rect.left, event.clientY - rect.top];
    updateHoverAt(event);
  }

  function onPointerDown(event: PointerEvent): void {
    if (!three || event.button !== 0) return;
    updateHoverAt(event);
    onClick?.(markerFeature(hoveredMarker));
  }

  function onContextMenu(event: Event): void {
    if (!three) return;
    event.preventDefault();
    onRightClick?.(markerFeature(hoveredMarker));
  }

  onMount(() => {
    three = createThreeMapScene(container);
    const dom = three.renderer.domElement;
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('contextmenu', onContextMenu);

    return () => {
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('contextmenu', onContextMenu);
      three?.dispose();
      three = undefined;
    };
  });

  const zoomIn = () => three?.stepBy(ZOOM_BUTTON_LOG_STEP);
  const zoomOut = () => three?.stepBy(-ZOOM_BUTTON_LOG_STEP);

  // ---- selection lock ----
  let lastCenteredSelection = $state<string | undefined>(undefined);

  /** Glide the selected marker to screen center: the scene's selectionPan servo
   * measures the ground-plane delta to the marker's height plane once, then
   * eases camera+target along it together, so orbit and zoom are preserved.
   * Reduced motion lands immediately (the servo handles it). */
  function centerOnSelection(): void {
    if (!three || !selection || lastCenteredSelection === selection.id) return;
    const marker = three.poiManager.markerById(selection.id);
    if (!marker) return;
    lastCenteredSelection = selection.id;
    three.selectionPan.panTo(marker.world[0], marker.world[1], marker.world[2]);
  }

  $effect(() => {
    if (!three || !selection) return;
    // Re-run when the selected layer's set changes - the marker may arrive after the
    // selection effect first fires (the toggles in Map.svelte run in their own effect).
    switch (selection.pointType) {
      case PointType.House:
        void housePois;
        break;
      case PointType.Delivery:
        void deliveryPois;
        break;
      case PointType.Player:
        void playerPois;
        break;
      case PointType.Pin:
        void pinPois;
        break;
    }
    centerOnSelection();
  });
</script>

<div class="relative h-full w-full">
  <div class={twMerge('h-full w-full', clsx(propsClass))} bind:this={container}></div>
  {#if !pipActive}
    <div class="absolute right-4 bottom-4 flex flex-col gap-2">
      <div class="flex flex-col rounded-sm shadow ring !shadow-white/3 !ring-white/5">
        <Button
          class="text-text-dark pointer-events-auto rounded-b-none !bg-gray-900/50 backdrop-blur-sm hover:!bg-gray-900/40 focus:!bg-gray-900/60"
          color="custom"
          size="sm"
          icon
          onClick={zoomIn}
        >
          <Icon class="i-material-symbols:add-2-rounded" />
        </Button>
        <div class="w-full border-b border-b-white/25 bg-gray-900/50"></div>
        <Button
          class="text-text-dark pointer-events-auto rounded-t-none !bg-gray-900/50 backdrop-blur-sm hover:!bg-gray-900/40 focus:!bg-gray-900/60"
          color="custom"
          size="sm"
          icon
          onClick={zoomOut}
        >
          <Icon class="i-material-symbols:remove-rounded" />
        </Button>
      </div>
    </div>
  {/if}
</div>
