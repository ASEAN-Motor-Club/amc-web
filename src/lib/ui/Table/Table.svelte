<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { setTableContext } from './context';
  import type { Snippet } from 'svelte';
  import clsx from 'clsx';
  import TextSkeleton from '../TextSkeleton/TextSkeleton.svelte';
  import TableRow from './TableRow.svelte';
  import { twMerge } from 'tailwind-merge';

  // @unocss-skip-start
  export interface TableProps {
    skeletonCount: number;
    gridClass: `grid-cols-${number}` | `grid-cols-[${string}]`;
    class?: ClassValue;
    emptyState?: Snippet;
    empty?: boolean;
    loading?: boolean;
    children: Snippet;
    rowClass?: ClassValue;
    head?: Snippet;
  }
  // @unocss-skip-end

  const {
    gridClass,
    class: propsClass,
    skeletonCount,
    empty,
    emptyState,
    children,
    loading,
    rowClass,
    head,
  }: TableProps = $props();

  // @unocss-skip-start
  const colCount = $derived(
    gridClass.startsWith('grid-cols-[')
      ? gridClass.slice(11).split('_').length
      : +gridClass.slice(10),
  );
  // @unocss-skip-end

  setTableContext({
    get gridClass() {
      return gridClass;
    },
    get rowClass() {
      return clsx(gridClass, rowClass);
    },
  });
</script>

<div
  class={twMerge(
    'flex flex-1 flex-col',
    loading ? 'overflow-y-hidden' : 'overflow-y-auto',
    clsx(propsClass),
  )}
>
  {#if loading}
    {@render head?.()}
    {#each Array(skeletonCount) as _, i (i)}
      <TableRow>
        {#each Array(colCount) as _, i (i)}
          <TextSkeleton />
        {/each}
      </TableRow>
    {/each}
  {:else if empty}
    {@render emptyState?.()}
  {:else}
    {@render head?.()}
    {@render children()}
  {/if}
</div>
