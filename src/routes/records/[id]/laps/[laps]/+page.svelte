<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { getEventInfo } from '$lib/api/event';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import type { EventInfo } from '$lib/api/types';
  import Button from '$lib/ui/Button/Button.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import EventCard from '$lib/components/EventCard/EventCard.svelte';
  import { goto } from '$app/navigation';

  const { showModal } = getMsgModalContext();

  let eventData = $state<EventInfo | undefined>(undefined);
  // records/b8724385ffc98c9a5ea86fb12771d8666db39c2469bdc9602336fae6b97c8cd4/laps/0
  let loading = $state<boolean>(true);

  onMount(() => {
    const abortController = new AbortController();
    if (!page.params.id || !page.params.laps) {
      showModal({
        title: msg['events.cannot_load.title'](),
        message: msg['events.cannot_load.desc'](),
        cancelAction: () => {
          goto('/');
        },
      });
      return;
    }
    getEventInfo(page.params.id, page.params.laps, abortController.signal)
      .then((data) => {
        eventData = data;
      })
      .catch((error) => {
        console.error('Error fetching event data:', error);
        showModal({
          title: msg['events.cannot_load.title'](),
          message: msg['events.cannot_load.desc'](),
          cancelAction: () => {
            goto('/');
          },
        });
      })
      .finally(() => {
        loading = false;
      });

    return () => {
      abortController.abort();
    };
  });

  const handleClipboardClick = () => {
    const downloadJson = JSON.stringify(eventData?.route, null, 2);
    navigator.clipboard
      .writeText(downloadJson)
      .then(() => {
        showModal({
          title: msg['track_editor.editor.copied.title'](),
          message: msg['track_editor.editor.copied.desc'](),
        });
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        showModal({
          title: msg['track_editor.editor.copy_to_clipboard_failed.title'](),
          message: msg['track_editor.editor.copy_to_clipboard_failed.desc'](),
        });
      });
  };

  const loadingOrNoData = $derived(loading || !eventData);
</script>

<title
  >{eventData?.route.routeName
    ? msg['events.head_loaded']({
        routeName: eventData.route.routeName,
        laps: page.params.laps ?? 0,
        siteName: msg['site_name_short'](),
      })
    : msg['events.head']({ siteName: msg['site_name_short']() })}</title
>

<div class="flex flex-col items-center p-8">
  <h1 class="pb-5 pt-8 text-center text-7xl font-bold tracking-tight">
    {#if eventData}
      {eventData.route.routeName}
    {:else if loadingOrNoData}
      <span
        class="w-100 inline-block animate-pulse select-none rounded-md bg-neutral-500/20 text-transparent"
        >.</span
      >
    {/if}
  </h1>
  <h2 class="pb-8 font-semibold">
    {msg['events.laps']({
      laps: page.params.laps ?? 0,
    })}
  </h2>
  <div class="sm:items-unset flex flex-col items-center gap-4 pb-8 sm:flex-row">
    <div class="flex h-10 items-center font-semibold leading-none">
      #{page.params.id?.substring(0, 8)}
    </div>
    <div class="border-l-1 hidden border-gray-500/50 sm:block"></div>
    <Button
      variant="text"
      tag="a"
      href={`/track/?uri=https%3A%2F%2Fserver.aseanmotorclub.com%2Froutes%2F${page.params.id}.json`}
      target="_blank"
      color="primary"
      disabled={loadingOrNoData}
      class="-mx-3"
    >
      {msg['events.open_in_editor']()}
    </Button>
    <div class="border-l-1 hidden border-gray-500/50 sm:block"></div>
    <Button
      variant="text"
      color="info"
      onClick={handleClipboardClick}
      disabled={loadingOrNoData}
      class="-mx-3"
    >
      {msg['events.copy_track']()}
    </Button>
  </div>

  <div class="flex w-full flex-col items-center gap-4">
    {#if eventData}
      {#each eventData.best_times as time, index (time.unique_id)}
        <EventCard {time} time0={eventData.best_times[0]} {index} loading={false} />
      {/each}
    {:else if loadingOrNoData}
      {#each Array(3) as _, index (index)}
        <EventCard time={undefined} time0={undefined} {index} loading />
      {/each}
    {/if}
  </div>
</div>
