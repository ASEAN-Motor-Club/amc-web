<script lang="ts">
  import { untrack } from 'svelte';
  import * as THREE from 'three';
  import type { DeliveryJob, DepotData, HouseData } from '#lib/api/types.ts';
  import { hasSevereDepot } from '#lib/api/depot.ts';
  import {
    PointType,
    type MapFeature,
    type MapSelection,
    type MapState,
    type PlayerData,
    type TeleportPoint,
  } from '#lib/components/Map/Map/types.ts';
  import { getMtLocale } from '#lib/utils/getMtLocale.ts';
  import {
    deliveryPoints as deliveryPointsList,
    type DeliveryPoint,
  } from '#lib/data/deliveryPoint.ts';
  import { areaBoundaries } from '#lib/data/area.ts';
  import { getMatchJobDestFn, getMatchJobSourceFn } from '#lib/utils/delivery.ts';
  import { houses as housesList } from '#lib/data/house.ts';
  import type { House } from '#lib/data/house.ts';
  import type { Pins } from '#lib/schema/pin.ts';
  import type { ShortcutZone } from '#lib/api/shortcutZone.ts';
  import type { DeliveryLineData } from './deliveryLine.ts';
  import { prefersReducedMotion } from 'svelte/motion';
  import {
    createThreeMapScene,
    type MapViewKind,
    type ThreeMapScene,
  } from '#lib/ui/ThreeMap/scene.ts';
  import {
    ORTHO_ZOOM_BUTTON_LOG_STEP,
    SELECTION_PAN_DURATION_S,
    ZOOM_BUTTON_LOG_STEP,
  } from '#lib/ui/ThreeMap/constants.ts';
  import { TILES_META } from '#lib/ui/ThreeMap/heightmap.ts';
  import { gameCoordToWorld, worldXZToGamePlane } from '#lib/ui/ThreeMap/coords.ts';
  import type { MapViewState } from '#lib/ui/ThreeMap/view.ts';
  import { PoiState } from '#lib/ui/ThreeMap/poi.ts';
  import type { PoiMarker, PoiInput } from '#lib/ui/ThreeMap/poiManager.ts';
  import { m } from '#messages';
  import type { Vector2, Vector3 } from '#lib/types/index.ts';
  import { isMouse, isSm } from '#lib/utils/media.svelte.ts';
  import Button from '#lib/ui/Button/Button.svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import MapZoomControl from '#lib/ui/MapZoomControl/MapZoomControl.svelte';
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export interface ThreeMapWrapperProps {
    /** CSS class to apply to the map container */
    class?: ClassValue;
    /** `perspective` (default): the tilting 3D terrain. `ortho`: the flat 2D map. Fixed for the
     * component's lifetime - remount (`{#key}`) to switch, passing `getViewState()` as `initialView`. */
    view?: MapViewKind;
    /** Centre and zoom to open at (px-space centre, OL-style zoom). Defaults to the whole map. */
    initialView?: MapViewState;
    /** Whether the map is currently detached into a picture-in-picture window (2D view only) */
    pipActive?: boolean;
    /** Callback for the picture-in-picture button, shown above the other controls (2D view only) */
    enterPip?: () => void;
    /** Toggles the map between the 2D and 3D views */
    onToggleMapMode?: () => void;
    mapState: MapState;
    jobsData: DeliveryJob[];
    playerData: PlayerData[];
    houseData: HouseData | undefined;
    depotData: DepotData | undefined;
    pinsData: Pins;
    teleportData: TeleportPoint[];
    shortcutZoneData: ShortcutZone[];
    /** Lines to draw around the hovered or locked delivery point */
    deliveryLineData?: DeliveryLineData;
    /** Point to highlight and lock the map onto, driven by the URL */
    selection?: MapSelection;
    /** Whether the coordinate picker is armed: clicks report their game coordinate instead of selecting */
    pickMode?: boolean;
    /** Game coordinate of the pointer dropped by the picker */
    pickPoint?: Vector2;
    /** Fired with the game coordinate of every click while `pickMode` is on */
    onPick?: (coord: Vector2) => void;
    /** Callback for the coordinate picker button rendered over the map */
    onTogglePickMode?: () => void;
    onHover?: (feature: MapFeature | undefined, pixel: [x: number, y: number]) => void;
    onClick?: (feature: MapFeature | undefined) => void;
    onRightClick?: (feature: MapFeature | undefined) => void;
  }

  const {
    class: propsClass,
    mapState,
    playerData,
    houseData,
    depotData,
    pinsData,
    teleportData,
    shortcutZoneData,
    deliveryLineData,
    selection,
    pickMode,
    pickPoint,
    onPick,
    onTogglePickMode,
    onHover,
    onToggleMapMode,
    view = 'perspective',
    initialView,
    pipActive,
    enterPip,
    onClick,
    onRightClick,
    jobsData,
  }: ThreeMapWrapperProps = $props();

  const isOrtho = $derived(view === 'ortho');
  const pipSupported = $derived(
    typeof window !== 'undefined' && 'documentPictureInPicture' in window && isSm.current,
  );

  let container: HTMLDivElement;
  let viewportEl: HTMLDivElement;
  let three = $state<ThreeMapScene | undefined>(undefined);

  function playerCoord(point: PlayerData): Vector3 {
    // PlayerData.coord is the raw game coord (proto x/y/z); geometry is px-only.
    return { x: point.coord.x, y: point.coord.y, z: point.coord.z ?? 0 };
  }

  /** Pins are game coordinates (the `pins` URL param), like every other point. */
  function pinCoord(point: Pins[number]): Vector3 {
    return { x: point.x, y: point.y, z: 0 };
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
    const pois: PoiInput[] = [];
    for (const point of deliveryPointsList) {
      const jobs = jobsFor(point);
      // "Jobs only" shows just the points that are the source or destination of a job.
      if (mapState.jobOnly && jobs === 0) continue;
      pois.push({
        pointType: PointType.Delivery,
        id: point.guid,
        coord: point.coord,
        info: point,
        jobs,
      });
    }
    return pois;
  });

  const housePois = $derived.by(() => {
    if (!mapState.house) return [];
    const vacantOnly = mapState.houseVacantOnly;
    const severeOnly = mapState.houseSevereOnly;
    const pois: PoiInput[] = [];
    for (const point of housesList) {
      const vacant = !houseData?.[point.name]?.ownerName;
      if (vacantOnly && !vacant) continue;
      const severe = hasSevereDepot(depotData?.[point.name]);
      if (severeOnly && !severe) continue;
      pois.push({
        pointType: PointType.House,
        id: point.name,
        coord: point.coord,
        info: point,
        vacant,
        severe,
      });
    }
    return pois;
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

  /** Bumped after every marker reconcile, so effects that look markers up (selection, lock-follow)
   * run again once a marker exists or moved - `markerById` itself is not reactive. */
  let markerRevision = $state(0);
  const markersChanged = () => untrack(() => (markerRevision += 1));

  // ---- POI set effects: one per data source, so each only reconciles its own type. ----
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.Delivery, deliveryPois);
    markersChanged();
  });
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.House, housePois);
    markersChanged();
  });
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.Player, playerPois);
    markersChanged();
  });
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.Pin, pinPois);
    markersChanged();
  });
  $effect(() => {
    if (!three) return;
    three.poiManager.setPoisFor(PointType.Teleport, teleportPois);
    markersChanged();
  });

  // ---- labels: one label concern per effect, re-applied when that type's set changes
  // (a toggled layer recreates markers which need their labels set again). ----
  // Player labels key on membership/name only: interpolated coords churn per frame.
  const playerLabelKey = $derived(playerData.map((p) => `${p.guid} ${p.name}`).join('\n'));
  $effect(() => {
    if (!three) return;
    void playerLabelKey;
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
    for (const marker of pm.markersOf(PointType.House)) {
      const owner = houseData?.[(marker.info as House).name]?.ownerName;
      pm.setLabel(marker.id, show ? (owner ?? m['housing.vacant']()) : '');
    }
  });

  // ---- ground overlays: area names, delivery lines, shortcut zones. ----
  $effect(() => {
    if (!three) return;
    three.areaLabels.setVisible(mapState.areaName);
  });
  // getMtLocale reads the reactive locale - the labels re-apply when it changes.
  $effect(() => {
    if (!three) return;
    void getMtLocale(areaBoundaries[0]?.name ?? { en: '' });
    three.areaLabels.setTexts();
  });

  $effect(() => {
    if (!three) return;
    three.areaBounds.setVisible(mapState.areaBound);
  });
  $effect(() => {
    if (!three) return;
    three.shortcutZones.setZones(shortcutZoneData);
  });
  $effect(() => {
    if (!three) return;
    three.shortcutZones.setVisible(mapState.shortcutZone);
    three.shortcutZones.setLabelsVisible(mapState.shortcutZoneLabels);
  });
  $effect(() => {
    if (!three) return;
    three.deliveryLines.setLines(deliveryLineData);
  });
  $effect(() => {
    if (!three) return;
    three.deliveryLines.setVisible(mapState.delivery);
  });
  $effect(() => {
    if (!three) return;
    three.deliveryLines.setReducedMotion(prefersReducedMotion.current);
  });

  // ---- hover ----
  let hoveredMarker: PoiMarker | undefined = $state();
  let lastPixel: [x: number, y: number] | undefined = $state();

  /** Dot paint for a marker: OL precedence - hover over selected, normal otherwise. */
  function markerStateFor(id: string): PoiState {
    if (hoveredMarker?.id === id) return PoiState.Hover;
    if (selection?.id === id) return PoiState.Selected;
    return PoiState.Normal;
  }

  function applyMarkerState(id: string): void {
    three?.poiManager.setMarkerState(id, markerStateFor(id));
  }

  function markerFeature(marker: PoiMarker | undefined): MapFeature | undefined {
    // Pins are never picked, so a hovered marker is always one of the four feature kinds.
    return marker && ({ pointType: marker.pointType, info: marker.info } as MapFeature);
  }

  function pickAtPointer(event: { clientX: number; clientY: number }): PoiMarker | undefined {
    if (!three) return undefined;
    const rect = three.renderer.domElement.getBoundingClientRect();
    return three.poiManager.pick(event.clientX - rect.left, event.clientY - rect.top) ?? undefined;
  }

  function updateHoverAt(event: { clientX: number; clientY: number }): void {
    const marker = pickAtPointer(event);
    if (marker === hoveredMarker) return;
    const previousId = hoveredMarker?.id;
    hoveredMarker = marker;
    // Repaint the dot itself; the tooltip rides on onHover below.
    if (previousId !== undefined) applyMarkerState(previousId);
    if (marker) applyMarkerState(marker.id);
    onHover?.(markerFeature(marker), lastPixel ?? [-1, -1]);
  }

  /** Drops the hovered dot and closes its tooltip. */
  function clearHover(): void {
    if (hoveredMarker) {
      const previousId = hoveredMarker.id;
      hoveredMarker = undefined;
      applyMarkerState(previousId);
    }
    onHover?.(undefined, [-1, -1]);
  }

  $effect(() => {
    // Arming the picker must not leave a point's tooltip floating over the map.
    if (pickMode) clearHover();
  });

  $effect(() => {
    if (!three) return;
    three.renderer.domElement.style.cursor = pickMode ? 'crosshair' : '';
  });

  // ---- coordinate picker ----
  const _groundRaycaster = new THREE.Raycaster();
  const _groundNdc = new THREE.Vector2();
  const _groundHit = new THREE.Vector3();
  const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));

  /** The ground point under a pointer, in world coordinates: the terrain where tiles are
   * loaded, else the ocean-level plane. */
  function groundPointAt(event: { clientX: number; clientY: number }): THREE.Vector3 | undefined {
    if (!three) return undefined;
    const rect = three.renderer.domElement.getBoundingClientRect();
    const { width, height } = three.viewSize;
    _groundNdc.set(
      ((event.clientX - rect.left) / width) * 2 - 1,
      -((event.clientY - rect.top) / height) * 2 + 1,
    );
    _groundRaycaster.setFromCamera(_groundNdc, three.camera);
    const hits = _groundRaycaster.intersectObjects(three.tileManager.tileGroup.children, false);
    if (hits.length > 0) return hits[0].point;
    _groundPlane.constant = -(TILES_META.oceanLevelMeters ?? 0);
    return _groundRaycaster.ray.intersectPlane(_groundPlane, _groundHit) ?? undefined;
  }

  // The pointer dropped by the picker rides the terrain: its height arrives with the ground tile.
  $effect(() => {
    if (!three) return;
    const scene = three;
    if (!pickPoint) {
      scene.poiManager.setPickPoint(undefined);
      return;
    }
    const [wx, , wz] = gameCoordToWorld({ x: pickPoint.x, y: pickPoint.y, z: 0 }, TILES_META);
    if (scene.view === 'ortho') {
      // The flat map has no terrain to ride.
      scene.poiManager.setPickPoint([wx, 0, wz]);
      return;
    }
    const token = { cancelled: false };
    void (async () => {
      for (let attempt = 0; attempt < 100 && !token.cancelled; attempt++) {
        const height = scene.groundHeights.sample(wx, wz, TILES_META.maxZoom);
        if (height !== null) {
          scene.poiManager.setPickPoint([wx, height, wz]);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    })();
    return () => {
      token.cancelled = true;
    };
  });

  // ---- pointer events ----
  /** A press only counts as a click when the pointer barely moved - a drag is a pan. */
  const CLICK_MAX_MOVE_PX = 5;
  let press: { x: number; y: number; dragged: boolean } | undefined;

  /** Where the pointer last was (client px), to re-resolve the hover when the map moves under it. */
  let lastClient: { clientX: number; clientY: number } | undefined;

  function onPointerMove(event: PointerEvent): void {
    if (!three) return;
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_MAX_MOVE_PX) {
      press.dragged = true;
      // Panning the map breaks the lock on a followed point until something else is selected.
      lockBroken = true;
    }
    lastClient = event;
    // OL reports container-relative pixels; the tooltip is positioned inside the map
    // container, so client coords would float it by the container's viewport offset.
    const rect = container.getBoundingClientRect();
    lastPixel = [event.clientX - rect.left, event.clientY - rect.top];
    // Touch has no hover, and the armed picker shows no tooltips.
    if (!isMouse.current || pickMode) return;
    updateHoverAt(event);
  }

  function onPointerDown(event: PointerEvent): void {
    if (!three || event.button !== 0) return;
    press = { x: event.clientX, y: event.clientY, dragged: false };
  }

  function handleClick(event: PointerEvent): void {
    if (pickMode) {
      const hit = groundPointAt(event);
      if (!hit) return;
      const [x, y] = worldXZToGamePlane(hit.x, hit.z, TILES_META);
      onPick?.({ x, y });
      return;
    }
    // Touch never fires a pointermove over a dot, so a tap resolves its pick here.
    const rect = container.getBoundingClientRect();
    lastPixel = [event.clientX - rect.left, event.clientY - rect.top];
    updateHoverAt(event);
    onClick?.(markerFeature(hoveredMarker));
  }

  function onPointerUp(event: PointerEvent): void {
    if (!three || event.button !== 0 || !press) return;
    const wasDrag = press.dragged;
    press = undefined;
    if (!wasDrag) handleClick(event);
  }

  function onPointerCancel(): void {
    press = undefined;
  }

  /**
   * Keeps the hover honest while the map moves under a still pointer, per rendered frame.
   * Mouse: the pick is re-resolved at the pointer (cleared while a drag pans, like OL's moveend
   * re-pick). Touch has no pointer to re-resolve, so the tapped dot stays picked and its tooltip
   * follows it - hidden while a finger pans, dropped when the dot leaves the view.
   */
  const _follow = new THREE.Vector3();
  function followHover(): void {
    if (!three || pickMode) return;
    const dragging = press?.dragged === true;
    if (isMouse.current) {
      if (dragging) {
        if (hoveredMarker) clearHover();
      } else if (lastClient) {
        updateHoverAt(lastClient);
      }
      return;
    }
    if (!hoveredMarker) return;
    if (dragging) {
      onHover?.(undefined, [-1, -1]);
      return;
    }
    const { width, height } = three.viewSize;
    const [wx, wy, wz] = hoveredMarker.world;
    _follow.set(wx, wy, wz).project(three.camera);
    const x = (_follow.x * 0.5 + 0.5) * width;
    const y = (0.5 - _follow.y * 0.5) * height;
    if (_follow.z < -1 || _follow.z > 1 || x < 0 || y < 0 || x > width || y > height) {
      clearHover();
      return;
    }
    lastPixel = [x, y];
    onHover?.(markerFeature(hoveredMarker), [x, y]);
  }

  function onContextMenu(event: Event): void {
    if (!three) return;
    event.preventDefault();
    onRightClick?.(markerFeature(hoveredMarker));
  }

  /** Where the map was looking when the scene it belonged to was torn down: a view switch
   * re-creates the scene (a scene's camera type is fixed) and reopens at the same place. */
  let carriedView: MapViewState | undefined = untrack(() => initialView);

  // The scene lives as long as the component and the view: switching `view` disposes the old scene
  // first (freeing its WebGL context) and mounts the new one where the old one was looking.
  $effect(() => {
    const kind = view;
    const scene = createThreeMapScene(container, {
      view: kind,
      initialView: carriedView,
      viewportElement: viewportEl,
    });
    three = scene;
    const unregisterFollow = scene.onFrame(followHover);
    const dom = scene.renderer.domElement;
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerCancel);
    dom.addEventListener('contextmenu', onContextMenu);

    return () => {
      carriedView = scene.getViewState();
      unregisterFollow();
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerCancel);
      dom.removeEventListener('contextmenu', onContextMenu);
      scene.dispose();
      three = undefined;
      press = undefined;
      hoveredMarker = undefined;
    };
  });

  // Positive steps zoom out. 3D: one click is x e^0.2 (~1.22); 2D: one whole zoom level, like OL's
  // +/- control.
  const zoomStep = $derived(isOrtho ? ORTHO_ZOOM_BUTTON_LOG_STEP : ZOOM_BUTTON_LOG_STEP);
  const zoomIn = () => three?.stepBy(zoomStep);
  const zoomOut = () => three?.stepBy(-zoomStep);

  /** Snapshot of where the map is looking, to hand back as `initialView` after a remount. */
  export const getViewState = (): MapViewState | undefined => three?.getViewState();

  // ---- selection lock ----
  let lockedId: string | undefined;
  /** Panning the map breaks the lock until something else is selected. */
  let lockBroken = false;
  let selectedMarkerId: string | undefined = undefined;

  /** The zoom a newly selected point is brought to (OL's `centerOn`). */
  const SELECTION_ZOOM = 5;

  /**
   * Brings the locked marker to the screen centre. A new lock glides there (and, in 2D, zooms to
   * `SELECTION_ZOOM` like OL's `centerOn`); a moving locked player is followed instantly. 3D
   * keeps zoom and orbit: the selectionPan servo measures the ground-plane delta to the marker
   * once and eases camera + target along it together.
   */
  function centerOn(marker: PoiMarker, isNewLock: boolean): void {
    if (!three) return;
    if (three.ortho) {
      three.ortho.animateTo(
        { x: marker.world[0], z: marker.world[2], zoom: isNewLock ? SELECTION_ZOOM : undefined },
        isNewLock ? SELECTION_PAN_DURATION_S : 0,
      );
      return;
    }
    three.selectionPan.panTo(marker.world[0], marker.world[1], marker.world[2]);
  }

  $effect(() => {
    if (!three || !selection) {
      // Deselected (or scene not up yet): drop the previous marker's selected paint.
      if (three && selectedMarkerId !== undefined) applyMarkerState(selectedMarkerId);
      selectedMarkerId = undefined;
      lockedId = undefined;
      lockBroken = false;
      return;
    }
    // Re-run whenever markers were reconciled: the marker may arrive after the selection (the
    // toggles in Map.svelte run in their own effect), a re-created marker must regain its selected
    // paint, and a followed player moves with every stream update.
    void markerRevision;
    if (selectedMarkerId !== selection.id) {
      if (selectedMarkerId !== undefined) applyMarkerState(selectedMarkerId);
      selectedMarkerId = selection.id;
    }
    applyMarkerState(selection.id);

    // The marker may not exist yet while its data is still streaming in.
    const marker = three.poiManager.markerById(selection.id);
    if (!marker) return;
    const isNewLock = selection.id !== lockedId;
    if (isNewLock) {
      lockedId = selection.id;
      lockBroken = false;
    }
    // Only moving points are followed (players stream in, pin positions follow the URL);
    // houses and deliveries are centred once when selected.
    const follows =
      selection.pointType === PointType.Player || selection.pointType === PointType.Pin;
    if (!lockBroken && (isNewLock || follows)) centerOn(marker, isNewLock);
  });
