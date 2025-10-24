<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import Table from '$lib/ui/Table/Table.svelte';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  interface StandingCardProps {
    title: string;
    loading: boolean;
    children: Snippet<[{ getStandingRowClass: (index: number) => ClassValue }]>;
    empty: boolean;
    emptyState: Snippet;
  }

  const { title, loading, children, empty, emptyState }: StandingCardProps = $props();

  const getStandingRowClass = (index: number) => {
    return {
      'text-amber-600 dark:text-amber-500': index === 0,
      'text-gray-700 dark:text-gray-400': index === 1,
      'text-amber-700 dark:text-amber-600': index === 2,
    };
  };
</script>

<Card class="sm:min-w-unset h-101 min-w-full overflow-hidden p-0 sm:w-90 sm:flex-1">
  <h4 class="bg-neutral-500/10 p-4 text-xl font-medium">
    {title}
  </h4>
  <Table
    class="h-86 w-full"
    {loading}
    skeletonCount={8}
    gridClass="grid-cols-[1fr_6fr_1fr]"
    {empty}
    {emptyState}
  >
    {@render children({ getStandingRowClass })}
  </Table>
</Card>
