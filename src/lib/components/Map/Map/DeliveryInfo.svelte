<script lang="ts">
  import { deliveryPointsMap, type DeliveryPoint } from '$lib/data/deliveryPoint';
  import { cargoName } from '$lib/data/cargo';
  import type { DeliveryCargo } from '$lib/data/types';
  import { m } from '$lib/paraglide/messages';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { DeliveryPointInfo } from '$lib/api/types';
  import { formatDistanceStrict, differenceInSeconds, min } from '$lib/date';
  import { startDeliveryPointPolling } from '$lib/api/delivery';
  import { deliveryInfoCaches } from './deliveryInfoCaches.svelte';
  import { getAbortSignal, untrack } from 'svelte';
  import { debounce } from 'lodash-es';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { getInventoryAmount as utilGetInventoryAmount } from '$lib/utils/delivery';
  import { rtDate } from '$lib/realtimeDate.svelte';
  import { isCargoType } from '$lib/utils/delivery';

  export interface HoverInfo {
    info: DeliveryPoint;
  }

  export interface HoverInfoTooltipProps {
    hoverInfo: HoverInfo;
  }

  const { hoverInfo }: HoverInfoTooltipProps = $props();

  const hasDropPoint = (item: DeliveryCargo) => {
    return hoverInfo.info.dropPoint?.some((drop) =>
      deliveryPointsMap.get(drop)?.allDemand.includes(item),
    );
  };

  let deliveryPointInfo = $state<DeliveryPointInfo | undefined>(undefined);

  const getInventoryAmount = (cargoKey: DeliveryCargo, isInput: boolean) =>
    utilGetInventoryAmount(deliveryPointInfo, cargoKey, isInput);

  let deliveryPointInfoLoading: boolean = $state(true);

  let guid = $derived(hoverInfo.info.guid);

  const debouncedGetInfo = debounce((guid: string, signal: AbortSignal) => {
    startDeliveryPointPolling(
      guid,
      (info) => {
        if (info) {
          deliveryInfoCaches.set(guid, info);
        }
        deliveryPointInfo = info;
        deliveryPointInfoLoading = false;
      },
      signal,
    );
  }, 200);

  $effect(() => {
    if (!guid) {
      return;
    }

    const cache = untrack(() => deliveryInfoCaches.get(guid));
    if (cache) {
      const deliveryPointInfoCache = cache;
      if (differenceInSeconds(new Date(), deliveryPointInfoCache.last_updated) <= 5) {
        deliveryPointInfo = deliveryPointInfoCache;
        deliveryPointInfoLoading = false;
        return;
      }
    }

    deliveryPointInfoLoading = true;
    deliveryPointInfo = undefined;

    debouncedGetInfo(guid, getAbortSignal());

    return () => {
      debouncedGetInfo.cancel();
    };
  });

  const lastUpdated = $derived.by(() => {
    const curr = new Date();
    return min([deliveryPointInfo?.last_updated ?? curr, curr]);
  });
</script>

{#if hoverInfo.info.allSupply.length}
  <div class="flex flex-col text-xs">
    <div class="font-semibold">
      <span class="mr-0.5 inline-block size-2 rounded-full bg-green-500"></span>
      {m['delivery.supply']()}
    </div>
    {#each hoverInfo.info.allSupply as item (item)}
      <div class="flex justify-between gap-10">
        <div>{getMtLocale(cargoName[item])}</div>
        <div class="relative">
          <span class="absolute right-full">
            {#if deliveryPointInfoLoading}
              <span class="animate-pulse">...</span>
            {:else}
              {getInventoryAmount(item, false)}
            {/if}
          </span>
          {#if !isCargoType(item)}
            /{hoverInfo.info.supplyStorage[item]}
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
{#if hoverInfo.info.allDemand.length}
  <div class="flex flex-col text-xs">
    <div class="font-semibold">
      <span class="mr-0.5 inline-block size-2 rounded-full bg-blue-500"></span>
      {m['delivery.demand']()}
    </div>
    {#each hoverInfo.info.allDemand as item (item)}
      <div class="flex justify-between gap-11">
        <div class="flex items-center gap-1.5">
          {getMtLocale(cargoName[item])}
          {#if hoverInfo.info.parent || hasDropPoint(item)}
            <Icon class="i-material-symbols:link-rounded -mb-0.5 text-yellow-500" size="xs" />
          {/if}
        </div>
        <div class="relative">
          <span class="absolute right-full">
            {#if deliveryPointInfoLoading}
              <span class="animate-pulse">...</span>
            {:else}
              {getInventoryAmount(item, true)}
            {/if}
          </span>
          {#if !isCargoType(item)}
            /{hoverInfo.info.demandStorage[item]}
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
{#if differenceInSeconds(rtDate.d.getTime(), lastUpdated) > 30}
  <div class="text-xs">
    <span class="font-semibold">
      <b class="mr-0.5 inline-block size-2 text-center text-red-500">!</b>
      {m['map.last_updated']()}:
      {#if deliveryPointInfoLoading}
        <span class="animate-pulse">...</span>
      {:else}
        {formatDistanceStrict(lastUpdated, rtDate.d.getTime(), {
          addSuffix: true,
        })}
      {/if}
    </span>
  </div>
{/if}
