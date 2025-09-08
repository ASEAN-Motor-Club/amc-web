<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import type { FormEventHandler } from 'svelte/elements';
  import { deliveryPoints as unmappedDeliveryPoints } from '$lib/data/deliveryPoint';
  import { houses as unmappedHouse } from '$lib/data/house';
  import { PointType, type PlayerData } from './types';
  import { cargoName } from '$lib/data/cargo';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import type { Vector2 } from 'mt-map';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { fade } from 'svelte/transition';
  import type { HouseData } from '$lib/api/types';
  import { m as msg } from '$lib/paraglide/messages';
  import ClickAwayBlock from '$lib/ui/ClickAwayBlock/ClickAwayBlock.svelte';
  import PlayerVehicleInfo from './PlayerVehicleInfo.svelte';
  import type { Pins } from '$lib/schema/pin';

  export type SearchPoint = {
    guid?: string;
    name: string;
    coord: Vector2;
    location?: string;
  } & (
    | {
        pointType: PointType.Delivery;
        supplyText?: string;
        demandText?: string;
      }
    | {
        pointType: PointType.House | PointType.Player | PointType.Pin;
      }
  );

  const deliveryPoints = unmappedDeliveryPoints
    .filter((point) => point.type !== 'Resident_C')
    .map((point) => ({
      ...point,
      pointType: PointType.Delivery,
      supplyText: point.allSupply.map((i) => cargoName[i]).join(', '),
      demandText: point.allDemand.map((i) => cargoName[i]).join(', '),
    }));

  const house = unmappedHouse.map((point) => ({
    ...point,
    pointType: PointType.House,
  }));

  export interface SearchProps {
    playerData: PlayerData[];
    onPointClick?: (point: SearchPoint) => void;
    houseData: HouseData | undefined;
    pinsData: Pins;
  }

  const { playerData, onPointClick, houseData, pinsData: pinsDataProps }: SearchProps = $props();

  const pinsData = $derived.by(() => {
    return pinsDataProps.map((pin) => ({
      ...pin,
      pointType: PointType.Pin,
      name: pin.label,
      coord: pin as Vector2,
    }));
  });

  let searchValue = $state('');
  let focus = $state(false);

  const handleInput: FormEventHandler<HTMLInputElement> = (event) => {
    searchValue = event.currentTarget.value;
  };

  const playerVehicleMap = $derived.by(() => {
    return new Map(playerData.map((player) => [player.guid, player.vehicleKey]));
  });

  const foundValues: SearchPoint[] = $derived.by(() => {
    if (!focus) return [];
    if (!searchValue) return [...pinsData, ...playerData];
    const search = searchValue.trim().toLowerCase();

    const pins = pinsData?.filter((pin) => pin.label?.toLowerCase().includes(search)) ?? [];

    const player = playerData.filter(
      (player) =>
        player.name.toLowerCase().includes(search) ||
        player.location.toLowerCase().includes(search),
    );

    const delivery = deliveryPoints.filter(
      (point) =>
        point.name.toLowerCase().includes(search) ||
        point.location.toLowerCase().includes(search) ||
        point.supplyText.toLowerCase().includes(search) ||
        point.demandText.toLowerCase().includes(search),
    );

    const housePoints = house.filter(
      (point) =>
        point.name.toLowerCase().includes(search) ||
        point.location.toLowerCase().includes(search) ||
        houseData?.[point.name]?.ownerName.toLowerCase().includes(search),
    );

    return [...pins, ...player, ...housePoints, ...delivery];
  });

  const getHref = (point: SearchPoint) => {
    switch (point.pointType) {
      case PointType.Delivery:
        return `?delivery=${point.guid}`;
      case PointType.House:
        return `?house=${point.name}`;
      case PointType.Player:
        return `?player=${point.guid}`;
      default:
        return '';
    }
  };

  const handleLinkClick = (event: Event, point: SearchPoint) => {
    focus = false;
    event.preventDefault();
    if (point.pointType !== PointType.Pin) {
      replaceState(getHref(point), page.state);
    }
    onPointClick?.(point);
  };

  const maxShow = 50;

  const foundValuesSliced = $derived(searchValue ? foundValues.slice(0, maxShow) : foundValues);

  let inputElement: HTMLDivElement | undefined = $state();
