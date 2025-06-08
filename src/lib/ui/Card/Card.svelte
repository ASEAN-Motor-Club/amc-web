<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  export type CardProps = {
    /**
     * CSS class to apply to the card component
     */
    class?: ClassValue;
    /**
     * Content to be rendered inside the card component
     */
    children: Snippet;
  };

  const { children, class: className }: CardProps = $props();
</script>

<div
  class={[
    'rounded-md p-4 shadow-md ring ring-black/5 dark:shadow-white/3 dark:ring-white/5',
    className,
  ]}
>
  {@render children()}
</div>
