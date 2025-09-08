<script lang="ts">
  import type { EventResult } from '$lib/api/types';
  import { m as msg } from '$lib/paraglide/messages';
  import Card from '$lib/ui/Card/Card.svelte';
  import Lottie from '$lib/ui/Lottie/Lottie.svelte';
  import lottieSpark from '$lib/assets/lottie/sparkle.json';
  import { formatTime } from '$lib/utils/formatTime';

  export interface HoverInfoTooltipProps {
    time: EventResult | undefined;
    time0: EventResult | undefined;
    index: number;
    loading: boolean;
  }

  const { time, time0, index, loading }: HoverInfoTooltipProps = $props();

  const netTime = $derived(time?.net_time ?? 0);
</script>

<Card class="max-w-120 flex w-full flex-row items-center gap-2" {loading}>
  <div class="relative flex size-12 flex-none select-none items-center justify-center">
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
    <div class={['font-bold', index < 3 && 'top-2.25 text-text-dark absolute text-sm']}>
      {index + 1}
    </div>
    {#if index < 3}
      <div class="absolute h-full w-full">
        <Lottie animationData={lottieSpark} loop autoplay speed={1 - index * 0.1} />
      </div>
    {/if}
  </div>
  <div class="flex flex-1 flex-col justify-between sm:flex-row sm:gap-2">
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
        {loading ? '.' : time?.character.name}
      </div>
      <div class="text-text/80 dark:text-text-dark/80 text-xs">
        {#if loading}
          .
        {:else if time?.championship_point}
          <span class="font-semibold"
            >{msg['championship.results.pts']({ points: time.championship_point.points })}</span
          >
          {#if time.championship_point.team?.name}
            | {time.championship_point.team.name}
          {/if}
        {/if}
      </div>
    </div>

    <div class="flex items-baseline gap-1 sm:ml-auto sm:block sm:items-center sm:justify-between">
      <div class="text-center font-semibold sm:text-right">
        {#if loading}
          .
        {:else if time?.finished}
          {formatTime(netTime)}
        {:else}
          <span class="italic opacity-50">{msg['championship.event.dnf']()}</span>
        {/if}
      </div>

      <div class="text-center text-xs text-neutral-500/90 sm:text-right">
        {#if loading}
          .
        {:else if time?.finished}
          {#if index > 0}
            +{formatTime(netTime - (time0?.net_time ?? 0))}
          {:else}
            {msg['championship.results.fastest']()}
          {/if}
        {/if}
      </div>
    </div>
  </div>
</Card>
