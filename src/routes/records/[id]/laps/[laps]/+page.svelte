<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { getEventInfo } from '$lib/api/event';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import type { EventInfo } from '$lib/api/types';
  import { formatTime } from '$lib/utils/formatTime';
  import Card from '$lib/ui/Card/Card.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import { m } from '$lib/paraglide/messages';
  import Lottie from '$lib/ui/Lottie/Lottie.svelte';
  import lottieSpark from '$lib/assets/lottie/sparkle.json';

  const { showModal } = getMsgModalContext();

  let eventData = $state<EventInfo | undefined>(undefined);
  // records/b8724385ffc98c9a5ea86fb12771d8666db39c2469bdc9602336fae6b97c8cd4/laps/0

  onMount(() => {
    const abortController = new AbortController();
    getEventInfo(page.params.id, page.params.laps, abortController.signal)
      .then((data) => {
        eventData = data;
      })
      .catch((error) => {
        console.error('Error fetching event data:', error);
        showModal({
          title: 'Event Data Error',
          message: 'Failed to load event data. Please try again later.',
        });
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
          title: m['track_editor.editor.copied.title'](),
          message: m['track_editor.editor.copied.desc'](),
        });
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        showModal({
          title: m['track_editor.editor.copy_to_clipboard_failed.title'](),
          message: m['track_editor.editor.copy_to_clipboard_failed.desc'](),
        });
      });
  };
</script>

<div class="flex flex-col items-center p-8">
  {#if eventData}
    <h1 class="pb-5 pt-8 text-center text-7xl font-bold">{eventData.route.routeName}</h1>
    <h2 class="pb-8 font-semibold">
      {page.params.laps === '0' ? 'No' : page.params.laps}
      {page.params.laps === '1' ? 'lap' : 'laps'}
    </h2>
    <div class="sm:items-unset flex flex-col items-center gap-4 pb-8 sm:flex-row">
      <div class="font-semibold">
        #{page.params.id.substring(0, 8)}
      </div>
      <div class="border-l-1 hidden border-gray-500/50 sm:block"></div>
      <Button
        variant="text"
        unPadded
        tag="a"
        href={`/track/?uri=https%3A%2F%2Fserver.aseanmotorclub.com%2Froutes%2F${page.params.id}.json`}
        target="_blank"
        color="primary"
      >
        {m['events.open_in_editor']()}
      </Button>
      <div class="border-l-1 hidden border-gray-500/50 sm:block"></div>
      <Button variant="text" unPadded color="info" onClick={handleClipboardClick}>
        {m['events.copy_track']()}
      </Button>
    </div>

    <div class="flex w-full flex-col items-center gap-4">
      {#each eventData.best_times as time, index (time.unique_id)}
        <Card class="max-w-120 flex w-full flex-col items-center gap-2 sm:flex-row">
          <div class="flex items-center gap-2">
            <div class="aspect-1 relative flex h-12 select-none items-center justify-center">
              {#if index < 3}
                <div
                  class={[
                    'i-material-symbols:trophy-rounded h-full w-full',
                    {
                      'text-amber-500': index === 0,
                      'text-gray-500': index === 1,
                      'text-amber-700': index === 2,
                    },
                  ]}
                ></div>
              {/if}
              <div class={['font-bold', index < 3 && 'top-2.25 absolute text-sm  text-white']}>
                {index + 1}
              </div>
              {#if index < 3}
                <div class="absolute h-full w-full">
                  <Lottie animationData={lottieSpark} loop autoplay speed={1 - index * 0.1} />
                </div>
              {/if}
            </div>
            <div>
              <div
                class={[
                  'font-semibold',
                  {
                    'text-amber-600 dark:text-amber-500': index === 0,
                    'text-gray-700 dark:text-gray-400': index === 1,
                    'text-amber-700 dark:text-amber-600': index === 2,
                  },
                ]}
              >
                <span>{time.name}</span>
              </div>
              <div class="text-xs text-neutral-500/80">
                <span>{time.unique_id}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-1 sm:ml-auto sm:block">
            <div class="text-center font-semibold sm:text-right">
              {formatTime(time.net_time)}
            </div>

            <div class="text-center text-xs text-neutral-500/90 sm:text-right">
              {#if index > 0}
                (+{formatTime(time.net_time - eventData.best_times[0].net_time)})
              {:else}
                {m['events.fastest']()}
              {/if}
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>
