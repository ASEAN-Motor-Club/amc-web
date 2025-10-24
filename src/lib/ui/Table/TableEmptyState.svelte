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
    'text-text/60 dark:text-text-dark/60 flex flex-1 items-center justify-center p-4 text-center text-sm italic',
    clsx(propsClass),
  )}
>
  {@render children()}
</div>
