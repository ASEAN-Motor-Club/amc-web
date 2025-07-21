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
    /**
     * Loading state for the card, if true, it will show a loading state
     */
    loading?: boolean;
    /**
     * HTML tag to use for the card component
     * @default 'div'
     */
    tag?: string;
    /**
     * Additional properties that can be passed to the card component
     */
    [key: string]: unknown;
  };

  const {
    children,
    class: className,
    loading,
    tag = 'div',
    ...othersCardProps
  }: CardProps = $props();
</script>

<svelte:element
  this={tag}
  class={[
    'bg-background-200 dark:bg-background-900 dark:shadow-white/3 rounded-md p-4 shadow-md ring ring-black/5 dark:ring-white/5',
    loading && 'relative !bg-transparent !shadow-none !ring-0',
    className,
  ]}
  {...othersCardProps}
>
  {#if loading}
    <div
      class="absolute left-0 top-0 h-full w-full animate-pulse rounded-md bg-neutral-500/20"
    ></div>
  {/if}
  <div class={['contents', loading && 'invisible']}>
    {@render children()}
  </div>
</svelte:element>
