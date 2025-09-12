<script lang="ts">
  import type { House } from '$lib/data/house';
  import type { HouseData } from '$lib/api/types';
  import type { PointType } from './types';
  import { SvelteDate } from 'svelte/reactivity';
  import { m as msg } from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { isBefore } from '$lib/date';
  import { formatDistanceStrict } from '$lib/date';  

  export interface HoverInfo {
    name: string | undefined;
    pixelCoord: [number, number];
    pointType: PointType.House;
    info: House;
  }

  export interface HoverInfoTooltipProps {
    hoverInfo: HoverInfo;
    houseData: HouseData | undefined;
  }

  const { hoverInfo, houseData }: HoverInfoTooltipProps = $props();

  const currentHouseData = $derived.by(() => {
    if (!hoverInfo) {
      return undefined;
    }
    return houseData?.[hoverInfo.info.name];
  });

  const rentLeftText = $derived.by(() => {
    if (!hoverInfo || !currentHouseData) {
      return '...';
    }

    // If rent has expired
    if (isBefore(currentHouseData.rentLeft, SvelteDate.now())) {
      return msg['housing.expired']();
    }

    return formatDistanceStrict(currentHouseData.rentLeft, new Date(), {
      roundingMethod: 'floor',
    });
  });
</script>

<div class="flex flex-col text-xs">
  <div>
    <span class="font-semibold">{msg['housing.id']()}:</span>
    {hoverInfo.info.name}
  </div>
  <div>
    <span class="font-semibold">{msg['housing.size']()}:</span>
    {hoverInfo.info.size.x / 100} x {hoverInfo.info.size.y / 100}
  </div>
  <div>
    <span class="font-semibold">{msg['housing.rent_price']()}:</span>
    {(hoverInfo.info.cost / 10).toLocaleString(getLocale())}
  </div>
  {#if currentHouseData?.ownerName}
    <div>
      <span class="font-semibold">{msg['housing.rent_left']()}:</span>
      {rentLeftText}
    </div>
  {/if}
  <!-- <div>
    <span class="font-semibold">{msg['housing.depot']()}:</span> TODO
  </div>
  <div>
    <span class="font-semibold">{msg['housing.depot_storage']()}:</span> TODO
  </div> -->
</div>
