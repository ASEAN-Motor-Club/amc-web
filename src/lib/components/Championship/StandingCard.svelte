<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import TextSkeleton from '$lib/ui/TextSkeleton/TextSkeleton.svelte';
  import type { Snippet } from 'svelte';

  interface StandingCardProps {
    title: string;
    loading: boolean;
    children: Snippet<
      [{ getStandingRowClass: (index: number) => (string | Record<string, boolean>)[] }]
    >;
  }

  const { title, loading, children }: StandingCardProps = $props();

  const getStandingRowClass = (index: number) => {
    return [
      'grid grid-cols-[1fr_6fr_1fr] border-b border-neutral-500/10 px-4 py-3 last:border-0 gap-2',
      {
        'text-amber-600 dark:text-amber-500': index === 0,
        'text-gray-700 dark:text-gray-400': index === 1,
        'text-amber-700 dark:text-amber-600': index === 2,
      },
    ];
  };
</script>

<Card class="sm:min-w-unset h-101 min-w-full overflow-hidden p-0 sm:w-90 sm:flex-1">
  <h4 class="bg-neutral-500/10 p-4 text-xl font-medium">
    {title}
  </h4>
  <div class={['flex h-86 w-full flex-col', loading ? 'overflow-y-hidden' : 'overflow-y-auto']}>
    {#if loading}
      {#each Array(8) as _, index (index)}
        <div
          class="grid grid-cols-[1fr_6fr_1fr] gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0"
        >
          <TextSkeleton />
          <TextSkeleton />
          <TextSkeleton />
        </div>
      {/each}
    {:else}
      {@render children({ getStandingRowClass })}
    {/if}
  </div>
</Card>
