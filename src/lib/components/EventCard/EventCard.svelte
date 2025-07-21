<script lang="ts">
  import type { BestTime } from '$lib/api/types';
  import { m } from '$lib/paraglide/messages';
  import Card from '$lib/ui/Card/Card.svelte';
  import Lottie from '$lib/ui/Lottie/Lottie.svelte';
  import lottieSpark from '$lib/assets/lottie/sparkle.json';
  import { formatTime } from '$lib/utils/formatTime';

  export type HoverInfoTooltipProps = {
    time: BestTime | undefined;
    time0: BestTime | undefined;
    index: number;
    loading: boolean;
  };

  const { time, time0, index, loading }: HoverInfoTooltipProps = $props();
</script>

<Card class="max-w-120 flex w-full flex-col items-center gap-2 sm:flex-row" {loading}>
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
      <div class={['font-bold', index < 3 && 'top-2.25 text-text-dark absolute  text-sm']}>
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
        <span>{time ? time.name : '.'}</span>
      </div>
      <div class="text-xs text-neutral-500/80">
        <span>{time ? time.unique_id : '.'}</span>
      </div>
    </div>
  </div>

  <div class="flex items-center justify-between gap-1 sm:ml-auto sm:block">
    <div class="text-center font-semibold sm:text-right">
      {time ? formatTime(time.net_time) : '.'}
    </div>

    <div class="text-center text-xs text-neutral-500/90 sm:text-right">
      {#if index > 0}
        (+{time && time0 ? formatTime(time.net_time - time0.net_time) : '.'})
      {:else}
        {m['events.fastest']()}
      {/if}
    </div>
  </div>
</Card>
