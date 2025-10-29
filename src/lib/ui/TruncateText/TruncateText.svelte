<script lang="ts">
  import clsx from 'clsx';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import Tooltip from '../Tooltip/Tooltip.svelte';

  export interface TruncateTextProps {
    tag?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div' | 'a';
    /**
     * The text content to display and potentially truncate
     */
    text: string;
    /**
     * CSS class to apply to the truncate text component
     */
    class?: ClassValue;
    /**
     * custom children elements to be rendered inside the component
     */
    children?: Snippet;
    extra?: Record<string, unknown>;
  }

  const { children, text, class: propsClass, tag = 'span', extra }: TruncateTextProps = $props();

  let containerElement: HTMLSpanElement | undefined = $state(undefined);

  let isOverflowing = $state(false);

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!containerElement) return;

    const observer = new ResizeObserver(() => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!containerElement) return;

      isOverflowing = containerElement.scrollWidth > containerElement.clientWidth;
    });

    observer.observe(containerElement);
    isOverflowing = containerElement.scrollWidth > containerElement.clientWidth;
    return () => {
      observer.disconnect();
    };
  });

  const baseClass = 'inline-block truncate max-w-full';
</script>

<svelte:element
  this={tag}
  bind:this={containerElement}
  class={twMerge(baseClass, clsx(propsClass))}
  {...extra}
  >{#if children}{@render children()}{:else}{text}{/if}</svelte:element
>
<Tooltip
  anchor={containerElement}
  position="top"
  disabled={!isOverflowing}
  offset={3}
  class="rounded-sm bg-white/90 px-1.75 py-0.5 text-sm shadow-sm backdrop-blur-xs dark:bg-black/90 dark:shadow-white/3"
  >{text}</Tooltip
>
