<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { mappedEvents } from '$lib/data/event';
  import { m } from '$lib/paraglide/messages';
  import { onMount } from 'svelte';
  import Calendar from './Calendar.svelte';
  import EventModal from './EventModal.svelte';

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
    const [year, month, day] = page.url.searchParams.get('date')?.split('-') ?? [];
    if (
      year &&
      month &&
      day &&
      (mappedEvents.get(+year)?.get(+month)?.get(+day) ?? []).length > 0
    ) {
      openedEventYear = +year;
      openedEventMonth = +month;
      openedEventDay = +day;
    } else {
      closeEvent();
    }
  });
</script>

<h4 class="pt-18 pb-8 text-4xl font-semibold tracking-tight">{m['championship.schedule']()}</h4>
<Calendar month={7} year={2025} onEventClick={openEvent} />
<EventModal
  month={openedEventMonth}
  year={openedEventYear}
  day={openedEventDay}
  onClose={closeEvent}
/>
