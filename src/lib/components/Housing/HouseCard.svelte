<script lang="ts">
  import type { HouseData } from '$lib/api/types';
  import type { House } from '$lib/data/house';
  import { formatDuration, intervalToDuration, isBefore } from '$lib/date';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import { SvelteDate } from 'svelte/reactivity';

  export interface HoverInfoTooltipProps {
    house: House;
    houseData: HouseData | undefined;
    highlight: string;
    loading: boolean;
  }

  const { house, houseData, highlight, loading }: HoverInfoTooltipProps = $props();

  const currentHouseData = $derived.by(() => {
    return houseData?.[house.name];
  });

  const rentLeftText = $derived.by(() => {
    if (!currentHouseData) {
      return '';
    }

    // If rent has expired
    if (isBefore(currentHouseData.rentLeft, SvelteDate.now())) {
      return siteLocale.msg['housing.expired']();
    }

    const duration = intervalToDuration({
      start: SvelteDate.now(),
      end: currentHouseData.rentLeft,
    });

    return formatDuration(duration, { format: ['days', 'hours', 'minutes'] });
  });
</script>

<Card class="relative overflow-hidden" {loading}>
  <div class="mb-2 flex w-full items-center justify-between">
    <h2
      class={['flex-1 truncate text-lg font-semibold', currentHouseData?.ownerName ? '' : 'italic']}
    >
      <HighlightText
        text={currentHouseData?.ownerName
          ? siteLocale.msg['housing.owned_house']({
              owner: currentHouseData.ownerName,
            })
          : siteLocale.msg['housing.vacant_house']()}
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
      href="/map?housing={house.name}"
      class="-mr-1.5"
      color="info"
    >
      {siteLocale.msg.view_on_map()}
    </Button>
  </div>

  <div>
    <span class="font-semibold">{siteLocale.msg['housing.id']()}:</span>
    <HighlightText
      text={house.name}
      {highlight}
      caseInSensitive
      tag="span"
      highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
    />
  </div>
  <div>
    <span class="font-semibold">{siteLocale.msg['housing.size']()}:</span>
    {house.size.x / 100} x {house.size.y / 100}
  </div>
  <div>
    <span class="font-semibold">{siteLocale.msg['housing.rent_price']()}:</span>
    {(house.cost / 10).toLocaleString(siteLocale.l)}
  </div>
  <div>
    <span class="font-semibold">{siteLocale.msg['housing.rent_left']()}:</span>
    {#if currentHouseData?.ownerName}
      {rentLeftText}
    {:else}
      <span class="text-text/70 dark:text-text-dark/70 italic"
        >{siteLocale.msg['housing.vacant']()}</span
      >
    {/if}
  </div>
  <!-- <div>
    <span class="font-semibold">{siteLocale.msg['housing.depot']()}:</span> TODO
  </div>
  <div>
    <span class="font-semibold">{siteLocale.msg['housing.depot_storage']()}:</span> TODO
  </div> -->
</Card>
