<script lang="ts">
  import type { HouseData } from '$lib/api/types';
  import type { House } from '$lib/data/house';
  import { m } from '$lib/paraglide/messages';
  import Card from '$lib/ui/Card/Card.svelte';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import { SvelteDate } from 'svelte/reactivity';

  export type HoverInfoTooltipProps = {
    house: House;
    houseData: HouseData | undefined;
    highlight: string;
    loading: boolean;
  };

  const { house, houseData, highlight, loading }: HoverInfoTooltipProps = $props();

  const currentHouseData = $derived.by(() => {
    return houseData?.[house.name];
  });

  const rentLeftText = $derived.by(() => {
    if (!currentHouseData) {
      return '';
    }

    let rentLeft = currentHouseData.rentLeft.getTime() - SvelteDate.now();

    // If rent has expired
    if (rentLeft <= 0) {
      return m['housing.expired']();
    }

    // Convert milliseconds to different units
    const minutes = Math.floor((rentLeft / (1000 * 60)) % 60);
    const hours = Math.floor((rentLeft / (1000 * 60 * 60)) % 24);
    const days = Math.floor(rentLeft / (1000 * 60 * 60 * 24));

    let parts = [];
    if (days > 0) {
      parts.push(`${days} ${days === 1 ? m['housing.day']() : m['housing.days']()}`);
    }
    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? m['housing.hour']() : m['housing.hours']()}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} ${minutes === 1 ? m['housing.minute']() : m['housing.minutes']()}`);
    }
    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return m['housing.less_than_minute']();
    }
  });
</script>

<Card class='relative overflow-hidden' loading={loading}>
  <div class="mb-2 flex w-full flex-col justify-between sm:flex-row sm:items-baseline">
    <h2 class="text-lg font-semibold">
      <HighlightText
        text={house.name}
        {highlight}
        caseInSensitive
        tag="span"
        class="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
      />
    </h2>
    <a
      class="text-text/80 dark:text-text-dark/80 text-xs underline"
      href="/map?housing={house.name}">{m.view_on_map()}</a
    >
  </div>

  <div>
    <span class="font-semibold">{m['housing.size']()}:</span>
    {house.size.x / 100} x {house.size.y / 100}
  </div>
  <div>
    <span class="font-semibold">{m['housing.rent_price']()}:</span>
    {house.cost / 10}
  </div>
  <div>
    <span class="font-semibold">{m['housing.owner']()}:</span>
    {#if currentHouseData?.ownerName}
      <HighlightText
        text={currentHouseData.ownerName}
        {highlight}
        caseInSensitive
        tag="span"
        class="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
      />
    {:else}
      <span class="font-bold italic">{m['housing.vacant']()}</span>
    {/if}
  </div>
  <div>
    <span class="font-semibold">{m['housing.rent_left']()}:</span>
    {#if currentHouseData?.ownerName}
      {rentLeftText}
    {:else}
      <span class="text-text/70 dark:text-text-dark/70 italic">{m['housing.vacant']()}</span>
    {/if}
  </div>
  <div>
    <span class="font-semibold">{m['housing.depot']()}:</span> TODO
  </div>
  <div>
    <span class="font-semibold">{m['housing.depot_storage']()}:</span> TODO
  </div>
</Card>
