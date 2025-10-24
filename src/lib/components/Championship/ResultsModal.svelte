<script lang="ts">
  import type { EventResult, ScheduledEvent } from '$lib/api/types';
  import { getEventResult } from '$lib/api/championship';
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';
  import { getAbortSignal } from 'svelte';
  import Table from '$lib/ui/Table/Table.svelte';
  import TableRow from '$lib/ui/Table/TableRow.svelte';
  import TableEmptyState from '$lib/ui/Table/TableEmptyState.svelte';

  interface ResultsModalProps {
    event: ScheduledEvent | undefined;
    onClose: () => void;
    openEvent: (day: number, month: number, year: number) => void;
  }

  const { event, onClose, openEvent }: ResultsModalProps = $props();

  let loading = $state(true);
  let results: EventResult[] = $state([]);

  $effect(() => {
    if (!event?.id) return;

    getEventResult(event.id, getAbortSignal()).then((eventResults) => {
      results = eventResults.filter((result) => result.section_index !== -1);
      loading = false;
    });

    return () => {
      results = [];
      loading = true;
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

  const eventDate = $derived(event ? new Date(event.start_time) : new Date());

  const onViewEvent = (e: Event) => {
    e.preventDefault();
    if (event) {
      const date = new Date(eventDate);
      onClose();
      openEvent(date.getDate(), date.getMonth() + 1, date.getFullYear());
    }
  };
</script>

<Modal open={!!event} {onClose}>
  <Card class="flex max-h-full w-150 max-w-full flex-col p-0">
    <h1 class="p-5 text-2xl font-bold tracking-tight">
      {event
        ? msg['championship.event.event_results']({ event: event.name })
        : msg['championship.event.results']()}
    </h1>
    <Table
      gridClass="grid-cols-[1fr_4fr_2fr_1fr_2fr]"
      skeletonCount={32}
      {loading}
      class="bg-neutral-500/ md:aspect-1 aspect-9/16 w-full overflow-y-auto border-t border-b border-neutral-500/10"
      rowClass="px-5 text-sm sm:text-base"
      empty={results.length === 0}
    >
      {#snippet emptyState()}
        <TableEmptyState>
          {msg['championship.event.no_results']()}
        </TableEmptyState>
      {/snippet}
      {#each results as result, index (result.character.id)}
        <TableRow
          class={{
            'text-amber-600 dark:text-amber-500': index === 0,
            'text-gray-700 dark:text-gray-400': index === 1,
            'text-amber-700 dark:text-amber-600': index === 2,
          }}
        >
          <div>{index + 1}</div>
          <div class="min-w-0">
            <TruncateText text={result.character.name} />
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
        </TableRow>
      {/each}
    </Table>
    <div class="flex justify-between p-2">
      <Button
        onClick={onViewEvent}
        color="info"
        variant="text"
        tag="a"
        href={`?date=${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`}
      >
        {msg['championship.event.view_event']()}
      </Button>
      <Button onClick={onClose} color="secondary" variant="text">
        {msg['action.close']()}
      </Button>
    </div>
  </Card>
</Modal>