</script>

<div class="flex min-h-0 w-full max-w-sm flex-col gap-2">
  <div class="contents" bind:this={inputElement}>
    <TextInput
      value={searchValue}
      name="search"
      type="search"
      placeholder={msg['map.search_placeholder']()}
      class="text-text-dark !shadow-white/3 pointer-events-auto w-full !border-none !bg-neutral-900/50 !ring-white/5 backdrop-blur-lg hover:!bg-neutral-900/40 focus:!bg-neutral-900/60"
      onInput={handleInput}
      additionalAttributes={{
        onclick: () => (focus = true),
      }}
    />
  </div>

  {#if foundValues.length}
    <ClickAwayBlock
      onClickAway={() => (focus = false)}
      active={focus}
      additionalElements={[inputElement]}
    >
      <div
        class="flex min-h-0 w-full shrink"
        transition:fade={{
          duration: defaultTransitionDurationMs,
        }}
      >
        <Card
          class="!shadow-white/3 media-not-mouse:mr-17 pointer-events-auto min-h-0 min-w-full flex-1 overflow-y-auto !bg-neutral-900/50 p-0 !ring-white/5 backdrop-blur-lg"
        >
          {#each foundValuesSliced as point, i (point.name + point.guid)}
            {#if i > 0}
              <div class="w-full border-t border-neutral-100/20"></div>
            {/if}
            <a
              class="flex p-2 pl-0"
              href={getHref(point)}
              onclick={(e) => handleLinkClick(e, point)}
            >
              <div
                class={[
                  'border-1 mx-3 my-1.5 size-3 shrink-0 rounded-full border-black',
                  {
                    'bg-yellow-500': point.pointType === PointType.Delivery,
                    'bg-cyan-500': point.pointType === PointType.House,
                    'bg-emerald-400': point.pointType === PointType.Player,
                    'bg-red-400': point.pointType === PointType.Pin,
                  },
                ]}
              ></div>
              <div class="flex flex-col gap-0.5">
                <div class="text-text-dark">
                  <HighlightText
                    text={point.name}
                    highlight={searchValue}
                    caseInSensitive
                    tag="span"
                    class="inline-block bg-white/20"
                  />
                </div>
                {#if point.pointType === PointType.Delivery}
                  <div class="flex flex-col text-neutral-300">
                    {#if point.supplyText}
                      <div class="text-xs">
                        {msg['map.supply']()}: <HighlightText
                          text={point.supplyText}
                          highlight={searchValue}
                          caseInSensitive
                          tag="span"
                          class="inline-block bg-white/20"
                        />
                      </div>
                    {/if}
                    {#if point.demandText}
                      <div class="text-xs">
                        {msg['map.demand']()}: <HighlightText
                          text={point.demandText}
                          highlight={searchValue}
                          caseInSensitive
                          tag="span"
                          class="inline-block bg-white/20"
                        />
                      </div>
                    {/if}
                  </div>
                {:else if point.pointType === PointType.House}
                  <div class="text-xs text-neutral-300">
                    {msg['housing.owner']()}: <HighlightText
                      text={houseData?.[point.name]?.ownerName || msg.unknown()}
                      highlight={searchValue}
                      caseInSensitive
                      tag="span"
                      class="inline-block bg-white/20"
                    />
                  </div>
                {:else if point.pointType === PointType.Player}
                  <div class="text-xs text-neutral-300">
                    <PlayerVehicleInfo vehicleKey={playerVehicleMap.get(point.guid ?? '') ?? ''} />
                  </div>
                {/if}
                {#if point.location}
                  <div class="text-xs text-neutral-400">
                    <HighlightText
                      text={point.location}
                      highlight={searchValue}
                      caseInSensitive
                      tag="span"
                      class="inline-block bg-white/20"
                    />
                  </div>
                {/if}
              </div>
            </a>
          {/each}
          {#if searchValue && foundValues.length > maxShow}
            <div class="px-3 py-2 italic text-neutral-300">
              {msg['map.more_results']({ count: foundValues.length - maxShow })}
            </div>
          {/if}
        </Card>
      </div>
    </ClickAwayBlock>
  {/if}
</div>
