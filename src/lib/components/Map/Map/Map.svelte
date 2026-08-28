<script lang="ts">
  import type Feature from 'ol/Feature';
  import { onMount } from 'svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import PoiPanel from './PoiPanel.svelte';
  import { PointType, PoiType, type MapSelection, type MapState, type PlayerData } from './types';
  import HoverInfoTooltip, { type HoverInfo } from './HoverInfoTooltip.svelte';
  import { deliveryPointsMap, type DeliveryPoint } from '$lib/data/deliveryPoint';
  import { getDeliveryLine } from './deliveryLine';
  import Search from './Search.svelte';
  import type { DeliveryJob, HouseData } from '$lib/api/types';
  import { createTeleportsQuery } from '$lib/api/teleport';
  import { mergeTeleportPoints } from './teleport';
  import { createShortcutZonesQuery } from '$lib/api/shortcutZone';
  import { m } from '$messages';
  import { pinsSchema, type Pins } from '$lib/schema/pin';
  import * as z from 'zod/mini';
  import OlMapWrapper from './OlMapWrapper.svelte';
  import ThreeMapWrapper from './ThreeMapWrapper.svelte';
  import { goto } from '$app/navigation';
  import { getSelectionClearedParams } from '../utils';
  import { isMouse, isSm } from '$lib/utils/media.svelte';
  import { clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';

  interface Props {
    jobsData: DeliveryJob[];
    playerData: PlayerData[];
    houseData: HouseData | undefined;
    onPlayerLayerDataEnabledChange?: (enabled: boolean) => void;
    /** Fired when the map switches between 2D and 3D mode (the sidebar speeds up in 3D). */
    onThreeDModeChange?: (mode: boolean) => void;
  }

  const {
    jobsData,
    playerData,
    houseData,
    onPlayerLayerDataEnabledChange,
    onThreeDModeChange,
  }: Props = $props();

  const MAP_STATE_STORAGE_KEY = 'mapState';
  /** The active map mode - 3D renders the terrain through ThreeMapWrapper. */
  let threeDMode = $state(false);

  let pinsData = $state<Pins>([]);
  const havePins = $derived(pinsData.length > 0);

  const teleportsQuery = createTeleportsQuery();
  const teleportData = $derived(mergeTeleportPoints(teleportsQuery.data ?? []));
  const haveTeleports = $derived(teleportData.length > 0);

  const shortcutZonesQuery = createShortcutZonesQuery();
  const shortcutZoneData = $derived(shortcutZonesQuery.data ?? []);
  const haveShortcutZones = $derived(shortcutZoneData.length > 0);

  let mapState = $state<MapState>({
    delivery: true,
    house: true,
    player: true,
    playerName: true,
    pins: true,
    pinLabels: true,
    teleport: true,
    teleportLabels: false,
    shortcutZone: true,
    shortcutZoneLabels: true,
    areaName: true,
    areaBound: false,
    jobOnly: false,
    houseVacantOnly: false,
    houseLabels: false,
    // playerCopsOnly: false,
    // playerCriminalOnly: false,
  });

  const mapStateSchema = z.object({
    delivery: z.optional(z.boolean()),
    house: z.optional(z.boolean()),
    player: z.optional(z.boolean()),
    playerName: z.optional(z.boolean()),
    jobOnly: z.optional(z.boolean()),
    houseVacantOnly: z.optional(z.boolean()),
    houseLabels: z.optional(z.boolean()),
    playerCopsOnly: z.optional(z.boolean()),
    playerCriminalOnly: z.optional(z.boolean()),
    teleport: z.optional(z.boolean()),
    teleportLabels: z.optional(z.boolean()),
    shortcutZone: z.optional(z.boolean()),
    shortcutZoneLabels: z.optional(z.boolean()),
    areaName: z.optional(z.boolean()),
  });

  onMount(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(MAP_STATE_STORAGE_KEY) ?? '');
      const result = mapStateSchema.safeParse(raw);
      if (result.success) {
        mapState = { ...mapState, ...result.data };
      }
    } catch (e) {
      console.error('Failed to load map state:', e);
    }
  });

  const { showModal } = getMsgModalContext();

  $effect(() => {
    const pins = clientSearchParamsGet('pins');
    if (!pins) {
      pinsData = [];
      return;
    }
    try {
      pinsData = pinsSchema.parse(JSON.parse(pins)).map((p, i) => ({
        ...p,
        label: p.label ?? m['map.pin_no']({ index: i + 1 }),
      }));
    } catch (e) {
      console.error('Invalid pins data:', e);
      showModal({
        title: m['map.pins_invalid.title'](),
        message: m['map.pins_invalid.desc'](),
      });
    }
  });

  $effect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        MAP_STATE_STORAGE_KEY,
        JSON.stringify({
          delivery: mapState.delivery,
          house: mapState.house,
          player: mapState.player,
          playerName: mapState.playerName,
          jobOnly: mapState.jobOnly,
          houseVacantOnly: mapState.houseVacantOnly,
          houseLabels: mapState.houseLabels,
          teleport: mapState.teleport,
          teleportLabels: mapState.teleportLabels,
          shortcutZone: mapState.shortcutZone,
          shortcutZoneLabels: mapState.shortcutZoneLabels,
          areaName: mapState.areaName,
        }),
      );
    }
  });

  $effect(() => {
    onPlayerLayerDataEnabledChange?.(mapState.player);
  });
  $effect(() => {
    onThreeDModeChange?.(threeDMode);
  });

  let hoverPoint: { f: Feature; pixel: [x: number, y: number] } | undefined = $state();

  const hoverInfo: HoverInfo | undefined = $derived.by(() => {
    if (hoverPoint) {
      return {
        pointType: hoverPoint.f.get('pointType'),
        pixelCoord: hoverPoint.pixel,
        info: hoverPoint.f.get('info'),
      };
    }
  });

  const selection = $derived.by<MapSelection | undefined>(() => {
    const house = clientSearchParamsGet('house');
    if (house) return { pointType: PointType.House, id: house };

    const delivery = clientSearchParamsGet('delivery');
    if (delivery) return { pointType: PointType.Delivery, id: delivery };

    const player = clientSearchParamsGet('player');
    if (player) return { pointType: PointType.Player, id: player };

    const pinIndex = clientSearchParamsGet('focus_index');
    if (pinIndex) return { pointType: PointType.Pin, id: pinIndex };
  });

  $effect(() => {
    // Keep the locked point's layer visible, locking onto an invisible point is pointless.
    switch (selection?.pointType) {
      case PointType.House:
        mapState.house = true;
        break;
      case PointType.Delivery:
        mapState.delivery = true;
        break;
      case PointType.Player:
        mapState.player = true;
        break;
      case PointType.Pin:
        mapState.pins = true;
        break;
    }
  });

  const deliveryLineData = $derived.by(() => {
    // A locked delivery point keeps its lines, hovering another one only previews.
    if (selection?.pointType === PointType.Delivery) {
      const point = deliveryPointsMap.get(selection.id);
      if (point) return getDeliveryLine(point, jobsData, mapState.jobOnly);
    }
    if (hoverInfo?.pointType === PointType.Delivery) {
      return getDeliveryLine(hoverInfo.info, jobsData, mapState.jobOnly);
    }
  });

  let handleHover = (feature: Feature | undefined, pixel: [x: number, y: number]) => {
    if (feature) {
      hoverPoint = { f: feature, pixel };
    } else {
      hoverPoint = undefined;
    }
  };

  let teleportCopyTimeout: ReturnType<typeof setTimeout> | undefined;
  let copiedTeleportName = $state<string | undefined>(undefined);

  const teleportCopied = $derived(
    hoverInfo?.pointType === PointType.Teleport && hoverInfo.info.name === copiedTeleportName,
  );

  const handleCopyTeleport = () => {
    if (hoverInfo?.pointType !== PointType.Teleport) return;
    const name = hoverInfo.info.name;
    navigator.clipboard.writeText(`/tp ${name}`);
    copiedTeleportName = name;
    clearTimeout(teleportCopyTimeout);
    teleportCopyTimeout = setTimeout(() => (copiedTeleportName = undefined), 2000);
  };

  const handlePoiToggle = (poi: PoiType) => {
    switch (poi) {
      case PoiType.Delivery:
        mapState.delivery = !mapState.delivery;
        break;
      case PoiType.JobsOnly:
        mapState.jobOnly = !mapState.jobOnly;
        break;
      case PoiType.House:
        mapState.house = !mapState.house;
        break;
      case PoiType.HouseLabels:
        mapState.houseLabels = !mapState.houseLabels;
        break;
      case PoiType.HouseVacantOnly:
        mapState.houseVacantOnly = !mapState.houseVacantOnly;
        break;
      case PoiType.Player:
        mapState.player = !mapState.player;
        break;
      case PoiType.PlayerName:
        mapState.playerName = !mapState.playerName;
        break;
      case PoiType.Pins:
        mapState.pins = !mapState.pins;
        break;
      case PoiType.PinLabels:
        mapState.pinLabels = !mapState.pinLabels;
        break;
      case PoiType.Teleport:
        mapState.teleport = !mapState.teleport;
        break;
      case PoiType.TeleportLabels:
        mapState.teleportLabels = !mapState.teleportLabels;
        break;
      case PoiType.ShortcutZone:
        if (threeDMode) break;
        mapState.shortcutZone = !mapState.shortcutZone;
        break;
      case PoiType.ShortcutZoneLabels:
        if (threeDMode) break;
        mapState.shortcutZoneLabels = !mapState.shortcutZoneLabels;
        break;
      case PoiType.AreaName:
        if (threeDMode) break;
        mapState.areaName = !mapState.areaName;
        break;
      case PoiType.AreaBound:
        mapState.areaBound = !mapState.areaBound;
        break;
    }
  };

  let mapRootEl: HTMLDivElement;
  let pipActive = $state(false);
  let pipWindowRef: Window | null = null;
  let pipOriginalParent: (Node & ParentNode) | null = null;
  let pipOriginalNextSibling: ChildNode | null = null;

  const copyStylesToPipWindow = (pipDocument: Document) => {
    for (const styleSheet of document.styleSheets) {
      try {
        const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
        const style = pipDocument.createElement('style');
        style.textContent = cssRules;
        pipDocument.head.appendChild(style);
      } catch {
        if (!styleSheet.href) continue;
        const link = pipDocument.createElement('link');
        link.rel = 'stylesheet';
        link.type = styleSheet.type;
        if (styleSheet.media.mediaText) link.media = styleSheet.media.mediaText;
        link.href = styleSheet.href;
        pipDocument.head.appendChild(link);
      }
    }
  };

  const exitPip = () => {
    if (!pipActive) return;
    const win = pipWindowRef;
    pipWindowRef = null;
    pipActive = false;
    pipOriginalParent?.insertBefore(mapRootEl, pipOriginalNextSibling);
    pipOriginalParent = null;
    pipOriginalNextSibling = null;
    win?.close();
  };

  const enterPip = async () => {
    if (pipActive || typeof window === 'undefined' || !('documentPictureInPicture' in window))
      return;
    const { documentPictureInPicture } = window;
    if (!documentPictureInPicture) return;
    try {
      const pipWindow = await documentPictureInPicture.requestWindow({
        width: 200,
        height: 200,
      });
      copyStylesToPipWindow(pipWindow.document);
      pipOriginalParent = mapRootEl.parentElement;
      pipOriginalNextSibling = mapRootEl.nextSibling;
      pipWindowRef = pipWindow;
      pipActive = true;
      pipWindow.document.body.append(mapRootEl);
      pipWindow.addEventListener('pagehide', () => exitPip(), { once: true });
    } catch (e) {
      console.error('Failed to open picture-in-picture window:', e);
    }
  };

  $effect(() => {
    return () => {
      // Close any still-open picture-in-picture window if the map is torn down.
      exitPip();
    };
  });

  const clearSelection = () => {
    goto(`?${getSelectionClearedParams().toString()}`);
  };

  const handleMapClick = (feature: Feature | undefined) => {
    if (!isMouse.current) {
      // Touch only opens the tooltip, its buttons carry the point actions.
      if (!feature) clearSelection();
      return;
    }

    const pointType = feature?.get('pointType') as PointType | undefined;
    if (feature && pointType === PointType.Delivery) {
      const { guid } = feature.get('info') as DeliveryPoint;
      const newParams = getSelectionClearedParams();
      // The menu covers the map on mobile, only wider layouts open it alongside.
      if (isSm.current) {
        newParams.set('menu', `deliveries/${guid}`);
      }
      newParams.set('delivery', guid);
      goto(`/map?${newParams.toString()}`);
      return;
    }
    if (feature && pointType === PointType.House) {
      const { name } = feature.get('info') as { name: string };
      const newParams = getSelectionClearedParams();
      if (isSm.current) {
        newParams.set('menu', 'housing');
      }
      newParams.set('house', name);
      newParams.set('hf', name);
      goto(`/map?${newParams.toString()}`);
      return;
    }
    if (pointType === PointType.Teleport) {
      handleCopyTeleport();
      return;
    }
    clearSelection();
  };

  const handleMapRightClick = () => {
    clearSelection();
  };

  const toggleMapMode = () => {
    threeDMode = !threeDMode;
  };

  const handleInfoClick = () => {
    if (!hoverInfo) return;

    if (hoverInfo.pointType === PointType.Delivery) {
      const newParams = getSelectionClearedParams();
      newParams.set('delivery', hoverInfo.info.guid);
      goto(`/deliveries/${hoverInfo.info.guid}?${newParams.toString()}`);
    } else if (hoverInfo.pointType === PointType.House) {
      const newParams = getSelectionClearedParams();
      newParams.set('house', hoverInfo.info.name);
      newParams.set('hf', hoverInfo.info.name);
      goto(`/housing?${newParams.toString()}`);
    }
    hoverPoint?.f.set('hover', false);
    hoverPoint = undefined;
  };
