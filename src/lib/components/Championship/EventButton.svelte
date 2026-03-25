<script lang="ts">
  import Button from '$lib/ui/Button/Button.svelte';
  import type { SvelteMap } from 'svelte/reactivity';
  import { EventType } from './types';
  import { rtDate } from '$lib/realtimeDate.svelte';

  interface EventButtonProps {
    currentMonth: number;
    year: number;
    month: number;
    day: number;
    onClick: () => void;
    dateWithEvents: SvelteMap<string, EventType>;
  }

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    onClick();
  };

  const { currentMonth, year, month, day, onClick, dateWithEvents }: EventButtonProps = $props();

  const eventToday = $derived(
    dateWithEvents.get(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`),
  );

  const haveEvent = $derived(eventToday !== undefined);

  const today = $derived.by(() => {
    return (
      rtDate.d.getDate() === day &&
      rtDate.d.getMonth() + 1 === month &&
      rtDate.d.getFullYear() === year
    );
  });
</script>

<Button
  icon
  round
  variant={haveEvent ? 'contained' : 'text'}
  color={haveEvent ? (today ? 'primary' : 'custom') : 'gray'}
  disabled={!haveEvent}
  class={[
    month === currentMonth ? 'opacity-100' : 'opacity-50',
    {
      'ring-primary-700 ring': today,
    },
    haveEvent &&
      !today && {
        'bg-green-700 hover:bg-green-600 active:bg-green-800':
          eventToday === EventType.Single,
        'bg-teal-700 hover:bg-teal-600 active:bg-teal-800': eventToday === EventType.MultiDay,
      },
  ]}
  onClick={handleClick}
  tag="a"
  href={`?date=${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
>
  {day}
</Button>