</script>

<!-- The canvas is as wide as the window and anchored top-left, so it never resizes while the
  layout around the map animates (the sidebar sliding open); this clipped box shows the part of it
  the user sees. The empty element inside is the measuring stick: it tracks that visible area and
  the scene draws into exactly its size (see `viewportElement`). -->
<div class="relative h-full w-full overflow-hidden">
  <div class="pointer-events-none absolute inset-0" aria-hidden="true" bind:this={viewportEl}></div>
  <div
    class={twMerge('absolute top-0 left-0 h-full w-screen', clsx(propsClass))}
    bind:this={container}
  ></div>
  {#if !pipActive}
    <div class="absolute right-4 bottom-4 flex flex-col items-end gap-2">
      {#if isOrtho && enterPip && pipSupported}
        <Button
          class="pointer-events-auto rounded-md !bg-gray-900/50 text-text-dark shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-sm hover:!bg-gray-900/40 focus-visible:!bg-gray-900/60 contrast-more:bg-gray-950! contrast-more:ring-white/60! contrast-more:hover:bg-gray-800! contrast-more:focus-visible:bg-gray-800!"
          color="custom"
          size="sm"
          icon
          onClick={enterPip}
          aria-label={m['a11y.picture_in_picture']()}
        >
          <Icon class="icon-[material-symbols--picture-in-picture-center-outline-rounded]" />
        </Button>
      {/if}
      {#if onTogglePickMode}
        <Button
          class={[
            'pointer-events-auto rounded-md shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-sm',
            pickMode
              ? '!bg-blue-600/70 text-text-dark hover:!bg-blue-600/60 focus-visible:!bg-blue-600/80 contrast-more:bg-blue-700!'
              : '!bg-gray-900/50 text-text-dark hover:!bg-gray-900/40 focus-visible:!bg-gray-900/60 contrast-more:bg-gray-950! contrast-more:hover:bg-gray-800! contrast-more:focus-visible:bg-gray-800!',
          ]}
          color="custom"
          size="sm"
          icon
          onClick={onTogglePickMode}
          aria-label={m['a11y.pick_coordinates']()}
        >
          <Icon class="icon-[material-symbols--pin-drop-rounded]" />
        </Button>
      {/if}
      {#if onToggleMapMode}
        <Button
          class="pointer-events-auto rounded-md !bg-gray-900/50 text-text-dark shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-sm hover:!bg-gray-900/40 focus-visible:!bg-gray-900/60 contrast-more:bg-gray-950! contrast-more:ring-white/60! contrast-more:hover:bg-gray-800! contrast-more:focus-visible:bg-gray-800!"
          color="custom"
          size="sm"
          icon
          onClick={onToggleMapMode}
          aria-label={isOrtho ? m['a11y.switch_to_3d']() : m['a11y.switch_to_2d']()}
        >
          <Icon
            class={isOrtho
              ? 'icon-[material-symbols--3d-2-rounded]'
              : 'icon-[material-symbols--2d-2-rounded]'}
          />
        </Button>
      {/if}
      <MapZoomControl onZoomIn={zoomIn} onZoomOut={zoomOut} />
    </div>
  {/if}
</div>
