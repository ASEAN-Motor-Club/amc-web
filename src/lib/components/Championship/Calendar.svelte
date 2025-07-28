<script lang="ts">
  import { goto } from '$app/navigation';
  import { m } from '$lib/paraglide/messages';
  import Card from '$lib/ui/Card/Card.svelte';
  import { format } from '$lib/localeFormat/date';
  import EventButton from './EventButton.svelte';
  import type { Day } from 'date-fns';
  import type { EventType } from './types';
  import type { SvelteMap } from 'svelte/reactivity';

  type CalendarProps = {
    month: number;
    year: number;
    onEventClick: (day: number, month: number, year: number) => void;
    dateWithEvents: SvelteMap<string, EventType>;
  };

  const { month, year, onEventClick, dateWithEvents }: CalendarProps = $props();

  const startOffset = $derived(new Date(year, month - 1, 1).getDay());
  const daysInLastMonth = $derived(new Date(year, month - 1, 0).getDate());
  const daysMonth = $derived(new Date(year, month, 0).getDate());

  const firstDayOfWeek = $derived.by(() => {
    return +m['config.firstDayOfWeek']();
  });

  const offsetWeek = $derived(firstDayOfWeek > startOffset);

  const getOffsetDayOfWeek = (day: number) => {
    return day + firstDayOfWeek - (offsetWeek ? 7 : 0);
  };

  const getDay = (index: number) => {
    const offsetDay = getOffsetDayOfWeek(index);
    if (offsetDay < startOffset) return daysInLastMonth + offsetDay + 1 - startOffset;
    else if (offsetDay < startOffset + daysMonth) return offsetDay + 1 - startOffset;
    else return offsetDay + 1 - startOffset - daysMonth;
  };

  const getMonth = (index: number) => {
    const offsetDay = getOffsetDayOfWeek(index);
    if (offsetDay < startOffset) return month === 1 ? 12 : month - 1;
    else if (offsetDay < startOffset + daysMonth) return month;
    else return month === 12 ? 1 : month + 1;
  };

  const getYear = (index: number) => {
    const offsetDay = getOffsetDayOfWeek(index);
    if (offsetDay < startOffset && month === 1) return year - 1;
    else if (offsetDay >= startOffset + daysMonth && month === 12) return year + 1;
    else return year;
  };

  const openEvent = (index: number) => {
    const eventDay = getDay(index);
    const eventMonth = getMonth(index);
    const eventYear = getYear(index);
    goto(
      `?date=${eventYear}-${String(eventMonth).padStart(2, '0')}-${String(eventDay).padStart(2, '0')}`,
      { replaceState: true, noScroll: true },
    );
    onEventClick(eventDay, eventMonth, eventYear);
  };

  const days = $derived.by(() => {
    return Array.from({ length: 7 }, (_, day) => m[`config.days.short.${day as Day}`]());
  });
</script>

<Card>
  <h4 class="-m-4 mb-4 bg-neutral-500/10 p-4 text-xl font-medium">
    {format(new Date(year, month - 1, 1), m['config.calendarFormat']())}
  </h4>
  <div class="-mx-3 grid grid-cols-7 place-items-center gap-1 pb-2 sm:m-0 sm:gap-2 sm:pb-4">
    {#each Array(7) as _, i (i)}
      <span class="text-xs font-semibold">
        {days[(i + firstDayOfWeek) % 7]}
      </span>
    {/each}
  </div>
  <div class="-m-3 mt-0 grid grid-cols-7 grid-rows-6 place-items-center gap-1 sm:m-0 sm:gap-2">
    {#each Array(6 * 7) as _, i (i)}
      <EventButton
        currentMonth={month}
        month={getMonth(i)}
        day={getDay(i)}
        year={getYear(i)}
        onClick={() => openEvent(i)}
        {dateWithEvents}
      />
    {/each}
  </div>
</Card>
