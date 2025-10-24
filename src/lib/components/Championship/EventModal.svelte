<script lang="ts">
  import type { ScheduledEvent } from '$lib/api/types';
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { format, isAfter, isBefore, isSameDay } from '$lib/date';
  import EventCard from './EventCard.svelte';

  interface EventModalProps {
    date?: Date;
    events: ScheduledEvent[];
    onClose: () => void;
    openResultsModal: (event: ScheduledEvent) => void;
  }

  const { date, onClose, events, openResultsModal }: EventModalProps = $props();

  const eventsToday = $derived.by(() => {
    if (!date) return [];

    return events.filter((event) => {
      return (
        isSameDay(event.start_time, date) ||
        isSameDay(event.end_time, date) ||
        (isBefore(date, event.end_time) && isAfter(date, event.start_time))
      );
    });
  });

  const formattedDate = $derived(date ? format(date, msg['format.dateFull']()) : '');
</script>

<Modal open={!!date} {onClose}>
  <Card class="flex max-h-full w-150 max-w-full flex-col p-5">
    <h1 class="pb-5 text-2xl font-bold tracking-tight">
      {msg['championship.event.title']({ date: formattedDate })}
    </h1>
    <div
      class="-mx-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-b border-neutral-500/10 bg-neutral-500/5 px-5 py-5"
    >
      {#each eventsToday as event (event.id)}
        <EventCard {event} {openResultsModal} />
      {/each}
    </div>
    <div class="-mx-3 -mb-3 flex justify-end pt-2">
      <Button onClick={onClose} color="secondary" variant="text">
        {msg['action.close']()}
      </Button>
    </div>
  </Card>
</Modal>
