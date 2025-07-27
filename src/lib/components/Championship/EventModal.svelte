<script lang="ts">
  import { PUBLIC_DISCORD_EVENT_BASE } from '$env/static/public';
  import type { ScheduledEvent } from '$lib/api/types';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { isSameDay } from 'date-fns';
  import { dateTimeFormat, format, timeFormat } from '$lib/localeFormat/date';
  import MarkdownText from '$lib/ui/MarkdownText/MarkdownText.svelte';
  import './markdown.css';

  type EventModalProps = {
    day: number | undefined;
    month: number | undefined;
    year: number | undefined;
    events: ScheduledEvent[];
    onClose: () => void;
  };

  const { day, month, year, onClose, events }: EventModalProps = $props();

  const eventsToday = $derived.by(() => {
    if (!day || !month || !year) return [];

    const date = new Date(year, month - 1, day);

    return events.filter((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.start_time);
      return isSameDay(eventStart, date) || isSameDay(eventEnd, date);
    });
  });

  const formattedDate = $derived(
    format(new Date(year ?? 0, month ? month - 1 : 0, day ?? 1), m['config.dateFull']()),
  );

  const eventMultiDay = (event: ScheduledEvent) => {
    return !isSameDay(new Date(event.start_time), new Date(event.end_time));
  };
</script>

<Modal open={!!(day && month && year)} {onClose}>
  <Card class="max-w-100% w-150 max-h-100% flex flex-col p-5">
    <h1 class="pb-4.5 text-2xl font-bold tracking-tight">
      {m['championship.event.title']({ date: formattedDate })}
    </h1>
    <div class="-mx-5 -my-1.5 min-h-0 flex-1 overflow-y-auto px-5 py-1.5">
      {#each eventsToday as event (event.id)}
        <Card>
          <div class="text-primary-800 dark:text-primary-500 mb-1 text-xs">
            {#if eventMultiDay(event)}
              {dateTimeFormat(new Date(event.start_time))} - {dateTimeFormat(
                new Date(event.end_time),
              )}
            {:else}
              {timeFormat(new Date(event.start_time))} - {timeFormat(new Date(event.end_time))}
            {/if}
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">
            {event.name}
          </h1>
          <div class="wrap-anywhere event-markdown my-4 text-sm opacity-80">
            <MarkdownText text={event.description} />
          </div>
          <div class="-m-2">
            <Button
              color="info"
              variant="text"
              size="sm"
              tag="a"
              href="{PUBLIC_DISCORD_EVENT_BASE}/{event.discord_event_id}"
              target="_blank"
            >
              {m['championship.event.more_info']()}
            </Button>
          </div>
        </Card>
      {/each}
    </div>
    <div class="-mx-3 -mb-3 flex justify-end pt-3">
      <Button onClick={onClose} color="secondary" variant="text">
        {m['action.close']()}
      </Button>
    </div>
  </Card>
</Modal>
