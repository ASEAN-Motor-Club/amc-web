<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import PoiPanel from './PoiPanel.svelte';
  import {
    PointType,
    PoiType,
    type MapFeature,
    type MapSelection,
    type MapState,
    type PlayerData,
  } from './types.ts';
  import HoverInfoTooltip, { type HoverInfo } from './HoverInfoTooltip.svelte';
  import PickCoordCard from './PickCoordCard.svelte';
  import { deliveryPointsMap } from '#lib/data/deliveryPoint.ts';
  import { getDeliveryLine } from './deliveryLine.ts';
  import Search from './Search.svelte';
  import type { DeliveryJob, DepotData, HouseData } from '#lib/api/types.ts';
  import { createTeleportsQuery } from '#lib/api/teleport.ts';
  import { mergeTeleportPoints } from './teleport.ts';
  import { createShortcutZonesQuery } from '#lib/api/shortcutZone.ts';
  import { m } from '#messages';
  import { pinsSchema, type Pins } from '#lib/schema/pin.ts';
  import * as z from 'zod/mini';
  import ThreeMapWrapper from './ThreeMapWrapper.svelte';
  import { goto } from '$app/navigation';
  import { getSelectionClearedParams } from '../utils.ts';
  import { isMouse, isSm } from '#lib/utils/media.svelte.ts';
  import { clientSearchParamsGet } from '#lib/utils/clientSearchParamsGet.ts';
  import { getMsgModalContext } from '#lib/components/MsgModal/context.ts';
  import type { Vector2 } from '#lib/types/index.ts';
  import { fade } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';
  import { defaultTransitionDurationMs } from '#lib/tw-var.ts';

  interface Props {
    jobsData: DeliveryJob[];
    playerData: PlayerData[];
    houseData: HouseData | undefined;
    depotData: DepotData | undefined;
    onPlayerLayerDataEnabledChange?: (enabled: boolean) => void;
  }

  const { jobsData, playerData, houseData, depotData, onPlayerLayerDataEnabledChange }: Props =
    $props();

  const MAP_STATE_STORAGE_KEY = 'mapState';
  /** The active map mode - 3D renders the terrain through ThreeMapWrapper. */
  let threeDMode = $state(false);
  /**
   * Coordinate picker: while armed every map click reports its game coordinate
   * and drops a pointer there, instead of selecting whatever is under the cursor.
   */
  let pickMode = $state(false);
  let pickCoord = $state<Vector2 | undefined>();

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
    houseSevereOnly: false,
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
    houseSevereOnly: z.optional(z.boolean()),
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
    const stored = localStorage.getItem(MAP_STATE_STORAGE_KEY);
    // A first visit has no stored state; parsing '' would throw on every page load.
    if (!stored) return;
    try {
      const raw = JSON.parse(stored);
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
          houseSevereOnly: mapState.houseSevereOnly,
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
  let hoverPoint: { feature: MapFeature; pixel: [x: number, y: number] } | undefined = $state();

  const hoverInfo: HoverInfo | undefined = $derived(
    hoverPoint && { ...hoverPoint.feature, pixelCoord: hoverPoint.pixel },
  );

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

  let handleHover = (feature: MapFeature | undefined, pixel: [x: number, y: number]) => {
    if (feature) {
      hoverPoint = { feature, pixel };
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
        // The two house filters are exclusive: showing only vacant houses and
        // only starved depots at once can never match the same house set.
        if (mapState.houseVacantOnly) mapState.houseSevereOnly = false;
        break;
      case PoiType.HouseSevereOnly:
        mapState.houseSevereOnly = !mapState.houseSevereOnly;
        if (mapState.houseSevereOnly) mapState.houseVacantOnly = false;
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
        mapState.shortcutZone = !mapState.shortcutZone;
        break;
      case PoiType.ShortcutZoneLabels:
        mapState.shortcutZoneLabels = !mapState.shortcutZoneLabels;
        break;
      case PoiType.AreaName:
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

  const handleMapClick = (feature: MapFeature | undefined) => {
    if (!isMouse.current) {
      // Touch only opens the tooltip, its buttons carry the point actions.
      if (!feature) clearSelection();
      return;
    }

    if (feature?.pointType === PointType.Delivery) {
      const { guid } = feature.info;
      const newParams = getSelectionClearedParams();
      // The menu covers the map on mobile, only wider layouts open it alongside.
      if (isSm.current) {
        newParams.set('menu', `deliveries/${guid}`);
      }
      newParams.set('delivery', guid);
      goto(`/map?${newParams.toString()}`);
      return;
    }
    if (feature?.pointType === PointType.House) {
      goto(`/house/${encodeURIComponent(feature.info.name)}`);
      return;
    }
    if (feature?.pointType === PointType.Teleport) {
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
    // The picker button lives on the 2D map, so leaving 3D must not strand it armed.
    if (threeDMode) {
      pickMode = false;
      pickCoord = undefined;
    }
  };

  const togglePickMode = () => {
    pickMode = !pickMode;
    if (!pickMode) pickCoord = undefined;
  };

  const handlePick = (coord: Vector2) => {
    pickCoord = { x: coord.x, y: coord.y };
  };

  const clearPickCoord = () => {
    pickCoord = undefined;
  };

  const handleInfoClick = () => {
    if (!hoverInfo) return;

    if (hoverInfo.pointType === PointType.Delivery) {
      const newParams = getSelectionClearedParams();
      newParams.set('delivery', hoverInfo.info.guid);
      goto(`/deliveries/${hoverInfo.info.guid}?${newParams.toString()}`);
    } else if (hoverInfo.pointType === PointType.House) {
      goto(`/house/${encodeURIComponent(hoverInfo.info.name)}`);
    }
    hoverPoint = undefined;
  };
</script>

{#if pipActive}
  <button
    type="button"
    class="flex h-full w-full flex-col items-center justify-center gap-2 text-text-700 dark:text-text-300"
    onclick={exitPip}
  >
    <Icon class="icon-[material-symbols--picture-in-picture-center-outline-rounded]" size="lg" />
    {m['map.pip_exit']()}
  </button>
{/if}
<div class="relative h-full w-full" bind:this={mapRootEl}>
  <ThreeMapWrapper
    view={threeDMode ? 'perspective' : 'ortho'}
    {pipActive}
    {enterPip}
    {mapState}
    {jobsData}
    {playerData}
    {houseData}
    {depotData}
    {pinsData}
    {teleportData}
    {shortcutZoneData}
    {deliveryLineData}
    {selection}
    {pickMode}
    pickPoint={pickCoord}
    onPick={handlePick}
    onTogglePickMode={threeDMode ? undefined : togglePickMode}
    onToggleMapMode={toggleMapMode}
    onHover={handleHover}
    onClick={handleMapClick}
    onRightClick={handleMapRightClick}
  />

  {#if !pipActive}
    <!-- Search overlay (top, overflow-hidden to contain dropdown) -->
    <div
      class="pointer-events-none absolute top-0 right-0 left-0 flex h-full flex-col overflow-hidden p-4 pb-15"
    >
      <Search {pinsData} {playerData} {houseData} />
    </div>

    <PoiPanel {mapState} {havePins} {haveTeleports} {haveShortcutZones} onToggle={handlePoiToggle}>
      <!-- The pick readout shares the POI stack so it never overlaps the trigger or the card. -->
      {#snippet footer()}
        {#if pickMode}
          <div class="pointer-events-none flex w-full flex-wrap justify-center gap-2">
            {#if pickCoord}
              <PickCoordCard coord={pickCoord} onClear={clearPickCoord} />
            {:else}
              <div
                class="rounded-md bg-gray-900/50 px-3 py-2 text-xs text-text-dark shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-sm contrast-more:bg-gray-950! contrast-more:ring-white/60!"
                transition:fade={{
                  duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs,
                }}
              >
                {m['map.pick_hint']()}
              </div>
            {/if}
          </div>
        {/if}
      {/snippet}
    </PoiPanel>
  {/if}

  <HoverInfoTooltip
    {hoverInfo}
    {houseData}
    {depotData}
    onClick={handleInfoClick}
    onCopyTeleport={handleCopyTeleport}
    {teleportCopied}
  />
</div>
