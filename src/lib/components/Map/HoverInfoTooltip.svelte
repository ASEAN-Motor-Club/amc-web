<script lang="ts">
  import { fade } from 'svelte/transition';
  import { PointType, type PlayerData } from './types';
  import Card from '$lib/ui/Card/Card.svelte';
  import DeliveryInfo from './DeliveryInfo.svelte';
  import HousingInfo from './HousingInfo.svelte';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import type { DeliveryPoint } from '$lib/data/deliveryPoint';
  import type { House } from '$lib/data/house';
  import Button from '$lib/ui/Button/Button.svelte';
  import type { HouseData } from '$lib/api/types';
  import { m } from '$lib/paraglide/messages';
  import PlayerInfo from './PlayerInfo.svelte';

  export type HoverInfo = {
    name: string | undefined;
    pixelCoord: [number, number];
    location: string;
  } & (
    | {
        pointType: PointType.Delivery;
        info: DeliveryPoint;
      }
    | {
        pointType: PointType.Player;
        info: PlayerData;
      }
    | {
        pointType: PointType.House;
        info: House;
      }
  );

  export type HoverInfoTooltipProps = {
    houseData: HouseData | undefined;
    hoverInfo: HoverInfo | undefined;
    onClick?: () => void;
  };

  const { hoverInfo, onClick, houseData }: HoverInfoTooltipProps = $props();

  const typeText = $derived.by(() => {
    if (!hoverInfo) {
      return '';
    }

    switch (hoverInfo.pointType) {
      case PointType.Delivery:
        return m['map.delivery_point']();
      case PointType.Player:
        return m['map.player']();
      case PointType.House:
        return m['map.house']();
    }
  });

  const typeHasMoreInfo = $derived.by(() => {
    if (!hoverInfo) {
      return false;
    }
    return hoverInfo.pointType === PointType.Delivery || hoverInfo.pointType === PointType.House;
  });

  let tooltip: HTMLDivElement | undefined = $state(undefined);

  const tooltipPosition = $derived.by(() => {
    if (!hoverInfo) {
      return [];
    }
    const position = [hoverInfo.pixelCoord[0], hoverInfo.pixelCoord[1]];

    const parentBounding = tooltip?.parentElement?.getBoundingClientRect();
    const parentWidth = parentBounding?.width ?? 0;
    const parentHeight = parentBounding?.height ?? 0;

    const tooltipBounding = tooltip?.getBoundingClientRect();
    const tooltipWidth = tooltipBounding?.width ?? 0;
    const tooltipHeight = tooltipBounding?.height ?? 0;

    const widthOverFlow = position[0] + tooltipWidth > parentWidth;
    const heightOverFlow = position[1] + tooltipHeight > parentHeight;

    if (heightOverFlow) {
      position[1] -= tooltipHeight;
    }

    if (widthOverFlow) {
      position[0] -= tooltipWidth;
    }

    return position;
  });
</script>

{#if hoverInfo}
  <div
    transition:fade={{ duration: defaultTransitionDurationMs }}
    class="pointer-events-none absolute"
    style:left="{tooltipPosition[0]}px"
    style:top="{tooltipPosition[1]}px"
    bind:this={tooltip}
  >
    <Card
      class="text-text-dark !shadow-white/3 media-mouse:m-2 m-1 flex select-none flex-col gap-0.5 whitespace-nowrap !bg-neutral-900/50 !px-1.5 !py-1 !ring-white/5 backdrop-blur-lg"
    >
      <div class="text-xs font-semibold">
        {typeText}
      </div>
      <div class="text-sm">
        {hoverInfo.name}
      </div>
      {#if hoverInfo.info}
        <div class="border-t-1 my-0.5 w-full border-neutral-100/20"></div>
        {#if hoverInfo.pointType === PointType.Delivery}
          <DeliveryInfo {hoverInfo} />
        {:else if hoverInfo.pointType === PointType.House}
          <HousingInfo {hoverInfo} {houseData} />
        {:else if hoverInfo.pointType === PointType.Player}
          <PlayerInfo {hoverInfo} />
        {/if}
      {/if}
      <div class="border-t-1 my-0.5 w-full border-neutral-100/20"></div>
      <div class="mb-0.5 text-xs font-semibold text-neutral-300">
        {hoverInfo.location}
      </div>
      {#if hoverInfo.pointType === PointType.Delivery}
        <Button size="xs" class="media-not-mouse:hidden mb-0.5 !bg-white/10 !px-2">
          {m['map.click_lock']()}
        </Button>
      {/if}
      {#if typeHasMoreInfo}
        <Button size="xs" class="media-not-mouse:pointer-events-auto !bg-white/10 !px-2" {onClick}>
          <span class="media-mouse:inline hidden">{m['map.click_info']()}</span>
          <span class="media-not-mouse:inline hidden">{m['map.click_here_info']()}</span>
        </Button>
      {/if}
    </Card>
  </div>
{/if}
