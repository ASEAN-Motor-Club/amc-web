<script lang="ts">
  import Button from '$lib/ui/Button/Button.svelte';
  import { SvelteDate } from 'svelte/reactivity';

  type EventButtonProps = {
    currentMonth: boolean;
    year: number;
    month: number;
    day: number;
    onClick: () => void;
    dateWithEvents: Set<string>;
  };

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    onClick();
  };

  const { currentMonth, year, month, day, onClick, dateWithEvents }: EventButtonProps = $props();

  const haveEvent = $derived(
    dateWithEvents.has(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`),
  );

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
  onClick={handleClick}
  tag="a"
  href={`?date=${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
>
  {day}
</Button>
