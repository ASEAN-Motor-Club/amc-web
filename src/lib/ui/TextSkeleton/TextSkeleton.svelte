<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export interface TextSkeletonProps {
    /**
     * CSS class to apply to the text skeleton component
     */
    class?: ClassValue;
  }

  const { class: propsClassName }: TextSkeletonProps = $props();
</script>

<span
  class={twMerge(
    `inline-block animate-pulse select-none rounded-md bg-neutral-500/20 text-transparent`,
    clsx(propsClassName),
  )}>.</span
>
