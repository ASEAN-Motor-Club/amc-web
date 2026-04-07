<script lang="ts">
  import type { HouseData } from '$lib/api/types';
  import type { House } from '$lib/data/house';
  import { formatDuration, getDateFnsLocale, intervalToDuration, isBefore } from '$lib/date';
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import { getLocale } from '$lib/paraglide/runtime';
  import { rtDate } from '$lib/realtimeDate.svelte';
  import { Features, getViewHref } from '../utils';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';

  export interface Props {
    house: House;
    houseData: HouseData | undefined;
    highlight: string;
    loading: boolean;
  }

  const { house, houseData, highlight, loading }: Props = $props();

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

  <div class="text-text-700 dark:text-text-300 my-2 flex justify-between gap-1 text-sm">
    <div class="truncate">
      <div class="text-text-500 text-xs font-semibold">{m['housing.id']()}</div>
      <HighlightText
        text={house.name}
        {highlight}
        caseInSensitive
        tag="div"
        highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25 "
      />
    </div>
    <div class="text-right">
      <div class="text-text-500 text-xs font-semibold">{m['housing.size']()}</div>
      <div>
        {house.size.x / 100} x {house.size.y / 100}
      </div>
    </div>
  </div>
  <div class="text-text-700 dark:text-text-300 flex justify-between gap-1 text-sm">
    <div>
      <div class="text-text-500 text-xs font-bold">{m['housing.rent_price']()}</div>
      <div>
        {(house.cost / 10).toLocaleString(locale)}
      </div>
    </div>
    <div class="text-right">
      <div class="text-text-500 text-xs font-bold">{m['housing.rent_left']()}</div>
      <div>
        {#if currentHouseData?.ownerName}
          {rentLeftText}
        {:else}
          <span class="text-text-600 dark:text-text-400 italic">{m['housing.vacant']()}</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- <div>
    <span class="font-semibold">{m['housing.depot']()}:</span> TODO
  </div>
  <div>
    <span class="font-semibold">{m['housing.depot_storage']()}:</span> TODO
  </div> -->
</Card>
