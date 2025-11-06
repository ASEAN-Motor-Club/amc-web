<script lang="ts">
  import { PUBLIC_DISCORD_EVENT_BASE } from '$env/static/public';
  import type { ScheduledEvent } from '$lib/api/types';
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import { format, isBefore, isSameDay, isSameYear } from '$lib/date';
  import MarkdownText from '$lib/ui/MarkdownText/MarkdownText.svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { clientSearchParams } from '$lib/utils/clientSearchParamsGet';
  import { rtDate } from '$lib/realtimeDate.svelte';
  import { RichTextTag } from './types';

  interface EventCardProps {
    event: ScheduledEvent;
    openResultsModal: (event: ScheduledEvent) => void;
  }

  const { event, openResultsModal }: EventCardProps = $props();

  const eventStyle = $derived.by(() => {
    const sameDay = isSameDay(event.start_time, event.end_time);
    const sameYear = isSameYear(event.start_time, event.end_time);
    return sameDay
      ? m['format.scheduleFormat.sameDay']()
      : sameYear
        ? m['format.scheduleFormat.sameYear']()
        : m['format.scheduleFormat.crossYear']();
  });

  const pastEventTime = $derived(isBefore(event.start_time, rtDate.d.getTime()));

  const openEvent = (e: Event, event: ScheduledEvent) => {
    e.preventDefault();
    openResultsModal(event);
  };

  const href = $derived.by(() => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.append('event', event.id.toString());
    return `?${newParams.toString()}`;
  });

  const formattedDesc = $derived(
    event.description.replace(/<(.+?)>(.+?)<\/>/g, (_, p1, p2) => {
      switch (p1.toLowerCase() as RichTextTag) {
        case RichTextTag.Money:
        case RichTextTag.Warning:
        case RichTextTag.Highlight:
        case RichTextTag.Focus:
        case RichTextTag.FocusOutline:
        case RichTextTag.Bold:
        case RichTextTag.Announce:
        case RichTextTag.Company:
        case RichTextTag.Event:
        case RichTextTag.Whisper:
        case RichTextTag.EffectBad:
        case RichTextTag.EffectGood:
          return `**${p2}**`;
        case RichTextTag.InputKey:
        case RichTextTag.Disabled:
          return `*${p2}*`;
        case RichTextTag.Title:
          return `## ${p2} ##`;
        case RichTextTag.Large:
          return `# ${p2} #`;
        case RichTextTag.Small:
        case RichTextTag.Secondary:
          return `<small>${p2}</small>`;
        case RichTextTag.Default:
        case RichTextTag.Chat:
        default:
          return p2;
      }
    }),
  );
</script>

<Card>
  <div
    class={[
      'mb-1 text-xs',
      event.time_trial
        ? 'text-warning-800 dark:text-warning-500'
        : 'text-primary-800 dark:text-primary-500',
    ]}
  >
    {format(event.start_time, eventStyle)} &ndash; {format(event.end_time, eventStyle)}
  </div>
  <h1 class="mb-8 text-3xl font-semibold tracking-tight">
    {event.name}
  </h1>
  {#if formattedDesc}
    <div class="mb-8 text-sm wrap-anywhere opacity-80">
      <MarkdownText size="prose-sm" text={formattedDesc} />
    </div>
  {/if}
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
        {m['championship.event.more_info']()}
      </Button>
    {/if}
    {#if pastEventTime}
      <Button
        color="secondary"
        variant="text"
        size="sm"
        tag="a"
        {href}
        onClick={(e) => openEvent(e, event)}
      >
        {m['championship.event.results']()}
      </Button>
    {/if}
  </div>
</Card>
