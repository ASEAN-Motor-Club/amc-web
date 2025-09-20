<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import type { EventResult, ScheduledEvent } from '$lib/api/types';
  import Button from '$lib/ui/Button/Button.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import EventCard from '$lib/components/EventCard/EventCard.svelte';
  import { goto } from '$app/navigation';
  import { getEvent, getEventResult } from '$lib/api/championship';
  import { PUBLIC_DISCORD_EVENT_BASE } from '$env/static/public';
  import TextSkeleton from '$lib/ui/TextSkeleton/TextSkeleton.svelte';

  const { showModal } = getMsgModalContext();

  let eventData: ScheduledEvent | undefined = $state(undefined);
  let eventResults: EventResult[] = $state([]);
  // records/b8724385ffc98c9a5ea86fb12771d8666db39c2469bdc9602336fae6b97c8cd4/laps/0
  let loading = $state<boolean>(true);

  onMount(() => {
    const abortController = new AbortController();
    if (!page.params.id) {
      showModal({
        title: siteLocale.msg['championship.results.cannot_load.title'](),
        message: siteLocale.msg['championship.results.cannot_load.desc'](),
        cancelAction: () => {
          goto('/');
        },
      });
      return;
    }

    const eventDataPromise = getEvent(page.params.id, abortController.signal).then(
      (eventDataRes) => {
        eventData = eventDataRes;
      },
    );

    const eventResultPromise = getEventResult(page.params.id, abortController.signal).then(
      (eventResultsRes) => {
        eventResults = eventResultsRes.filter((result) => result.section_index !== -1);
      },
    );

    Promise.all([eventDataPromise, eventResultPromise])
      .then(() => {
        loading = false;
      })
      .catch((error) => {
        console.error('Error fetching event data:', error);
        showModal({
          title: siteLocale.msg['championship.results.cannot_load.title'](),
          message: siteLocale.msg['championship.results.cannot_load.desc'](),
          cancelAction: () => {
            goto('/championship');
          },
        });
      });

    return () => {
      abortController.abort();
    };
  });

  const loadingOrNoData = $derived(loading || !eventData);
</script>

<svelte:head>
  <title
    >{eventData?.name
      ? siteLocale.msg['championship.results.head_loaded']({
          name: eventData.name,
          siteName: siteLocale.msg['site_name_short'](),
        })
      : siteLocale.msg['championship.results.head']({
          siteName: siteLocale.msg['site_name_short'](),
        })}</title
  >
</svelte:head>

<div class="flex flex-col items-center p-8">
  <h1 class="font-sans-alt pb-5 pt-8 text-center text-7xl font-bold">
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
      {siteLocale.msg['championship.event.more_info']()}
    </Button>
  </div>

  <div class="flex w-full flex-col items-center gap-4">
    {#if loadingOrNoData}
      {#each Array(3) as _, index (index)}
        <EventCard time={undefined} time0={undefined} {index} loading />
      {/each}
    {:else if eventResults}
      {#each eventResults as time, index (time.character.id)}
        <EventCard {time} time0={eventResults?.[0]} {index} loading={false} />
      {/each}
    {/if}
  </div>
</div>
