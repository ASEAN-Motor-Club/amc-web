<script lang="ts">
  import '$lib/font-sans-em';
  import { page } from '$app/state';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import Button from '$lib/ui/Button/Button.svelte';
  import { m } from '$messages';
  import EventCard from '$lib/components/EventCard/EventCard.svelte';
  import { goto } from '$app/navigation';
  import { createEventQuery, createEventResultsQuery } from '$lib/api/championship';
  import { PUBLIC_DISCORD_EVENT_BASE } from '$env/static/public';
  import TextSkeleton from '$lib/ui/TextSkeleton/TextSkeleton.svelte';

  const { showModal } = getMsgModalContext();

  const eventId = $derived(page.params.id);

  const eventQuery = createEventQuery(() => ({ id: eventId }));
  const eventResultsQuery = createEventResultsQuery(() => ({ id: eventId }));

  const eventData = $derived(eventQuery.data);
  const eventResults = $derived(
    (eventResultsQuery.data ?? []).filter((result) => result.section_index !== -1),
  );
  const loading = $derived(eventQuery.isPending || eventResultsQuery.isPending);

  $effect(() => {
    if (eventId && !eventQuery.isError && !eventResultsQuery.isError) {
      return;
    }

    showModal({
      title: m['championship.results.cannot_load.title'](),
      message: m['championship.results.cannot_load.desc'](),
      cancelAction: () => {
        goto(eventId ? '/championship' : '/');
      },
    });
  });

  const loadingOrNoData = $derived(loading || !eventData);

  const title = $derived(
    eventData?.name
      ? m['championship.results.head_loaded']({
          name: eventData.name,
          siteName: m.site_name_short(),
        })
      : m['championship.results.head']({
          siteName: m.site_name_short(),
        }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<div class="flex flex-col items-center p-8">
  <h1 class="font-sans-em pt-8 pb-5 text-center text-7xl font-bold tracking-wide">
    {#if eventData}
      {eventData.name}
    {:else if loadingOrNoData}
      <TextSkeleton class="w-100" />
    {/if}
  </h1>
  <div class="sm:items-unset flex flex-col items-center gap-4 pb-8 sm:flex-row">
    <Button
      variant="text"
      tag="a"
      href="{PUBLIC_DISCORD_EVENT_BASE}/{eventData?.discord_event_id}"
      target="_blank"
      rel="noreferrer"
      color="primary"
      disabled={loadingOrNoData}
      class="-mx-3"
    >
      {m['championship.event.more_info']()}
    </Button>
  </div>

  <div class="flex w-full flex-col items-center gap-4">
    {#if loadingOrNoData}
      {#each Array(3) as _, index (index)}
        <EventCard time={undefined} time0={undefined} {index} loading />
      {/each}
    {:else if eventResults}
      {#each eventResults as time, index (time.character.id)}
        <EventCard {time} time0={eventResults[0]} {index} loading={false} />
      {/each}
    {/if}
  </div>
</div>
