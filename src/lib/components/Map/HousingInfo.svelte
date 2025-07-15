<script lang="ts">
  import type { House } from '$lib/data/house';
  import type { HouseData } from '$lib/api/types';
  import { PointType } from './types';
  import { SvelteDate } from 'svelte/reactivity';
  import { m } from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';

  export type HoverInfo = {
    name: string | undefined;
    pixelCoord: [number, number];
    pointType: PointType.House;
    info: House;
  };

  export type HoverInfoTooltipProps = {
    hoverInfo: HoverInfo;
    houseData: HouseData | undefined;
  };

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

    let rentLeft = currentHouseData.rentLeft.getTime() - SvelteDate.now();

    // If rent has expired
    if (rentLeft <= 0) {
      return m['housing.expired']();
    }

    // Convert milliseconds to different units
    const minutes = Math.floor(rentLeft / (1000 * 60));
    const hours = Math.floor(rentLeft / (1000 * 60 * 60));
    const days = Math.floor(rentLeft / (1000 * 60 * 60 * 24));

    // Show only the highest applicable unit
    if (days > 0) {
      return m['housing.days']({
        days,
      });
    } else if (hours > 0) {
      return m['housing.hours']({
        hours,
      });
    } else if (minutes > 0) {
      return m['housing.minutes']({
        minutes,
      });
    } else {
      return m['housing.less_than_minute']();
    }
  });
</script>

<div class="flex flex-col text-xs">
  <div>
    <span class="font-semibold">{m['housing.size']()}:</span>
    {hoverInfo.info.size.x / 100} x {hoverInfo.info.size.y / 100}
  </div>
  <div>
    <span class="font-semibold">{m['housing.rent_price']()}:</span>
    {(hoverInfo.info.cost / 10).toLocaleString(getLocale())}
  </div>
  <div>
    <span class="font-semibold">{m['housing.owner']()}:</span>
    {#if currentHouseData}
      {#if currentHouseData.ownerName}
        {currentHouseData.ownerName}
      {:else}
        <span class="font-bold italic">{m['housing.vacant']()}</span>
      {/if}
    {:else}
      ...
    {/if}
  </div>
  {#if currentHouseData?.ownerName}
    <div>
      <span class="font-semibold">{m['housing.rent_left']()}:</span>
      {rentLeftText}
    </div>
  {/if}
  <div>
    <span class="font-semibold">{m['housing.depot']()}:</span> TODO
  </div>
  <div>
    <span class="font-semibold">{m['housing.depot_storage']()}:</span> TODO
  </div>
</div>
