<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages';
  import Calendar from './Calendar.svelte';
  import EventModal from './EventModal.svelte';
  import type { ScheduledEvent } from '$lib/api/types';
  import { SvelteSet } from 'svelte/reactivity';
  import { onMount } from 'svelte';

  type CalendarGroupProps = {
    events: ScheduledEvent[];
  };

  const { events }: CalendarGroupProps = $props();

  const dateWithEvents = $derived.by(() => {
    const set = new SvelteSet<string>();
    events.forEach((event) => {
      set.add(new Date(event.start_time).toISOString().split('T')[0]);
      set.add(new Date(event.end_time).toISOString().split('T')[0]);
    });
    return set;
  });

  let openedEventDay: number | undefined = $state(undefined);
  let openedEventMonth: number | undefined = $state(undefined);
  let openedEventYear: number | undefined = $state(undefined);

  const openEvent = (day: number, month: number, year: number) => {
    openedEventDay = day;
    openedEventMonth = month;
    openedEventYear = year;
  };

  const closeEvent = () => {
    openedEventDay = undefined;
    openedEventMonth = undefined;
    openedEventYear = undefined;
    goto(`?`, { replaceState: true, noScroll: true });
  };

  onMount(() => {
    const date = page.url.searchParams.get('date');
    if (date) {
      const [year, month, day] = date.split('-');
      openedEventYear = +year;
      openedEventMonth = +month;
      openedEventDay = +day;
    }
  });
</script>

<h4 class="pb-8 text-center text-4xl font-semibold tracking-tight">
  {m['championship.schedule']()}
</h4>
<div class="flex gap-8">
  <Calendar month={7} year={2025} onEventClick={openEvent} {dateWithEvents} />
</div>
<EventModal
  month={openedEventMonth}
  year={openedEventYear}
  day={openedEventDay}
  {events}
  onClose={closeEvent}
/>
