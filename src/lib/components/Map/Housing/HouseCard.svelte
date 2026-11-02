<script lang="ts">
  import type { DepotData, HouseData } from '#lib/api/types.ts';
  import { depotStorageLeftPercent, isDepotSevere } from '#lib/api/depot.ts';
  import type { House } from '#lib/data/house.ts';
  import { formatDuration, getDateFnsLocale, intervalToDuration, isBefore } from '#lib/date.ts';
  import { m } from '#messages';
  import Button from '#lib/ui/Button/Button.svelte';
  import Card from '#lib/ui/Card/Card.svelte';
  import HighlightText from '#lib/ui/HighlightText/HighlightText.svelte';
  import { getLocale } from '#lib/paraglide/runtime.js';
  import { rtDate } from '#lib/realtimeDate.svelte.ts';
  import { Features, getViewHref } from '../utils.ts';
  import ProgressBar from '#lib/ui/ProgressBar/ProgressBar.svelte';
  import TruncateText from '#lib/ui/TruncateText/TruncateText.svelte';

  export interface Props {
    house: House;
    houseData: HouseData | undefined;
    depotData: DepotData | undefined;
    highlight: string;
    loading: boolean;
  }

  const { house, houseData, depotData, highlight, loading }: Props = $props();

  const depots = $derived(depotData?.[house.name] ?? []);

  const currentHouseData = $derived.by(() => {
    return houseData?.[house.name];
  });

  const rentLeftText = $derived.by(() => {
    if (!currentHouseData) {
      return '';
    }

    const time = rtDate.d.getTime();

    // If rent has expired
    if (isBefore(currentHouseData.rentLeft, time)) {
      return m['housing.expired']();
    }

    const duration = intervalToDuration({
      start: time,
      end: currentHouseData.rentLeft,
    });

    return (
      formatDuration(duration, { format: ['days', 'hours', 'minutes'] }) ||
      getDateFnsLocale().formatDistance('lessThanXMinutes', 1)
    );
  });

  const locale = $derived.by(getLocale);

  const houseTitle = $derived(
    currentHouseData?.ownerName
      ? m['housing.owned_house']({
          owner: currentHouseData.ownerName,
        })
      : m['housing.vacant_house'](),
  );
</script>

<Card class="relative overflow-hidden" {loading}>
  <div class="flex w-full items-center justify-between">
    <TruncateText
      tag="h2"
      text={houseTitle}
      class={['flex-1 font-semibold', currentHouseData?.ownerName ? '' : 'italic']}
    >
      <HighlightText
        text={houseTitle}
        {highlight}
        caseInSensitive
        tag="span"
        highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
      />
    </TruncateText>
    <Button
      tag="a"
      size="xs"
      variant="text"
      href={getViewHref(Features.House, house.name)}
      class="-mr-1.5"
      color="primary"
    >
      {m.view_on_map()}
    </Button>
  </div>

  <div class="my-2 flex justify-between gap-1 text-sm text-text-700 dark:text-text-300">
    <div class="truncate">
      <div class="text-xs font-semibold text-text-500">{m['housing.id']()}</div>
      <HighlightText
        text={house.name}
        {highlight}
        caseInSensitive
        tag="div"
        highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25 "
      />
    </div>
    <div class="text-right">
      <div class="text-xs font-semibold text-text-500">{m['housing.size']()}</div>
      <div>
        {house.size.x / 100} x {house.size.y / 100}
      </div>
    </div>
  </div>
  <div class="flex justify-between gap-1 text-sm text-text-700 dark:text-text-300">
    <div>
      <div class="text-xs font-bold text-text-500">{m['housing.rent_price']()}</div>
      <div>
        {(house.cost / 10).toLocaleString(locale)}
      </div>
    </div>
    <div class="text-right">
      <div class="text-xs font-bold text-text-500">{m['housing.rent_left']()}</div>
      <div>
        {#if currentHouseData?.ownerName}
          {rentLeftText}
        {:else}
          <span class="text-text-600 italic dark:text-text-400">{m['housing.vacant']()}</span>
        {/if}
      </div>
    </div>
  </div>

  {#if depots.length}
    {#each depots as depot (depot.guid)}
      <div class="mt-2 text-sm text-text-700 dark:text-text-300">
        <div class="truncate text-xs font-bold text-text-500">
          {m['housing.depot']()}:
          <span class="font-normal text-text-700 dark:text-text-300">{depot.name}</span>
        </div>
        <ProgressBar
          class="mt-1"
          value={depot.storage}
          danger={isDepotSevere(depot)}
          ariaLabel={`${m['housing.depot_storage_left']()}: ${depot.name}`}
          label={m['housing.percent']({
            value: depotStorageLeftPercent(depot).toLocaleString(locale),
          })}
        />
      </div>
    {/each}
  {:else}
    <div class="mt-2 text-sm text-text-700 dark:text-text-300">
      <div class="truncate text-xs font-bold text-text-500">
        {m['housing.depot']()}:
        <span class="font-normal text-text-500 dark:text-text-400">{m['housing.no_depot']()}</span>
      </div>
      <div class="mt-1 h-5"></div>
    </div>
  {/if}
</Card>
