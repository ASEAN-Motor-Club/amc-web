<script lang="ts">
  import type Feature from 'ol/Feature';
  import { onMount, getAbortSignal } from 'svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import PoiPanel from './PoiPanel.svelte';
  import { PointType, PoiType, type MapState, type PlayerData, type TeleportPoint } from './types';
  import HoverInfoTooltip, { type HoverInfo } from './HoverInfoTooltip.svelte';
  import {
    deliveryPointsMap,
    demandKeyMapNoResident,
    supplyKeyMap,
    type DeliveryPoint,
  } from '$lib/data/deliveryPoint';
  import Search from './Search.svelte';
  import type { DeliveryJob, HouseData } from '$lib/api/types';
  import { getTeleports } from '$lib/api/teleport';
  import { mergeTeleportPoints } from './teleport';
  import { getShortcutZones, type ShortcutZone } from '$lib/api/shortcutZone';
  import type { DeliveryCargo } from '$lib/data/types';
  import { memoize, uniq } from 'es-toolkit';
  import { cargoMetadata } from '$lib/data/cargo';
  import { m } from '$messages';
  import type { Pins } from '$lib/schema/pin';
  import { SvelteSet } from 'svelte/reactivity';
  import * as z from 'zod/mini';
  import { getMatchJobDestFn, getMatchJobSourceFn } from '$lib/utils/delivery';
  import OlMapWrapper from './OlMapWrapper.svelte';

  interface Props {
    jobsData: DeliveryJob[];
    playerData: PlayerData[];
    houseData: HouseData | undefined;
    onPlayerLayerDataEnabledChange?: (enabled: boolean) => void;
  }

  const { jobsData, playerData, houseData, onPlayerLayerDataEnabledChange }: Props = $props();

  const MAP_STATE_STORAGE_KEY = 'mapState';

  let pinsData = $state<Pins>([]);
  const havePins = $derived(pinsData.length > 0);

  let teleportData = $state<TeleportPoint[]>([]);
  const haveTeleports = $derived(teleportData.length > 0);

  let shortcutZoneData = $state<ShortcutZone[]>([]);
  const haveShortcutZones = $derived(shortcutZoneData.length > 0);

  const getDeliveryPoint = (guid: string) => {
    const point = deliveryPointsMap.get(guid);
    if (!point) {
      throw new Error(`Delivery point not found: ${guid}`);
    }
    return point;
  };

  const getDeliveryLine = (deliveryPoint: DeliveryPoint) => {
    const matchSourceJob = jobsData.filter(getMatchJobSourceFn(deliveryPoint));
    const matchDestJob = jobsData.filter(getMatchJobDestFn(deliveryPoint));

    if (mapState.jobOnly && matchSourceJob.length === 0 && matchDestJob.length === 0) {
      return;
    }

    const allDropPointLink: [DeliveryPoint, DeliveryPoint][] = [];

    if (deliveryPoint.parent) {
      allDropPointLink.push([deliveryPoint, getDeliveryPoint(deliveryPoint.parent)]);
    }

    const connectedDrop = new SvelteSet<DeliveryCargo>();

    if (deliveryPoint.dropPoint) {
      for (const dropPointGuid of deliveryPoint.dropPoint) {
        const dropPoint = getDeliveryPoint(dropPointGuid);
        for (const cargoType of dropPoint.allDemand) {
          connectedDrop.add(cargoType);
        }
        allDropPointLink.push([deliveryPoint, dropPoint]);
      }
    }

    const allSupplyDestinations = uniq(
      deliveryPoint.allSupplyKey
        .map((d) => [d, cargoMetadata[d], demandKeyMapNoResident.get(d) ?? []] as const)
        .flatMap(([d, cd, dps]) =>
          dps.map((dp) => {
            const point = getDeliveryPoint(dp);
            if (mapState.jobOnly) {
              const hasDestJob = matchSourceJob.some(getMatchJobDestFn(point));
              if (!hasDestJob) {
                return undefined;
              }
            }
            if (point.dropPoint) {
              const hasConnectedDrop = point.dropPoint.some((dropPointGuid) =>
                deliveryPointsMap.get(dropPointGuid)?.allDemandKey.includes(d),
              );
              if (hasConnectedDrop) {
                return undefined;
              }
            }
            if (cd.minDist || cd.maxDist || deliveryPoint.maxDist || point.maxReceiveDist) {
              const dist = Math.hypot(
                point.coord.x - deliveryPoint.coord.x,
                point.coord.y - deliveryPoint.coord.y,
              );
              if (cd.minDist) {
                if (dist < cd.minDist) {
                  return undefined;
                }
              }
              if (cd.maxDist) {
                if (dist > cd.maxDist) {
                  return undefined;
                }
              }
              if (deliveryPoint.maxDist) {
                if (dist > deliveryPoint.maxDist) {
                  return undefined;
                }
              }
              if (point.maxReceiveDist) {
                if (dist > point.maxReceiveDist) {
                  return undefined;
                }
              }
            }
            if (point.parent) {
              allDropPointLink.push([point, getDeliveryPoint(point.parent)]);
            }
            return point;
          }),
        )
        .filter((d) => d !== undefined),
    );

    const allDemandDestinations = uniq(
      deliveryPoint.allDemandKey
        .filter((d) => !connectedDrop.has(d))
        .map((d) => [cargoMetadata[d], supplyKeyMap.get(d) ?? []] as const)
        .flatMap(([cd, dps]) =>
          dps.map((dp) => {
            const point = getDeliveryPoint(dp);
            if (mapState.jobOnly) {
              const hasSourceJob = matchDestJob.some(getMatchJobSourceFn(point));
              if (!hasSourceJob) {
                return undefined;
              }
            }
            if (cd.minDist || cd.maxDist || deliveryPoint.maxReceiveDist || point.maxDist) {
              const dist = Math.hypot(
                point.coord.x - deliveryPoint.coord.x,
                point.coord.y - deliveryPoint.coord.y,
              );
              if (cd.minDist) {
                if (dist < cd.minDist) {
                  return undefined;
                }
              }
              if (cd.maxDist) {
                if (dist > cd.maxDist) {
                  return undefined;
                }
              }
              if (deliveryPoint.maxReceiveDist) {
                if (dist > deliveryPoint.maxReceiveDist) {
                  return undefined;
                }
              }
              if (point.maxDist) {
                if (dist > point.maxDist) {
                  return undefined;
                }
              }
            }
            if (point.dropPoint) {
              for (const dropPointGuid of point.dropPoint) {
                const dropPoint = getDeliveryPoint(dropPointGuid);
                allDropPointLink.push([point, dropPoint]);
              }
            }
            return point;
          }),
        )
        .filter((d) => d !== undefined),
    );

    return {
      point: {
        x: deliveryPoint.coord.x,
        y: deliveryPoint.coord.y,
      },
      demand: allDemandDestinations,
      supply: allSupplyDestinations,
      dropPoint: allDropPointLink,
    };
  };

  const memoizedGetDeliveryLine = memoize(getDeliveryLine, {
    getCacheKey: (d) => d.guid,
  });

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

    getTeleports(getAbortSignal())
      .then((data) => {
        teleportData = mergeTeleportPoints(data);
      })
      .catch((e: unknown) => {
        console.error('Failed to load teleport data:', e);
      });

    getShortcutZones(getAbortSignal())
      .then((data) => {
        shortcutZoneData = data;
      })
      .catch((e: unknown) => {
        console.error('Failed to load shortcut zone data:', e);
      });
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
        }),
      );
    }
  });

  let selectedPoint: Feature | undefined = $state();
  let lockPoint: Feature | undefined = $state();
  let hoverPoint: { f: Feature; pixel: [number, number] } | undefined = $state();

  const hoverInfo: HoverInfo | undefined = $derived.by(() => {
    if (hoverPoint) {
      return {
        pointType: hoverPoint.f.get('pointType'),
        pixelCoord: hoverPoint.pixel,
        info: hoverPoint.f.get('info'),
      };
    }
  });

  const deliveryLineData = $derived.by(() => {
    if (hoverInfo?.pointType === PointType.Delivery) {
      return memoizedGetDeliveryLine(hoverInfo.info);
    }
  });

  let handleHover = (feature: Feature | undefined, pixel: [number, number]) => {
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
        mapState.shortcutZone = !mapState.shortcutZone;
        break;
      case PoiType.ShortcutZoneLabels:
        mapState.shortcutZoneLabels = !mapState.shortcutZoneLabels;
        break;
    }
  };

  let map: OlMapWrapper;
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
    requestAnimationFrame(() => map.getMap().updateSize());
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
      requestAnimationFrame(() => map.getMap().updateSize());
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

  const handleSearchClick = () => {
    // TODO
  };

  const handleInfoClick = () => {
    // TODO
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
    onHover={handleHover}
    bind:this={map}
  />
  {#if !pipActive}
    <!-- Search overlay (top, overflow-hidden to contain dropdown) -->
    <div
      class="pointer-events-none absolute top-0 right-0 left-0 flex h-full flex-col overflow-hidden p-4 pb-15"
    >
      <Search {pinsData} {playerData} {houseData} onPointClick={handleSearchClick} />
    </div>

    <PoiPanel
      {mapState}
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
