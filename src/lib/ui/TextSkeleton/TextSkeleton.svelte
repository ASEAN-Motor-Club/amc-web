<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export interface TextSkeletonProps {
    /**
     * CSS class to apply to the text skeleton component
     */
    class?: ClassValue;
    lines?: number;
    lineBreakClass?: ClassValue;
  }

  const { class: propsClassName, lines = 1, lineBreakClass }: TextSkeletonProps = $props();
</script>

<span
  class={twMerge(
    `inline-block animate-pulse select-none rounded-md bg-neutral-500/20 text-transparent`,
    clsx(propsClassName),
  )}
  >{#each Array(lines) as _, i (i)}.{#if i < lines - 1}<br
        class={lineBreakClass}
      />{/if}{/each}.</span
>
