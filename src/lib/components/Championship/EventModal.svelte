<script lang="ts">
  import { PUBLIC_DISCORD_EVENT_BASE } from '$env/static/public';
  import type { ScheduledEvent } from '$lib/api/types';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { format, isAfter, isBefore, isSameDay, isSameYear } from '$lib/date';
  import MarkdownText from '$lib/ui/MarkdownText/MarkdownText.svelte';
  import { SvelteDate, SvelteURLSearchParams } from 'svelte/reactivity';
  import { page } from '$app/state';

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

  const formattedDate = $derived(date ? format(date, siteLocale.msg['format.dateFull']()) : '');

  const formatEventStyle = (event: ScheduledEvent) => {
    const sameDay = isSameDay(event.start_time, event.end_time);
    const sameYear = isSameYear(event.start_time, event.end_time);
    return sameDay
      ? siteLocale.msg['format.scheduleFormat.sameDay']()
      : sameYear
        ? siteLocale.msg['format.scheduleFormat.sameYear']()
        : siteLocale.msg['format.scheduleFormat.crossYear']();
  };

  const today = new SvelteDate();

  $effect(() => {
    let animationId: number;

    const updateTime = () => {
      today.setTime(Date.now());
      animationId = requestAnimationFrame(updateTime);
    };

    animationId = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationId);
    };
  });

  const pastEventTime = (event: ScheduledEvent) => {
    return isBefore(event.start_time, today.getTime());
  };

  const openEvent = (e: Event, event: ScheduledEvent) => {
    e.preventDefault();
    openResultsModal(event);
  };

  const getParams = (event: ScheduledEvent) => {
    const newParams = new SvelteURLSearchParams(page.url.searchParams);
    newParams.append('event', event.id.toString());
    return newParams.toString();
  };
</script>

<Modal open={!!date} {onClose}>
  <Card class="w-150 flex max-h-full max-w-full flex-col p-5">
    <h1 class="pb-5 text-2xl font-bold tracking-tight">
      {siteLocale.msg['championship.event.title']({ date: formattedDate })}
    </h1>
    <div
      class="-mx-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-b border-t border-neutral-500/10 bg-neutral-500/5 px-5 py-5"
    >
      {#each eventsToday as event (event.id)}
        <Card>
          <div
            class={[
              'mb-1 text-xs',
              event.time_trial
                ? 'text-warning-800 dark:text-warning-500'
                : 'text-primary-800 dark:text-primary-500',
            ]}
          >
            {format(event.start_time, formatEventStyle(event))} &ndash; {format(
              event.end_time,
              formatEventStyle(event),
            )}
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">
            {event.name}
          </h1>
          <div class="wrap-anywhere my-4 text-sm opacity-80">
            <MarkdownText size="prose-sm" text={event.description} />
          </div>
          <div class="-m-2 flex gap-1">
            {#if event.discord_event_id}
              <Button
                color="info"
                variant="text"
                size="sm"
                tag="a"
                href="{PUBLIC_DISCORD_EVENT_BASE}/{event.discord_event_id}"
                target="_blank"
                rel="noreferrer"
              >
                {siteLocale.msg['championship.event.more_info']()}
              </Button>
            {/if}
            {#if pastEventTime(event)}
              <Button
                color="secondary"
                variant="text"
                size="sm"
                tag="a"
                href="?{getParams(event)}"
                onClick={(e) => openEvent(e, event)}
              >
                {siteLocale.msg['championship.event.results']()}
              </Button>
            {/if}
          </div>
        </Card>
      {/each}
    </div>
    <div class="-mx-3 -mb-3 flex justify-end pt-2">
      <Button onClick={onClose} color="secondary" variant="text">
        {siteLocale.msg['action.close']()}
      </Button>
    </div>
  </Card>
</Modal>
