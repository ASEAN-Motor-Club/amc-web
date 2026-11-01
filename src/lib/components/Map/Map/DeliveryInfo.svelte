<script lang="ts">
  import { deliveryPointsMap, type DeliveryPoint } from '#lib/data/deliveryPoint.ts';
  import { cargoName } from '#lib/data/cargo.ts';
  import type { DeliveryCargo } from '#lib/data/types.ts';
  import { m } from '#messages';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import { formatDistanceStrict, differenceInSeconds, min } from '#lib/date.ts';
  import { createDeliveryPointQuery } from '#lib/api/delivery.ts';
  import { debounce } from 'es-toolkit';
  import { getMtLocale } from '#lib/utils/getMtLocale.ts';
  import { getInventoryAmount as utilGetInventoryAmount } from '#lib/utils/delivery.ts';
  import { rtDate } from '#lib/realtimeDate.svelte.ts';
  import { isCargoType } from '#lib/utils/delivery.ts';
  import { DELIVERY_STALE_WARN_SECONDS } from '../utils.ts';

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

  const guid = $derived(hoverInfo.info.guid);

  /** Sweeping the pointer over points must not fire one request per point passed over. */
  const HOVER_FETCH_DEBOUNCE_MS = 200;

  let fetchEnabled = $state(false);

  const enableFetch = debounce(() => {
    fetchEnabled = true;
  }, HOVER_FETCH_DEBOUNCE_MS);

  $effect(() => {
    if (!guid) {
      return;
    }

    fetchEnabled = false;
    enableFetch();

    return () => {
      enableFetch.cancel();
    };
  });

  const deliveryPointQuery = createDeliveryPointQuery(() => ({
    id: guid,
    options: { enabled: fetchEnabled },
  }));

  const deliveryPointInfo = $derived(deliveryPointQuery.data);
  const deliveryPointInfoLoading = $derived(deliveryPointQuery.isPending);

  const getInventoryAmount = (cargoKey: DeliveryCargo, isInput: boolean) =>
    utilGetInventoryAmount(deliveryPointInfo, cargoKey, isInput);

  const lastUpdated = $derived.by(() => {
    const curr = new Date();
    return min([deliveryPointInfo?.last_updated ?? curr, curr]);
  });
</script>

{#if hoverInfo.info.allSupply.length}
  <div class="flex flex-col text-xs text-text-300">
    <div class="font-semibold text-text-200">
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
  <div class="flex flex-col text-xs text-text-300">
    <div class="font-semibold text-text-200">
      <span class="mr-0.5 inline-block size-2 rounded-full bg-blue-500"></span>
      {m['delivery.demand']()}
    </div>
    {#each hoverInfo.info.allDemand as item (item)}
      <div class="flex justify-between gap-11">
        <div class="flex items-center gap-1">
          {getMtLocale(cargoName[item])}
          {#if hoverInfo.info.parent || hasDropPoint(item)}
            <Icon class="-mb-0.5 icon-[material-symbols--link-rounded] text-yellow-500" size="xs" />
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
{#if differenceInSeconds(rtDate.d.getTime(), lastUpdated) > DELIVERY_STALE_WARN_SECONDS}
  <div class="text-xs text-text-300">
    <span class="font-semibold text-text-dark">
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
