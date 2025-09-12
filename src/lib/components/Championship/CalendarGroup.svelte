<script lang="ts">
  import Calendar from './Calendar.svelte';
  import { addMilliseconds, eachDayOfInterval, format } from '$lib/date';
  import Button from '$lib/ui/Button/Button.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { EventType } from './types';
  import { SvelteMap } from 'svelte/reactivity';
  import { getChampionshipContext } from './context';

  const championshipContext = getChampionshipContext();

  const dateWithEvents = $derived.by(() => {
    const map = new SvelteMap<string, EventType>();
    for (const event of championshipContext.events) {
      const endTimeExclusive = addMilliseconds(event.end_time, -1);
      const dateRange = eachDayOfInterval({ start: event.start_time, end: endTimeExclusive });
      for (const date of dateRange) {
        const dateFormatted = format(date, 'yyyy-MM-dd');
        if (!event.time_trial) {
          map.set(format(date, 'yyyy-MM-dd'), EventType.Single);
          continue;
        }
        if (map.has(dateFormatted)) {
          continue;
        }
        map.set(format(date, 'yyyy-MM-dd'), EventType.MultiDay);
      }
    }
    return map;
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

<div class="flex items-center gap-8">
  <Button icon round class="hidden sm:flex" onClick={prevMonth}>
    <Icon class="i-material-symbols:arrow-left-rounded" />
  </Button>
  <Calendar
    month={currentMonth}
    year={currentYear}
    onEventClick={championshipContext.openEvent}
    {dateWithEvents}
  />
  <Button icon round class="hidden sm:flex" onClick={nextMonth}>
    <Icon class="i-material-symbols:arrow-right-rounded" />
  </Button>
</div>
<div class="flex items-center justify-center gap-8 pt-8 sm:hidden">
  <Button icon round onClick={prevMonth}>
    <Icon class="i-material-symbols:arrow-left-rounded" />
  </Button>
  <Button icon round onClick={nextMonth}>
    <Icon class="i-material-symbols:arrow-right-rounded" />
  </Button>
</div>
