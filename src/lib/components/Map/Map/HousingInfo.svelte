<script lang="ts">
  import type { House } from '$lib/data/house';
  import type { HouseData } from '$lib/api/types';
  import { isBefore } from '$lib/date';
  import { formatDistanceStrict } from '$lib/date';
  import { m } from '$messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { rtDate } from '$lib/realtimeDate.svelte';

  export interface HoverInfo {
    info: House;
  }

  export interface HoverInfoTooltipProps {
    hoverInfo: HoverInfo;
    houseData: HouseData | undefined;
  }

  const { hoverInfo, houseData }: HoverInfoTooltipProps = $props();

  const currentHouseData = $derived.by(() => {
    return houseData?.[hoverInfo.info.name];
  });

  const rentLeftText = $derived.by(() => {
    if (!currentHouseData) {
      return '...';
    }

    const time = rtDate.d.getTime();

    if (isBefore(currentHouseData.rentLeft, time)) {
      return m['housing.expired']();
    }

    return formatDistanceStrict(currentHouseData.rentLeft, time, {
      roundingMethod: 'floor',
    });
  });

  const locale = $derived.by(getLocale);
</script>

<div class="text-text-300 flex flex-col text-xs">
  <div>
    <div class="text-text-200 font-semibold">{m['housing.id']()}</div>
    {hoverInfo.info.name}
  </div>
  <div>
    <div class="text-text-200 font-semibold">{m['housing.size']()}</div>
    {hoverInfo.info.size.x / 100} x {hoverInfo.info.size.y / 100}
  </div>
  <div>
    <div class="text-text-200 font-semibold">{m['housing.rent_price']()}</div>
    {(hoverInfo.info.cost / 10).toLocaleString(locale)}
  </div>
  {#if currentHouseData?.ownerName}
    <div>
      <div class="text-text-200 font-semibold">{m['housing.rent_left']()}</div>
      {rentLeftText}
    </div>
  {/if}
  <!-- <div>
    <span class="font-semibold">{m['housing.depot']()}:</span> TODO
  </div>
  <div>
    <span class="font-semibold">{m['housing.depot_storage']()}:</span> TODO
  </div> -->
</div>
