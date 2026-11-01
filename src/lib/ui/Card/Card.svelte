<script lang="ts">
  import clsx from 'clsx';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import { m } from '#messages';

  export interface CardProps {
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
  }

  const {
    children,
    class: propsClass,
    loading,
    tag = 'div',
    ...othersCardProps
  }: CardProps = $props();
</script>

<svelte:element
  this={tag}
  class={twMerge(
    'rounded-md p-4',
    loading
      ? 'relative bg-transparent'
      : 'bg-background-50 shadow-md ring ring-gray-950/5 contrast-more:ring-gray-950/50 dark:bg-background-900 dark:shadow-white/3 dark:ring-white/5 dark:contrast-more:ring-white/50',
    clsx(propsClass),
  )}
  aria-busy={loading ? 'true' : undefined}
  {...othersCardProps}
>
  {#if loading}
    <div
      class="absolute top-0 left-0 h-full w-full animate-pulse rounded-md bg-gray-500/20"
      role="status"
    >
      <span class="sr-only">{m['a11y.loading']()}</span>
    </div>
  {/if}
  <!-- Placeholder content only sizes the skeleton; keep it out of the a11y tree and tab order. -->
  <div
    class={['contents', loading && 'invisible']}
    aria-hidden={loading ? 'true' : undefined}
    inert={loading}
  >
    {@render children()}
  </div>
</svelte:element>
