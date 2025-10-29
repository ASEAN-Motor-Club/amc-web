<script lang="ts">
  import type { House } from '$lib/data/house';
  import type { HouseData } from '$lib/api/types';
  import { isBefore } from '$lib/date';
  import { formatDistanceStrict } from '$lib/date';
  import { m } from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { createSvelteDate } from '$lib/svelteDate.svelte';

  export interface HoverInfo {
    info: House;
  }

  export interface HoverInfoTooltipProps {
    hoverInfo: HoverInfo;
    houseData: HouseData | undefined;
  }

  const { hoverInfo, houseData }: HoverInfoTooltipProps = $props();

  const svelteDate = createSvelteDate();

  const currentHouseData = $derived.by(() => {
    return houseData?.[hoverInfo.info.name];
  });

  const rentLeftText = $derived.by(() => {
    if (!currentHouseData) {
      return '...';
    }

    const time = svelteDate.getTime();

    if (isBefore(currentHouseData.rentLeft, time)) {
      return m['housing.expired']();
    }

    return formatDistanceStrict(currentHouseData.rentLeft, time, {
      roundingMethod: 'floor',
    });
  });

  const locale = $derived.by(getLocale);
</script>

<div class="flex flex-col text-xs">
  <div>
    <span class="font-semibold">{m['housing.id']()}:</span>
    {hoverInfo.info.name}
  </div>
  <div>
    <span class="font-semibold">{m['housing.size']()}:</span>
    {hoverInfo.info.size.x / 100} x {hoverInfo.info.size.y / 100}
  </div>
  <div>
    <span class="font-semibold">{m['housing.rent_price']()}:</span>
    {(hoverInfo.info.cost / 10).toLocaleString(locale)}
  </div>
  {#if currentHouseData?.ownerName}
    <div>
      <span class="font-semibold">{m['housing.rent_left']()}:</span>
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
