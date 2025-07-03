<script lang="ts">
  import type { House } from '$lib/data/house';
  import type { HouseData } from '$lib/api/types';
  import { PointType } from './types';
  import { SvelteDate } from 'svelte/reactivity';
  import { m } from '$lib/paraglide/messages';

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
      return m['map.expired']();
    }

    // Convert milliseconds to different units
    const minutes = Math.floor(rentLeft / (1000 * 60));
    const hours = Math.floor(rentLeft / (1000 * 60 * 60));
    const days = Math.floor(rentLeft / (1000 * 60 * 60 * 24));

    // Show only the highest applicable unit
    if (days > 0) {
      return `${days} ${days === 1 ? m['map.day']() : m['map.days']()}`;
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? m['map.hour']() : m['map.hours']()}`;
    } else if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? m['map.minute']() : m['map.minutes']()}`;
    } else {
      return m['map.less_than_minute']();
    }
  });
</script>

<div class="flex flex-col text-xs">
  <div>
    <span class="font-semibold">{m['map.size']()}</span>
    {hoverInfo.info.size.x / 100} x {hoverInfo.info.size.y / 100}
  </div>
  <div>
    <span class="font-semibold">{m['map.rent_price']()}</span>
    {hoverInfo.info.cost / 10}
  </div>
  <div>
    <span class="font-semibold">{m['map.owner']()}</span>
    {currentHouseData ? (currentHouseData.ownerName ?? m['map.vacant']()) : '...'}
  </div>
  {#if currentHouseData?.ownerName}
    <div>
      <span class="font-semibold">{m['map.rent_left']()}</span>
      {rentLeftText}
    </div>
  {/if}
  <div>
    <span class="font-semibold">{m['map.depot']()}</span> TODO
  </div>
  <div>
    <span class="font-semibold">{m['map.depot_storage']()}</span> TODO
  </div>
</div>
