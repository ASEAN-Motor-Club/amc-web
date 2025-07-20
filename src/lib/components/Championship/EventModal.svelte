<script lang="ts">
  import { EventType, mappedEvents } from '$lib/data/event';
  import { m } from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';

  type EventModalProps = {
    day: number | undefined;
    month: number | undefined;
    year: number | undefined;
    onClose: () => void;
  };

  const { day, month, year, onClose }: EventModalProps = $props();

  const events = $derived(
    day && month && year ? (mappedEvents.get(year)?.get(month)?.get(day) ?? []) : [],
  );

  const dateFormat = $derived(
    new Intl.DateTimeFormat(getLocale(), {
      dateStyle: 'full',
    }).format(new Date(year ?? 0, month ? month - 1 : 0, day ?? 1)),
  );

  const getEventType = (type: EventType) => {
    switch (type) {
      case EventType.Championship:
        return m['championship.event.event_type.championship']();
      case EventType.Warmup:
        return m['championship.event.event_type.warmup']();
    }
  };

  const timeFormat = (time: string) => {
    return new Intl.DateTimeFormat(getLocale(), {
      timeStyle: 'short',
    }).format(new Date(time));
  };
</script>

<Modal open={!!(day && month && year)} {onClose}>
  <Card class="max-w-100% w-150 flex flex-col p-5">
    <h2 class="pb-4.5 text-2xl font-bold tracking-tight">
      {m['championship.event.title']({ date: dateFormat })}
    </h2>
    <div>
      {#each events as event (event.id)}
        <Card>
          <div class="flex justify-between">
            <span class="text-sm">{timeFormat(event.date)}</span>
            <span
              class={[
                'text-sm',
                event.official
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400',
              ]}
              >{event.official
                ? m['championship.event.official']()
                : m['championship.event.unofficial']()}
              {getEventType(event.eventType)}</span
            >
          </div>
          <h3 class="my-1 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium">
            {event.title}
          </h3>
          <p class="text-text/90 dark:text-text-dark/90 my-1 text-sm">
            {event.description}
          </p>
          <p class="text-text/80 dark:text-text-dark/80 my-0.5 text-sm">
            {#each event.subEvent as subEvent, i (i)}
              {#if event.subEvent.length > 1}
                {m['championship.event.sub_event']({
                  no: i + 1,
                  o: new Intl.PluralRules(getLocale(), { type: 'ordinal' }).select(i + 1),
                })}
              {:else}
                {m['championship.event.sub_event_single']()}
              {/if}
              {#if subEvent.track}
                <a
                  href={'/track?uri=' + encodeURIComponent(subEvent.track)}
                  target="_blank"
                  class="text-blue-600/80 hover:underline dark:text-blue-400/80"
                  >{m['championship.event.sub_event_race']({ name: subEvent.title })}</a
                >
              {:else}
                {subEvent.title}
              {/if}
              <br />
            {/each}
          </p>

          <div class="-mx-2 -mb-2">
            <Button color="info" variant="text" size="sm" tag="a" href={event.link} target="_blank">
              {m['championship.event.more_info']()}
            </Button>
          </div>
        </Card>
      {/each}
    </div>
    <div class="-mx-3 -my-3 flex justify-end pt-6">
      <Button onClick={onClose} color="secondary" variant="text">
        {m['action.close']()}
      </Button>
    </div>
  </Card>
</Modal>
