<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import Calendar from './Calendar.svelte';
  import type { ScheduledEvent } from '$lib/api/types';
  import { eachDayOfInterval, format } from 'date-fns';
  import Button from '$lib/ui/Button/Button.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';

  type CalendarGroupProps = {
    events: ScheduledEvent[];
    openEvent: (day: number, month: number, year: number) => void;
  };

  const { events, openEvent }: CalendarGroupProps = $props();

  const dateWithEvents = $derived.by(() => {
    const set = new Set<string>();
    events.forEach((event) => {
      const dateRange = eachDayOfInterval({ start: event.start_time, end: event.end_time });

      dateRange.forEach((date) => {
        set.add(format(date, 'yyyy-MM-dd'));
      });
    });
    return set;
  });

  let currentMonth = $state(new Date().getMonth() + 1);
  let currentYear = $state(new Date().getFullYear());

  const prevMonth = () => {
    if (currentMonth === 1) {
      currentYear -= 1;
      currentMonth = 12;
    } else {
      currentMonth -= 1;
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      currentYear += 1;
      currentMonth = 1;
    } else {
      currentMonth += 1;
    }
  };
</script>

<h4 class="pb-8 text-center text-4xl font-semibold tracking-tight">
  {m['championship.schedule']()}
</h4>
<div class="flex items-center gap-8">
  <Button icon round class="hidden sm:flex" onClick={prevMonth}>
    <Icon class="i-material-symbols:arrow-left-rounded" />
  </Button>
  <Calendar month={currentMonth} year={currentYear} onEventClick={openEvent} {dateWithEvents} />
  <Button icon round class="hidden sm:flex" onClick={nextMonth}>
    <Icon class="i-material-symbols:arrow-right-rounded" />
  </Button>
</div>
<div class="flex items-center gap-8 pt-8 sm:hidden">
  <Button icon round onClick={prevMonth}>
    <Icon class="i-material-symbols:arrow-left-rounded" />
  </Button>
  <Button icon round onClick={nextMonth}>
    <Icon class="i-material-symbols:arrow-right-rounded" />
  </Button>
</div>