</script>

{#if pipActive}
  <button
    type="button"
    class="text-text-700 dark:text-text-300 flex h-full w-full flex-col items-center justify-center gap-2"
    onclick={exitPip}
  >
    <Icon class="i-material-symbols:picture-in-picture-center-outline-rounded" size="lg" />
    {m['map.pip_exit']()}
  </button>
{/if}
<div class="relative h-full w-full" bind:this={mapRootEl}>
  {#if threeDMode}
    <ThreeMapWrapper
      {mapState}
      {jobsData}
      {playerData}
      {houseData}
      {pinsData}
      {teleportData}
      {shortcutZoneData}
      {deliveryLineData}
      {selection}
      onToggleMapMode={toggleMapMode}
      onHover={handleHover}
      onClick={handleMapClick}
      onRightClick={handleMapRightClick}
    />
  {:else}
    <OlMapWrapper
      {pipActive}
      {enterPip}
      {mapState}
      {jobsData}
      {playerData}
      {houseData}
      {pinsData}
      {teleportData}
      {shortcutZoneData}
      {deliveryLineData}
      {selection}
      onToggleMapMode={toggleMapMode}
      onHover={handleHover}
      onClick={handleMapClick}
      onRightClick={handleMapRightClick}
    />
  {/if}

  {#if !pipActive}
    <!-- Search overlay (top, overflow-hidden to contain dropdown) -->
    <div
      class="pointer-events-none absolute top-0 right-0 left-0 flex h-full flex-col overflow-hidden p-4 pb-15"
    >
      <Search {pinsData} {playerData} {houseData} />
    </div>

    <PoiPanel
      {mapState}
      {threeDMode}
      {havePins}
      {haveTeleports}
      {haveShortcutZones}
      onToggle={handlePoiToggle}
    />
  {/if}

  <HoverInfoTooltip
    {hoverInfo}
    {houseData}
    onClick={handleInfoClick}
    onCopyTeleport={handleCopyTeleport}
    {teleportCopied}
  />
</div>
