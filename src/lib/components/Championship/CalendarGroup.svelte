<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import Calendar from './Calendar.svelte';
  import type { ScheduledEvent } from '$lib/api/types';
  import { SvelteSet } from 'svelte/reactivity';

  type CalendarGroupProps = {
    events: ScheduledEvent[];
    openEvent: (day: number, month: number, year: number) => void;
  };

  const { events, openEvent }: CalendarGroupProps = $props();

  const dateWithEvents = $derived.by(() => {
    const set = new SvelteSet<string>();
    events.forEach((event) => {
      set.add(new Date(event.start_time).toISOString().split('T')[0]);
      set.add(new Date(event.end_time).toISOString().split('T')[0]);
    });
    return set;
  });
</script>

<h4 class="pb-8 text-center text-4xl font-semibold tracking-tight">
  {m['championship.schedule']()}
</h4>
<div class="flex gap-8">
  <Calendar month={7} year={2025} onEventClick={openEvent} {dateWithEvents} />
</div>

