<script lang="ts">
  import { goto } from '$app/navigation';
  import { m } from '$lib/paraglide/messages';
  import Card from '$lib/ui/Card/Card.svelte';
  import { format } from '$lib/localeFormat/date';
  import EventButton from './EventButton.svelte';

  type CalendarProps = {
    month: number;
    year: number;
    onEventClick: (day: number, month: number, year: number) => void;
    dateWithEvents: Set<string>;
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

  const isCurrentMonth = (index: number) => {
    const offsetDay = getOffsetDayOfWeek(index);
    return offsetDay >= startOffset && offsetDay < startOffset + daysMonth;
  };

  const getDay = (index: number) => {
    const offsetDay = getOffsetDayOfWeek(index);
    if (offsetDay < startOffset) return daysInLastMonth + offsetDay + 1 - startOffset;
    else if (offsetDay < startOffset + daysMonth) return offsetDay + 1 - startOffset;
    else return offsetDay + 1 - startOffset - daysMonth;
  };

  const openEvent = (index: number) => {
    const openedEventDay = getOffsetDayOfWeek(index) + 1 - startOffset;
    goto(
      `?date=${year}-${String(month).padStart(2, '0')}-${String(openedEventDay).padStart(2, '0')}`,
      { replaceState: true, noScroll: true },
    );
    onEventClick(openedEventDay, month, year);
  };

  type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const days = $derived.by(() => {
    return Array.from({ length: 7 }, (_, day) => m[`config.days.short.${day as Day}`]());
  });
</script>

<Card>
  <h4 class="-m-4 mb-4 bg-neutral-500/10 p-4 text-xl font-medium">
    {format(new Date(year, month - 1, 1), m['config.omitDayFormat']())}
  </h4>
  <div class="grid grid-cols-7 place-items-center pb-4 sm:gap-2">
    {#each Array(7) as _, i (i)}
      <span class="text-xs font-semibold">
        {days[(i + firstDayOfWeek) % 7]}
      </span>
    {/each}
  </div>
  <div class="grid grid-cols-7 grid-rows-6 sm:gap-2">
    {#each Array(6 * 7) as _, i (i)}
      <EventButton
        currentMonth={isCurrentMonth(i)}
        {month}
        day={getDay(i)}
        {year}
        onClick={() => openEvent(i)}
        {dateWithEvents}
      />
    {/each}
  </div>
</Card>
