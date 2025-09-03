<script lang="ts">
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getEvents } from '$lib/api/championship';
  import type { ScheduledEvent } from '$lib/api/types';
  import EventModal from '$lib/components/Championship/EventModal.svelte';
  import ResultsModal from '$lib/components/Championship/ResultsModal.svelte';
  import { setChampionshipContext } from '$lib/components/Championship/context';
  import { onMount } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  let events = $state<ScheduledEvent[]>([]);
  let abortController: AbortController = new AbortController();

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
    const newParams = new SvelteURLSearchParams(page.url.searchParams);
    newParams.delete('date');
    replaceState(`?${newParams.toString()}`, page.state);
  };

  let resultsModalEvent = $state<ScheduledEvent | undefined>(undefined);

  const openResultsModal = (event: ScheduledEvent) => {
    resultsModalEvent = event;
  };

  const closeResultsModal = () => {
    resultsModalEvent = undefined;
    const newParams = new SvelteURLSearchParams(page.url.searchParams);
    newParams.delete('event');
    replaceState(`?${newParams.toString()}`, page.state);
  };

  onMount(async () => {
    events = await getEvents(abortController.signal);
    const date = page.url.searchParams.get('date');
    if (date) {
      const [year, month, day] = date.split('-');
      openedEventYear = +year;
      openedEventMonth = +month;
      openedEventDay = +day;
    }
    const eventId = page.url.searchParams.get('event');
    if (eventId) {
      const event = events.find((e) => e.id === +eventId);
      if (event) {
        resultsModalEvent = event;
      }
    }
  });

  const { children } = $props();

  setChampionshipContext({
    get events() {
      return events;
    },
    openEvent,
  });
</script>

{@render children()}

<EventModal
  month={openedEventMonth}
  year={openedEventYear}
  day={openedEventDay}
  {events}
  onClose={closeEvent}
  {openResultsModal}
/>
<ResultsModal event={resultsModalEvent} onClose={closeResultsModal} />
