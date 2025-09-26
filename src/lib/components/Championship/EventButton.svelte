<script lang="ts">
  import Button from '$lib/ui/Button/Button.svelte';
  import { SvelteDate, type SvelteMap } from 'svelte/reactivity';
  import { EventType } from './types';

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

  const date = new SvelteDate();

   $effect(() => {
    let animationId: number;

    const updateTime = () => {
      date.setTime(Date.now());
      animationId = requestAnimationFrame(updateTime);
    };

    animationId = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationId);
    };
  });

  const today = $derived.by(() => {
    return date.getDate() === day && date.getMonth() + 1 === month && date.getFullYear() === year;
  });
</script>

<Button
  icon
  round
  variant={haveEvent ? 'contained' : 'text'}
  color={haveEvent
    ? today
      ? 'success'
      : eventToday === EventType.Single
        ? 'primary'
        : 'warning'
    : 'neutral'}
  disabled={!haveEvent}
  class={[
    month === currentMonth ? 'opacity-100' : 'opacity-50',
    {
      'ring-success-700 ring': today,
    },
  ]}
  onClick={handleClick}
  tag="a"
  href={`?date=${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
>
  {day}
</Button>
