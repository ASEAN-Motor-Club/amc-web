<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import { getTableContext } from './context';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { clsx } from 'clsx';

  export interface TableProps {
    children: Snippet;
    class?: ClassValue;
  }

  const { children, class: propsClass }: TableProps = $props();

  const baseRowClass =
    'grid grid-cols-[6fr_4rem_6rem] gap-2 bg-gray-500/5 px-4 py-2 text-sm font-semibold text-text-600 dark:text-text-400';

  const context = getTableContext();
</script>

<div class={twMerge(baseRowClass, context.gridClass, clsx(propsClass))}>
  {@render children()}
</div>
