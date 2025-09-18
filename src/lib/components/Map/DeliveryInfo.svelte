<script lang="ts">
  import { deliveryPointsMap, type DeliveryPoint } from '$lib/data/deliveryPoint';
  import { cargoName } from '$lib/data/cargo';
  import type { DeliveryCargo, DeliveryCargoType } from '$lib/data/types';
  import { m as msg } from '$lib/paraglide/messages';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { DeliveryPointInfo } from '$lib/api/types';
  import { SvelteDate, type SvelteMap } from 'svelte/reactivity';
  import outCargoKey from '$lib/assets/data/out_cargo_key.json';
  import { formatDistanceStrict } from '$lib/date';

  export interface HoverInfo {
    info: DeliveryPoint;
  }

  export interface HoverInfoTooltipProps {
    hoverInfo: HoverInfo;
    deliveryPointInfosLoading: boolean;
    deliveryPointInfos: SvelteMap<string, DeliveryPointInfo>;
  }

  const { hoverInfo, deliveryPointInfos, deliveryPointInfosLoading }: HoverInfoTooltipProps =
    $props();

  const hasDropPoint = (item: DeliveryCargo) => {
    return hoverInfo.info.dropPoint?.some((drop) =>
      deliveryPointsMap.get(drop)?.allDemand.includes(item),
    );
  };

  const deliveryPointInfo = $derived.by(() => {
    if (!hoverInfo) {
      return undefined;
    }
    return deliveryPointInfos.get(hoverInfo.info.guid);
  });

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

    if (cargoKey.startsWith('Type::')) {
      const cargoKeys = outCargoKey[cargoKey as DeliveryCargoType];
      return inventory.reduce(
        (sum, item) => sum + (cargoKeys.includes(item.cargoKey) ? item.amount : 0),
        0,
      );
    }

    return inventory.find((i) => i.cargoKey === cargoKey)?.amount ?? 0;
  };

  const date = new SvelteDate();
</script>

{#if hoverInfo.info.allSupply.length}
  <div class="flex flex-col text-xs">
    <div class="font-semibold">
      <span class="mr-0.5 inline-block size-2 rounded-full bg-green-500"></span>
      {msg['map.supply']()}
    </div>
    {#each hoverInfo.info.allSupply as item (item)}
      <div class="flex justify-between gap-10">
        <div>{cargoName[item]}</div>
        <div class="relative">
          <span class="absolute right-full">
            {#if deliveryPointInfosLoading}
              ...
            {:else}
              {getInventoryAmount(item, false)}
            {/if}
          </span>
          {#if !item.startsWith('Type::')}
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
          {cargoName[item]}
          {#if hoverInfo.info.parent || hasDropPoint(item)}
            <Icon class="i-material-symbols:link-rounded -mb-px text-yellow-500" size="xs" />
          {/if}
        </div>
        <div class="relative">
          <span class="absolute right-full">
            {#if deliveryPointInfosLoading}
              ...
            {:else}
              {getInventoryAmount(item, true)}
            {/if}
          </span>
          {#if !item.startsWith('Type::')}
            /{hoverInfo.info.demandStorage[item]}
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
<div class="text-xs">
  <span class="font-semibold">{msg['map.last_updated']()}:</span>
  {formatDistanceStrict(deliveryPointInfo?.last_updated ?? new Date(), date, {
    addSuffix: true,
  })}
</div>
