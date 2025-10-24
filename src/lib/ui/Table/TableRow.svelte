<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import { getTableContext } from './context';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import clsx from 'clsx';

  export interface TableProps {
    children: Snippet;
    class?: ClassValue;
  }

  const { children, class: propsClass }: TableProps = $props();

  const baseRowClass = 'grid gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0';

  const context = getTableContext();
</script>

<div class={twMerge(baseRowClass, context.rowClass, clsx(propsClass))}>{@render children()}</div>
