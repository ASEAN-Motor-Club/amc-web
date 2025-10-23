<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import TextInput from '$lib/ui/TextInput/TextInput.svelte';
  import type { FormEventHandler } from 'svelte/elements';
  import { deliveryPoints as unmappedDeliveryPoints } from '$lib/data/deliveryPoint';
  import { houses as unmappedHouse } from '$lib/data/house';
  import { PointType, type PlayerData } from './types';
  import { cargoName } from '$lib/data/cargo';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import { goto } from '$app/navigation';
  import type { Vector2 } from '$lib/types';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { fade } from 'svelte/transition';
  import type { HouseData } from '$lib/api/types';
  import { m as msg } from '$lib/paraglide/messages';
  import ClickAwayBlock from '$lib/ui/ClickAwayBlock/ClickAwayBlock.svelte';
  import PlayerVehicleInfo from './PlayerVehicleInfo.svelte';
  import type { Pins } from '$lib/schema/pin';
  import { getLocationAtPoint } from '$lib/data/area';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { getSelectionClearedParams } from '../utils';

  export type SearchPoint = {
    guid?: string;
    name: string;
    coord: Vector2;
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

  export interface SearchProps {
    playerData: PlayerData[];
    onPointClick?: (point: SearchPoint) => void;
    houseData: HouseData | undefined;
    pinsData: Pins;
  }

  const { playerData, onPointClick, houseData, pinsData: pinsDataProps }: SearchProps = $props();

  const deliveryPoints = $derived(
    unmappedDeliveryPoints
      .filter((point) => point.type !== 'Resident_C')
      .map((point) => ({
        ...point,
        pointType: PointType.Delivery,
        supplyText: point.allSupply.map((i) => getMtLocale(cargoName[i])).join(', '),
        demandText: point.allDemand.map((i) => getMtLocale(cargoName[i])).join(', '),
      })),
  );

  const house = $derived(
    unmappedHouse.map((point) => ({
      ...point,
      name: houseData?.[point.name]?.ownerName ?? '',
      guid: point.name,
      pointType: PointType.House,
    })),
  );

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
    if (!searchValue) return [...pinsData];
    const search = searchValue.trim().toLowerCase();

    const pins = pinsData.filter((pin) => pin.label.toLowerCase().includes(search));

    const player = playerData.filter((player) => player.name.toLowerCase().includes(search));

    const delivery = deliveryPoints
      .filter(
        (point) =>
          getMtLocale(point.name).toLowerCase().includes(search) ||
          point.supplyText.toLowerCase().includes(search) ||
          point.demandText.toLowerCase().includes(search),
      )
      .map((point) => ({
        ...point,
        name: getMtLocale(point.name),
      }));

    const housePoints = house.filter(
      (point) =>
        (point.name || msg['housing.vacant']()).toLowerCase().includes(search) ||
        point.guid.toLowerCase().includes(search),
    );

    return [...pins, ...player, ...housePoints, ...delivery];
  });

  const getHref = (point: SearchPoint) => {
    const newParams = getSelectionClearedParams();
    switch (point.pointType) {
      case PointType.Delivery:
        newParams.set('delivery', point.guid ?? '');
        break;
      case PointType.House:
        newParams.set('house', point.guid ?? '');
        break;
      case PointType.Player:
        newParams.set('player', point.guid ?? '');
        break;
    }
    return `/map?${newParams.toString()}`;
  };

  const handleLinkClick = (event: Event, point: SearchPoint) => {
    focus = false;
    event.preventDefault();
    if (point.pointType !== PointType.Pin) {
      goto(getHref(point), { noScroll: true, keepFocus: true });
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
      class="text-text-dark pointer-events-auto w-full !border-none !bg-neutral-900/50 !shadow-white/3 !ring-white/5 backdrop-blur-sm hover:!bg-neutral-900/40 focus:!bg-neutral-900/60"
      onInput={handleInput}
      additionalAttributes={{
        onclick: () => (focus = true),
      }}
      onClear={() => (searchValue = '')}
      clearBtnClass="pointer-events-auto"
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
          class="media-not-mouse:mr-17 pointer-events-auto min-h-0 min-w-full flex-1 overflow-y-auto !bg-neutral-900/50 p-0 !shadow-white/3 !ring-white/5 backdrop-blur-sm"
        >
          {#each foundValuesSliced as point, i (`${point.name}${point.guid}`)}
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
                  'mx-3 my-1.5 size-3 shrink-0 rounded-full border-1 border-black',
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
                    text={point.pointType === PointType.House
                      ? point.name
                        ? msg['housing.owned_house']({
                            owner: point.name,
                          })
                        : msg['housing.vacant_house']()
                      : point.name}
                    highlight={searchValue}
                    caseInSensitive
                    tag="span"
                    highlightClass="inline-block bg-white/20"
                  />
                </div>
                {#if point.pointType === PointType.Delivery}
                  <div class="flex flex-col text-neutral-300">
                    {#if point.supplyText}
                      <div class="text-xs">
                        {msg['delivery.supply']()}: <HighlightText
                          text={point.supplyText}
                          highlight={searchValue}
                          caseInSensitive
                          tag="span"
                          highlightClass="inline-block bg-white/20"
                        />
                      </div>
                    {/if}
                    {#if point.demandText}
                      <div class="text-xs">
                        {msg['delivery.demand']()}: <HighlightText
                          text={point.demandText}
                          highlight={searchValue}
                          caseInSensitive
                          tag="span"
                          highlightClass="inline-block bg-white/20"
                        />
                      </div>
                    {/if}
                  </div>
                {:else if point.pointType === PointType.House}
                  <div class="text-xs text-neutral-300">
                    {msg['housing.id']()}: <HighlightText
                      text={point.guid || msg.unknown()}
                      highlight={searchValue}
                      caseInSensitive
                      tag="span"
                      highlightClass="inline-block bg-white/20"
                    />
                  </div>
                {:else if point.pointType === PointType.Player}
                  <div class="text-xs text-neutral-300">
                    <PlayerVehicleInfo vehicleKey={playerVehicleMap.get(point.guid ?? '') ?? ''} />
                  </div>
                {/if}
                <div class="text-xs text-neutral-400">
                  {getLocationAtPoint(point.coord)}
                </div>
              </div>
            </a>
          {/each}
          {#if searchValue && foundValues.length > maxShow}
            <div class="px-3 py-2 text-neutral-300 italic">
              {msg['map.more_results']({
                count: foundValues.length - maxShow,
              })}
            </div>
          {/if}
        </Card>
      </div>
    </ClickAwayBlock>
  {:else if focus}
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
          class="media-not-mouse:mr-17 pointer-events-auto min-h-0 min-w-full flex-1 overflow-y-auto !bg-neutral-900/50 p-0 !shadow-white/3 !ring-white/5 backdrop-blur-sm"
        >
          <div class="px-3 py-2 text-neutral-300 italic">
            {searchValue ? msg['map.no_results']() : msg['map.start_search']()}
          </div>
        </Card>
      </div>
    </ClickAwayBlock>
  {/if}
</div>
