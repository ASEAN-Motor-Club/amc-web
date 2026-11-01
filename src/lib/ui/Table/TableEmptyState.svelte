<script lang="ts">
  import clsx from 'clsx';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export interface TableProps {
    children: Snippet;
    class?: ClassValue;
  }

  const { children, class: propsClass }: TableProps = $props();
</script>

<div
  class={twMerge(
    'flex flex-1 items-center justify-center p-4 text-center text-sm text-text-600 italic dark:text-text-400',
    clsx(propsClass),
  )}
>
  {@render children()}
</div>
