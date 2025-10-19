<script lang="ts">
  import type { House } from '$lib/data/house';
  import type { HouseData } from '$lib/api/types';
  import { SvelteDate } from 'svelte/reactivity';
  import { isBefore } from '$lib/date';
  import { formatDistanceStrict } from '$lib/date';
  import { m as msg } from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';

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

  const date = new SvelteDate();

  $effect(() => {
    let animationId: number;

    const updateTime = () => {
      date.setTime(Date.now());
      animationId = requestAnimationFrame(updateTime);
    };

    animationId = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationId);
    };
  });

  const rentLeftText = $derived.by(() => {
    if (!currentHouseData) {
      return '...';
    }

    const time = date.getTime();

    if (isBefore(currentHouseData.rentLeft, time)) {
      return msg['housing.expired']();
    }

    return formatDistanceStrict(currentHouseData.rentLeft, time, {
      roundingMethod: 'floor',
    });
  });

  const locale = $derived.by(getLocale);
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
    {(hoverInfo.info.cost / 10).toLocaleString(locale)}
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
