<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import type { Snippet } from 'svelte';

  type StandingCardProps = {
    title: string;
    loading: boolean;
    children: Snippet<
      [{ getStandingRowClass: (index: number) => (string | Record<string, boolean>)[] }]
    >;
  };

  const { title, loading, children }: StandingCardProps = $props();

  const getStandingRowClass = (index: number) => {
    return [
      'grid grid-cols-[1fr_6fr_1fr] border-b border-neutral-500/10 px-4 py-3 last:border-0',
      {
        'text-amber-600 dark:text-amber-500': index === 0,
        'text-gray-700 dark:text-gray-400': index === 1,
        'text-amber-700 dark:text-amber-600': index === 2,
      },
    ];
  };

  const classPulse =
    'inline-block animate-pulse select-none rounded-md bg-neutral-500/20 text-transparent';
</script>

<Card class="sm:min-w-unset h-101 sm:w-90 min-w-full !p-0 sm:flex-1 overflow-hidden">
  <h4 class="bg-neutral-500/10 p-4 text-xl font-medium">
    {title}
  </h4>
  <div class={['h-86 flex w-full flex-col', loading ? 'overflow-y-hidden' : 'overflow-y-auto']}>
    {#if loading}
      {#each Array(8) as _, index (index)}
        <div
          class="grid grid-cols-[1fr_6fr_1fr] gap-3 border-b border-neutral-500/10 px-4 py-3 last:border-0"
        >
          <div class={classPulse}>.</div>
          <div class={classPulse}>.</div>
          <div class={classPulse}>.</div>
        </div>
      {/each}
    {:else}
      {@render children({ getStandingRowClass })}
    {/if}
  </div>
</Card>
