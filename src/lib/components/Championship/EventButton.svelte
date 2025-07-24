<script lang="ts">
  import { mappedEvents } from '$lib/data/event';
  import Button from '$lib/ui/Button/Button.svelte';
  import { SvelteDate } from 'svelte/reactivity';

  type EventButtonProps = {
    currentMonth: boolean;
    year: number;
    month: number;
    day: number;
    onClick: () => void;
  };

  const { currentMonth, year, month, day, onClick }: EventButtonProps = $props();

  const haveEvent = $derived((mappedEvents.get(year)?.get(month)?.get(day)?.length ?? 0) > 0);

  const date = new SvelteDate();

  const today = $derived.by(() => {
    return date.getDate() === day && date.getMonth() + 1 === month && date.getFullYear() === year;
  });
</script>

<Button
  icon
  round
  variant={haveEvent ? 'contained' : 'text'}
  color={haveEvent ? (today ? 'success' : 'info') : 'neutral'}
  disabled={!haveEvent || !currentMonth}
  class={{
    'opacity-100': currentMonth,
    'ring-success-700 ring': today,
  }}
  {onClick}
>
  {day}
</Button>
