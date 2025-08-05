<script lang="ts">
  import { deliveryPointsMap, type DeliveryPoint } from '$lib/data/deliveryPoint';
  import { cargoName } from '$lib/data/cargo';
  import type { DeliveryCargo } from '$lib/data/types';
  import { m as msg } from '$lib/paraglide/messages';
  import Icon from '$lib/ui/Icon/Icon.svelte';

  export type HoverInfo = {
    info: DeliveryPoint;
  };

  export type HoverInfoTooltipProps = {
    hoverInfo: HoverInfo;
  };

  const { hoverInfo }: HoverInfoTooltipProps = $props();

  const hasDropPoint = (item: DeliveryCargo) => {
    return hoverInfo.info.dropPoint?.some((drop) =>
      deliveryPointsMap.get(drop)?.allDemand.includes(item),
    );
  };
</script>

{#if hoverInfo.info.allSupply.length}
  <div class="flex flex-col text-xs">
    <div class="font-semibold">{msg['map.supply']()}</div>
    {#each hoverInfo.info.allSupply as item (item)}
      <div class="flex justify-between gap-10">
        <div>{cargoName[item]}</div>
        <div class="relative">
          <span class="absolute right-full">TODO</span>/{hoverInfo.info.storage[item]}
        </div>
      </div>
    {/each}
  </div>
{/if}
{#if hoverInfo.info.allDemand.length}
  <div class="flex flex-col text-xs">
    <div class="font-semibold">{msg['map.demand']()}</div>
    {#each hoverInfo.info.allDemand as item (item)}
      <div class="flex justify-between gap-11">
        <div class="flex items-center gap-1.5">
          {cargoName[item]}
          {#if hoverInfo.info.parent || hasDropPoint(item)}
            <Icon class="i-material-symbols:link-rounded -mb-px" size="xs" />
          {/if}
        </div>
        <div class="relative">
          <span class="absolute right-full">TODO</span>/{hoverInfo.info.storage[item]}
        </div>
      </div>
    {/each}
  </div>
{/if}
