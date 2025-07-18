<script lang="ts">
  import { getLocale } from '$lib/paraglide/runtime';
  import Card from '$lib/ui/Card/Card.svelte';
  import EventButton from './EventButton.svelte';
  import EventModal from './EventModal.svelte';

  type CalendarProps = {
    month: number;
    year: number;
  };

  const { month, year }: CalendarProps = $props();

  const startOffset = $derived(new Date(year, month - 1, 1).getDay());
  const daysInLastMonth = $derived(new Date(year, month - 1, 0).getDate());
  const daysMonth = $derived(new Date(year, month, 0).getDate());

  const firstDayOfWeek = $derived.by(() => {
    const locale = new Intl.Locale(getLocale());
    // NOTE: getWeekInfo is not available in firefox for now
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (locale as any).getWeekInfo?.().firstDay ?? 7;
  });

  const monthName = $derived(
    new Date(year, month - 1).toLocaleString(getLocale(), { month: 'long' }),
  );

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

  let openedEventDay: number | undefined = $state(undefined);

  const openEvent = (index: number) => {
    openedEventDay = getOffsetDayOfWeek(index) + 1 - startOffset;
  };

  const days = $derived.by(() => {
    const { format } = new Intl.DateTimeFormat(getLocale(), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, day) => format(new Date(Date.UTC(2025, 8, day + 1))));
  });
</script>

<Card>
  <h4 class="-m-4 mb-4 bg-neutral-500/10 p-4 text-xl font-medium">{monthName} {year}</h4>
  <div class="grid grid-cols-7 place-items-center gap-2 pb-4">
    {#each Array(7) as _, i (i)}
      <span class="text-xs font-semibold">
        {days[(i + (firstDayOfWeek - 1)) % 7]}
      </span>
    {/each}
  </div>
  <div class="grid grid-cols-7 grid-rows-6 gap-2">
    {#each Array(6 * 7) as _, i (i)}
      <EventButton
        currentMonth={isCurrentMonth(i)}
        {month}
        day={getDay(i)}
        {year}
        onClick={() => openEvent(i)}
      />
    {/each}
  </div>
</Card>

<EventModal {month} {year} day={openedEventDay} onClose={() => (openedEventDay = undefined)} />
