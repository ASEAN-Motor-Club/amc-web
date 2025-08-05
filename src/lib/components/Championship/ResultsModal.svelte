<script lang="ts">
  import type { EventResult, ScheduledEvent } from '$lib/api/types';
  import { getEventResult } from '$lib/api/championship';
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import './markdown.css';

  type ResultsModalProps = {
    event: ScheduledEvent | undefined;
    onClose: () => void;
  };

  const { event, onClose }: ResultsModalProps = $props();

  let loading = $state(true);
  let results: EventResult[] = $state([]);

  $effect(() => {
    if (!event?.id) return;

    const abortController = new AbortController();

    getEventResult(event.id, abortController.signal).then((eventResults) => {
      results = eventResults.filter((result) => result.section_index !== -1);
      loading = false;
    });

    return () => {
      results = [];
      loading = true;
      abortController.abort();
    };
  });

  const getTeamTag = (result: EventResult) => {
    const tag = result.championship_point?.team?.tag;
    return tag ? `[${tag}]` : '';
  };

  const formatResultTime = (result: EventResult) => {
    if (result.net_time !== null) {
      return formatTime(result.net_time);
    }
  };
</script>

<Modal open={!!event} {onClose}>
  <Card class="w-150 flex max-h-full max-w-full flex-col p-0">
    <h1 class="p-5 text-2xl font-bold tracking-tight">
      {event
        ? msg['championship.event.event_results']({ event: event.name })
        : msg['championship.event.results']()}
    </h1>
    <div
      class="min-h-0 flex-1 overflow-y-auto border-b border-t border-neutral-500/10 bg-neutral-500/5"
    >
      <div
        class={[
          'flex w-full',
          loading || results.length === 0
            ? 'aspect-ratio-1 items-center justify-center'
            : 'flex-col overflow-y-auto',
        ]}
      >
        {#if loading}
          <div class="text-text/60 dark:text-text-dark/60 text-center text-sm italic">
            {msg['championship.loading']()}
          </div>
        {:else if results.length === 0}
          <div class="text-text/60 dark:text-text-dark/60 text-center text-sm italic">
            {msg['championship.event.no_results']()}
          </div>
        {:else}
          {#each results as result, index (result.character.id)}
            <div
              class={[
                'grid grid-cols-[1fr_4fr_2fr_1fr_2fr] gap-1 border-b border-neutral-500/10 px-5 py-3 text-sm last:border-0 sm:text-base',
                {
                  'text-amber-600 dark:text-amber-500': index === 0,
                  'text-gray-700 dark:text-gray-400': index === 1,
                  'text-amber-700 dark:text-amber-600': index === 2,
                },
              ]}
            >
              <div>{index + 1}</div>
              <div class="min-w-0">
                <div class="truncate">
                  {result.character.name}
                </div>
              </div>
              <div>
                <span class="font-bold">{getTeamTag(result)}</span>
              </div>
              <div class="text-center">
                {#if result.championship_point}
                  {#if result.finished}
                    <div class="font-bold">
                      {result.championship_point.points}
                    </div>
                  {:else}
                    <div class="text-xs font-bold opacity-50">-</div>
                  {/if}
                {/if}
              </div>
              <div class="text-right">
                <div>
                  {#if result.finished}
                    {formatResultTime(result)}
                  {:else}
                    <span class="text-xs italic opacity-50">{msg['championship.event.dnf']()}</span>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
    <div class="flex justify-end p-2">
      <Button onClick={onClose} color="secondary" variant="text">
        {msg['action.close']()}
      </Button>
    </div>
  </Card>
</Modal>
