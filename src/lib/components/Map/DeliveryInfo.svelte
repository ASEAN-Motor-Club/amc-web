<script lang="ts">
  import { deliveryPointsMap, type DeliveryPoint } from '$lib/data/deliveryPoint';
  import { cargoName } from '$lib/data/cargo';
  import type { DeliveryCargo, DeliveryCargoType } from '$lib/data/types';
  import { m as msg } from '$lib/paraglide/messages';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { DeliveryPointInfo } from '$lib/api/types';
  import { SvelteDate } from 'svelte/reactivity';
  import outCargoKey from '$lib/assets/data/out_cargo_key.json';
  import { formatDistanceStrict, differenceInMinutes } from '$lib/date';
  import { mtLocale } from '$lib/components/MtLocale/mtLocale.svelte';
  import { getDeliveryPointInfo } from '$lib/api/delivery';
  import { deliveryInfoCaches } from './deliveryInfoCaches.svelte';

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

  $effect(() => {
    if (!guid) {
      return;
    }

    const cache = deliveryInfoCaches.get(guid);
    if (cache) {
      const [age, deliveryPointInfoCache] = cache;
      if (differenceInMinutes(new Date(), age) < 1) {
        deliveryPointInfo = deliveryPointInfoCache;
        deliveryPointInfoLoading = false;
        return;
      }
    }

    deliveryPointInfoLoading = true;
    deliveryPointInfo = undefined;

    const abortController = new AbortController();

    getDeliveryPointInfo(guid, abortController.signal)
      .then((info) => {
        if (info) {
          deliveryInfoCaches.set(guid, [new Date(), info]);
        }
        deliveryPointInfo = info;
      })
      .finally(() => {
        deliveryPointInfoLoading = false;
      });

    return () => {
      abortController.abort();
    };
  });
</script>

{#if hoverInfo.info.allSupply.length}
  <div class="flex flex-col text-xs">
    <div class="font-semibold">
      <span class="mr-0.5 inline-block size-2 rounded-full bg-green-500"></span>
      {msg['map.supply']()}
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
      {msg['map.demand']()}
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
  <span class="font-semibold">{msg['map.last_updated']()}:</span>
  {#if deliveryPointInfoLoading}
    <span class="animate-pulse">...</span>
  {:else}
    {formatDistanceStrict(deliveryPointInfo?.last_updated ?? new Date(), date, {
      addSuffix: true,
    })}
  {/if}
</div>
