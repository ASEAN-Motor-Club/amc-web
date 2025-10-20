<script lang="ts">
  import type { HouseData } from '$lib/api/types';
  import type { House } from '$lib/data/house';
  import { formatDuration, getDateFnsLocale, intervalToDuration, isBefore } from '$lib/date';
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import { isSm } from '$lib/utils/media.svelte';
  import { getLocale } from '$lib/paraglide/runtime';
  import { createSvelteDate } from '$lib/svelteDate.svelte';

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

  const svelteDate = createSvelteDate();

  const rentLeftText = $derived.by(() => {
    if (!currentHouseData) {
      return '';
    }

    const time = svelteDate.getTime();

    // If rent has expired
    if (isBefore(currentHouseData.rentLeft, time)) {
      return msg['housing.expired']();
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
</script>

<Card class="relative overflow-hidden" {loading}>
  <div class="mb-2 flex w-full items-center justify-between">
    <h2
      class={['flex-1 truncate text-lg font-semibold', currentHouseData?.ownerName ? '' : 'italic']}
    >
      <HighlightText
        text={currentHouseData?.ownerName
          ? msg['housing.owned_house']({
              owner: currentHouseData.ownerName,
            })
          : msg['housing.vacant_house']()}
        {highlight}
        caseInSensitive
        tag="span"
        highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
      />
    </h2>
    <Button
      tag="a"
      size="xs"
      variant="text"
      href={isSm.current ? `/map?menu=housing&house=${house.name}` : `/map?house=${house.name}`}
      class="-mr-1.5"
      color="info"
    >
      {msg.view_on_map()}
    </Button>
  </div>

  <div>
    <span class="font-semibold">{msg['housing.id']()}:</span>
    <HighlightText
      text={house.name}
      {highlight}
      caseInSensitive
      tag="span"
      highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
    />
  </div>
  <div>
    <span class="font-semibold">{msg['housing.size']()}:</span>
    {house.size.x / 100} x {house.size.y / 100}
  </div>
  <div>
    <span class="font-semibold">{msg['housing.rent_price']()}:</span>
    {(house.cost / 10).toLocaleString(locale)}
  </div>
  <div>
    <span class="font-semibold">{msg['housing.rent_left']()}:</span>
    {#if currentHouseData?.ownerName}
      {rentLeftText}
    {:else}
      <span class="text-text/70 dark:text-text-dark/70 italic">{msg['housing.vacant']()}</span>
    {/if}
  </div>
  <!-- <div>
    <span class="font-semibold">{msg['housing.depot']()}:</span> TODO
  </div>
  <div>
    <span class="font-semibold">{msg['housing.depot_storage']()}:</span> TODO
  </div> -->
</Card>
