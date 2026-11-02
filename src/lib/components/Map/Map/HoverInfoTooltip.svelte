<script lang="ts">
  import { fade } from 'svelte/transition';
  import { PointType, type PlayerData, type TeleportPoint } from './types.ts';
  import Card from '#lib/ui/Card/Card.svelte';
  import DeliveryInfo from './DeliveryInfo.svelte';
  import HousingInfo from './HousingInfo.svelte';
  import { defaultTransitionDurationMs } from '#lib/tw-var.ts';
  import type { DeliveryPoint } from '#lib/data/deliveryPoint.ts';
  import type { House } from '#lib/data/house.ts';
  import Button from '#lib/ui/Button/Button.svelte';
  import type { DepotData, HouseData } from '#lib/api/types.ts';
  import { m } from '#messages';
  import PlayerInfo from './PlayerInfo.svelte';
  import TeleportInfo from './TeleportInfo.svelte';
  import { formatLocationAtPoint } from '../utils.ts';
  import { getMtLocale } from '#lib/utils/getMtLocale.ts';
  import { stripPlayerRoleTag } from '#lib/utils/parsePlayerRole.ts';

  export type HoverInfo = {
    pixelCoord: [x: number, y: number];
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
    | {
        pointType: PointType.Teleport;
        info: TeleportPoint;
      }
  );

  export interface HoverInfoTooltipProps {
    houseData: HouseData | undefined;
    depotData: DepotData | undefined;
    hoverInfo: HoverInfo | undefined;
    onClick?: () => void;
    onCopyTeleport?: () => void;
    teleportCopied?: boolean;
  }

  const {
    hoverInfo,
    onClick,
    houseData,
    depotData,
    onCopyTeleport,
    teleportCopied,
  }: HoverInfoTooltipProps = $props();

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
      case PointType.Teleport:
        return m['map.teleport_point']();
    }
  });

  const typeHasMoreInfo = $derived.by(() => {
    if (!hoverInfo) {
      return false;
    }
    return hoverInfo.pointType === PointType.House || hoverInfo.pointType === PointType.Delivery;
  });

  let tooltip: HTMLDivElement | undefined = $state();

  const [ttLeft, ttTop] = $derived.by(() => {
    if (!hoverInfo) {
      return [];
    }
    let [left, top] = hoverInfo.pixelCoord;

    const parentBounding = tooltip?.parentElement?.getBoundingClientRect();
    const parentWidth = parentBounding?.width ?? 0;
    const parentHeight = parentBounding?.height ?? 0;

    const tooltipBounding = tooltip?.getBoundingClientRect();
    const tooltipWidth = tooltipBounding?.width ?? 0;
    const tooltipHeight = tooltipBounding?.height ?? 0;

    const widthOverFlow = left + tooltipWidth > parentWidth;
    const heightOverFlow = top + tooltipHeight > parentHeight;

    if (heightOverFlow) {
      top -= tooltipHeight;
    }

    if (widthOverFlow) {
      left -= tooltipWidth;
    }

    return [left, top];
  });
</script>

{#if hoverInfo}
  <div
    transition:fade={{ duration: defaultTransitionDurationMs }}
    class="pointer-events-none absolute"
    style:left="{ttLeft}px"
    style:top="{ttTop}px"
    bind:this={tooltip}
  >
    <Card
      class="m-1 flex flex-col gap-0.5 !bg-gray-900/50 px-1.5 py-1 whitespace-nowrap text-text-dark shadow-white/3 ring-white/5 backdrop-blur-sm select-none contrast-more:bg-gray-950! contrast-more:ring-white/60! pointer-fine:m-2"
    >
      <div class="text-xs font-bold text-text-400">
        {typeText}
      </div>
      <div class="text-sm font-semibold text-text-dark">
        {#if hoverInfo.pointType === PointType.House}
          {houseData?.[hoverInfo.info.name]?.ownerName
            ? m['housing.owned_house']({
                owner: houseData[hoverInfo.info.name].ownerName,
              })
            : m['housing.vacant_house']()}
        {:else if hoverInfo.pointType === PointType.Teleport}
          {hoverInfo.info.name}
        {:else if hoverInfo.pointType === PointType.Delivery}
          {getMtLocale(hoverInfo.info.name)}
        {:else}
          {stripPlayerRoleTag(hoverInfo.info.name)}
        {/if}
      </div>
      {#if hoverInfo.info}
        <div class="my-0.5 w-full border-t-1 border-gray-100/20"></div>
        {#if hoverInfo.pointType === PointType.Delivery}
          <DeliveryInfo {hoverInfo} />
        {:else if hoverInfo.pointType === PointType.House}
          <HousingInfo {hoverInfo} {houseData} {depotData} />
        {:else if hoverInfo.pointType === PointType.Player}
          <PlayerInfo {hoverInfo} />
        {:else}
          <TeleportInfo {hoverInfo} />
        {/if}
      {/if}
      <div class="my-0.5 w-full border-t-1 border-gray-100/20"></div>
      <div class="mb-0.5 text-xs font-semibold text-text-400">
        {formatLocationAtPoint(hoverInfo.info.coord)}
      </div>
      {#if hoverInfo.pointType === PointType.Teleport}
        <Button
          size="xs"
          class="mb-0.5 bg-white/10 px-2 text-text-300 not-pointer-fine:pointer-events-auto"
          onClick={onCopyTeleport}
        >
          <span class="relative">
            <span class={['hidden pointer-fine:inline', { invisible: teleportCopied }]}
              >{m['map.teleport_copy_hint']()}</span
            >
            <span class={['hidden not-pointer-fine:inline', { invisible: teleportCopied }]}
              >{m['map.teleport_copy']()}</span
            >
            {#if teleportCopied}
              <span class="absolute inset-0 flex items-center justify-center">
                {m['map.teleport_copied']()}
              </span>
            {/if}
          </span>
        </Button>
      {/if}
      {#if typeHasMoreInfo}
        <Button
          size="xs"
          class="mb-0.5 bg-white/10 px-2 text-text-300 not-pointer-fine:pointer-events-auto"
          {onClick}
        >
          <span class="hidden pointer-fine:inline">{m['map.click_info']()}</span>
          <span class="hidden not-pointer-fine:inline">{m['map.click_here_info']()}</span>
        </Button>
      {/if}
    </Card>
  </div>
{/if}
