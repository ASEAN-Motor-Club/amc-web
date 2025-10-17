<script lang="ts">
  import { goto } from '$app/navigation';
  import { getEvents } from '$lib/api/championship';
  import type { ScheduledEvent } from '$lib/api/types';
  import EventModal from '$lib/components/Championship/EventModal.svelte';
  import ResultsModal from '$lib/components/Championship/ResultsModal.svelte';
  import { setChampionshipContext } from '$lib/components/Championship/context';
  import { onMount } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { isValid } from '$lib/date';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';

  let events = $state<ScheduledEvent[]>([]);
  let abortController: AbortController = new AbortController();

  const openEvent = (day: number, month: number, year: number) => {
    const newUrl = `?date=${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    goto(newUrl, { noScroll: true });
  };

  const closeEvent = () => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.delete('date');
    goto(`?${newParams.toString()}`, { replaceState: true, noScroll: true });
  };

  const openResultsModal = (event: ScheduledEvent) => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.append('event', event.id.toString());
    goto(`?${newParams.toString()}`, { noScroll: true });
  };

  const closeResultsModal = () => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.delete('event');
    goto(`?${newParams.toString()}`, { replaceState: true, noScroll: true });
  };

  onMount(async () => {
    events = await getEvents(abortController.signal);
  });

  const { children } = $props();

  setChampionshipContext({
    get events() {
      return events;
    },
    openEvent,
  });

  const openedEventDate = $derived.by(() => {
    const dateParam = clientSearchParamsGet('date');
    if (dateParam) {
      const d = new Date(dateParam);
      if (isValid(d)) {
        return d;
      }
    }
    return undefined;
  });

  const resultsModalEvent = $derived.by(() => {
    const eventId = clientSearchParamsGet('event');
    if (eventId) {
      return events.find((e) => e.id === +eventId);
    }
  });
</script>

{@render children()}

<EventModal date={openedEventDate} {events} onClose={closeEvent} {openResultsModal} />
<ResultsModal event={resultsModalEvent} onClose={closeResultsModal} {openEvent} />
