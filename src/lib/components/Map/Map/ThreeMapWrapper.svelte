<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import Feature from 'ol/Feature';
  import type { DeliveryJob, HouseData } from '$lib/api/types';
  import type { ShortcutZone } from '$lib/api/shortcutZone';
  import {
    PointType,
    type MapSelection,
    type MapState,
    type PlayerData,
    type TeleportPoint,
  } from '$lib/components/Map/Map/types';
  import { deliveryPoints as deliveryPointsList } from '$lib/data/deliveryPoint';
  import { houses as housesList } from '$lib/data/house';
  import type { House } from '$lib/data/house';
  import type { DeliveryLineData } from './deliveryLine';
  import type { Pins } from '$lib/schema/pin';
  import { createThreeMapScene, type ThreeMapScene } from '$lib/ui/ThreeMap/scene';
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
    shortcutZoneData: ShortcutZone[];
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
    jobsData: _jobsData,
    shortcutZoneData,
    deliveryLineData: _deliveryLineData,
  }: ThreeMapWrapperProps = $props();

  // One full wheel notch (100 deltaY), so a button tap scales distance ~1.13x like a
  // wheel tick.
  const ZOOM_BUTTON_DELTA_Y = 100;

  let container: HTMLDivElement;
  let three = $state<ThreeMapScene | undefined>(undefined);

  /** px-space (0..2200000) point → game Vector3 (x right, y down, z up). */
  function pxToGame(px: [x: number, y: number]): Vector3 {
    const g = reProjectPointInverse(px);
    return { x: g.x, y: g.y, z: 0 };
  }

  function playerCoord(point: PlayerData): Vector3 {
    return pxToGame([point.geometry[0], point.geometry[1]]);
  }

  function pinCoord(point: Pins[number]): Vector3 {
    return pxToGame([point.x, point.y]);
  }

  /** The full POI set, ordered delivery → house → player → pin → teleport → shortcut. */
  const allPois = $derived.by(() => {
    const pois: PoiInput[] = [];
    if (mapState.delivery) {
      for (const point of deliveryPointsList) {
        pois.push({
          pointType: PointType.Delivery,
          id: point.guid,
          coord: point.coord,
          info: point,
        });
      }
    }
    if (mapState.house) {
      for (const point of housesList) {
        pois.push({
          pointType: PointType.House,
          id: point.name,
          coord: point.coord,
          info: point,
        });
      }
    }
    if (mapState.player) {
      for (const point of playerData) {
        pois.push({
          pointType: PointType.Player,
          id: point.guid,
          coord: playerCoord(point),
          info: point,
        });
      }
    }
    if (mapState.pins) {
      for (let i = 0; i < pinsData.length; i++) {
        const point = pinsData[i];
        pois.push({
          pointType: PointType.Pin,
          id: i.toString(),
          coord: pinCoord(point),
          info: point,
        });
      }
    }
    if (mapState.teleport) {
      for (const point of teleportData) {
        pois.push({
          pointType: PointType.Teleport,
          id: point.name,
          coord: point.coord,
          info: point,
        });
      }
    }
    return pois;
  });

  // ---- POI set effect: forward the derived set into the manager ----
  $effect(() => {
    if (!three) return;
    three.poiManager.setPois(allPois);
    centerOnSelection();
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

  // ---- labels ----
  $effect(() => {
    if (!three) return;
    const pm = three.poiManager;
    for (const marker of pm.markers()) {
      const text = (() => {
        switch (marker.pointType) {
          case PointType.Player:
            return mapState.playerName ? (marker.info as PlayerData).name : '';
          case PointType.Teleport:
            return mapState.teleportLabels ? (marker.info as TeleportPoint).name : '';
          case PointType.Pin:
            return mapState.pinLabels ? (marker.info as Pins[number]).label : '';
          case PointType.House: {
            if (!mapState.houseLabels) return '';
            const house = marker.info as House;
            const owner = houseData?.[house.name]?.ownerName;
            if (mapState.houseVacantOnly && !owner) return '';
            return owner ?? m['housing.vacant']();
          }
          default:
        }
      })();
      pm.setLabel(marker.id, text ?? '');
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
    pendingRaycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      three.camera,
    );
    return three.poiManager.pick(pendingRaycaster) ?? undefined;
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
    lastPixel = [event.clientX, event.clientY];
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

  // ---- shortcut zone ground shading ----
  $effect(() => {
    if (!three) return;
    three.poiManager.setShortcutZones(mapState.shortcutZone ? shortcutZoneData : []);
  });

  const zoomIn = () => three?.zoomBy(-ZOOM_BUTTON_DELTA_Y);
  const zoomOut = () => three?.zoomBy(ZOOM_BUTTON_DELTA_Y);

  // ---- selection lock ----
  let lastCenteredSelection = $state<string | undefined>(undefined);

  function centerOnSelection(): void {
    if (!three || !selection || lastCenteredSelection === selection.id) return;
    const marker = three.poiManager.markerById(selection.id);
    if (!marker) return;
    lastCenteredSelection = selection.id;
    const [wx, wy, wz] = marker.world;
    three.controls.target.set(wx, wy, wz);
  }

  $effect(() => {
    if (!three || !selection) return;
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
