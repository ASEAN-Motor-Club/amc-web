<script lang="ts">
  import { deliveryPointsMap, type DeliveryPoint } from '$lib/data/deliveryPoint';
  import { cargoName } from '$lib/data/cargo';
  import type { DeliveryCargo, DeliveryCargoType } from '$lib/data/types';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { DeliveryPointInfo } from '$lib/api/types';
  import { SvelteDate } from 'svelte/reactivity';
  import outCargoKey from '$lib/assets/data/out_cargo_key.json';
  import { formatDistanceStrict, differenceInSeconds } from '$lib/date';
  import { mtLocale } from '$lib/components/Locale/locale.svelte';
  import { getDeliveryPointInfo } from '$lib/api/delivery';
  import { deliveryInfoCaches } from './deliveryInfoCaches.svelte';
  import { onDestroy } from 'svelte';
  import { debounce } from 'lodash-es';

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

  const getInventoryAmount = (cargoKey: DeliveryCargo, isInput: boolean) => {
    if (!deliveryPointInfo) {
      return 0;
    }

    const inventory = isInput
      ? deliveryPointInfo.data.inputInventory
      : deliveryPointInfo.data.outputInventory;
    if (!Array.isArray(inventory)) {
      return 0;
    }

    if (cargoKey.startsWith('T::')) {
      const cargoKeys = outCargoKey[cargoKey as DeliveryCargoType];
      return inventory.reduce(
        (sum, item) => sum + (cargoKeys.includes(item.cargoKey) ? item.amount : 0),
        0,
      );
    }

    return inventory.find((i) => i.cargoKey === cargoKey)?.amount ?? 0;
  };

  const date = new SvelteDate();

  let deliveryPointInfoLoading: boolean = $state(true);

  let guid = $derived(hoverInfo.info.guid);

  let abortController: AbortController | undefined;

  const debouncedGetInfo = debounce(() => {
    abortController?.abort();
    abortController = new AbortController();
    getDeliveryPointInfo(guid, abortController.signal)
      .then((info) => {
        if (info) {
          deliveryInfoCaches.set(guid, info);
        }
        deliveryPointInfo = info;
      })
      .finally(() => {
        deliveryPointInfoLoading = false;
      });
  }, 200);

  $effect(() => {
    if (!guid) {
      return;
    }

    const cache = deliveryInfoCaches.get(guid);
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

    debouncedGetInfo();
  });

  onDestroy(() => {
    debouncedGetInfo.cancel();
    abortController?.abort();
  });
</script>

{#if hoverInfo.info.allSupply.length}
  <div class="flex flex-col text-xs">
    <div class="font-semibold">
      <span class="mr-0.5 inline-block size-2 rounded-full bg-green-500"></span>
      {siteLocale.msg['map.supply']()}
    </div>
    {#each hoverInfo.info.allSupply as item (item)}
      <div class="flex justify-between gap-10">
        <div>{cargoName[item][mtLocale.l]}</div>
        <div class="relative">
          <span class="absolute right-full">
            {#if deliveryPointInfoLoading}
              <span class="animate-pulse">...</span>
            {:else}
              {getInventoryAmount(item, false)}
            {/if}
          </span>
          {#if !item.startsWith('T::')}
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
      {siteLocale.msg['map.demand']()}
    </div>
    {#each hoverInfo.info.allDemand as item (item)}
      <div class="flex justify-between gap-11">
        <div class="flex items-center gap-1.5">
          {cargoName[item][mtLocale.l]}
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
          {#if !item.startsWith('T::')}
            /{hoverInfo.info.demandStorage[item]}
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
<div class="text-xs">
  <span class="font-semibold">{siteLocale.msg['map.last_updated']()}:</span>
  {#if deliveryPointInfoLoading}
    <span class="animate-pulse">...</span>
  {:else}
    {formatDistanceStrict(deliveryPointInfo?.last_updated ?? new Date(), date, {
      addSuffix: true,
    })}
  {/if}
</div>
