<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import Portal from 'svelte-portal';
  import type { ClassValue } from 'svelte/elements';
  import clsx from 'clsx';
  import { twMerge } from 'tailwind-merge';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { fade } from 'svelte/transition';

  export interface TooltipProps {
    /**
     * The anchor element that will trigger the tooltip on hover
     */
    anchor: HTMLElement;
    /**
     * Content to be rendered inside the tooltip
     */
    children: Snippet;
    /**
     * Position of the tooltip relative to the anchor
     * @default 'top'
     */
    position?: 'top' | 'bottom' | 'left' | 'right';
    /**
     * Renders the tooltip inside a portal
     * @default true
     */
    portal?: boolean;
    /**
     * CSS class to apply to the tooltip component
     */
    class?: ClassValue;
    /**
     * Distance in pixels between the tooltip and the anchor element
     * @default 4
     */
    offset?: number;
    /**
     * Whether the tooltip is disabled
     * @default false
     */
    disabled?: boolean;
  }

  const {
    anchor,
    children,
    position = 'top',
    portal = true,
    class: propsClassName,
    offset = 8,
    disabled = false,
  }: TooltipProps = $props();

  const VIEWPORT_PADDING = 8;

  let tooltipElement: HTMLElement | undefined = $state(undefined);
  let showTooltip = $state(false);
  let showTimeout: NodeJS.Timeout | null = null;
  let hideTimeout: NodeJS.Timeout | null = null;

  const clearTimeouts = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    clearTimeouts();
    showTooltip = true;
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    clearTimeouts();
    showTooltip = false;
  };

  const updateTooltipPosition = () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!tooltipElement) return;

    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let top = 0;
    let left = 0;

    // Calculate the center positions for better alignment
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const tooltipHalfWidth = tooltipRect.width / 2;
    const tooltipHalfHeight = tooltipRect.height / 2;

    switch (position) {
      case 'top':
        top = anchorRect.top + scrollY - tooltipRect.height - offset;
        left = anchorCenterX + scrollX - tooltipHalfWidth;
        break;
      case 'bottom':
        top = anchorRect.bottom + scrollY + offset;
        left = anchorCenterX + scrollX - tooltipHalfWidth;
        break;
      case 'left':
        top = anchorCenterY + scrollY - tooltipHalfHeight;
        left = anchorRect.left + scrollX - tooltipRect.width - offset;
        break;
      case 'right':
        top = anchorCenterY + scrollY - tooltipHalfHeight;
        left = anchorRect.right + scrollX + offset;
        break;
    }

    // Horizontal boundary checks
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    } else if (left + Number(tooltipRect.width) > window.innerWidth - VIEWPORT_PADDING) {
      left = window.innerWidth - Number(tooltipRect.width) - VIEWPORT_PADDING;
    }

    // Vertical boundary checks
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING;
    } else if (top + Number(tooltipRect.height) > window.innerHeight - VIEWPORT_PADDING) {
      top = window.innerHeight - Number(tooltipRect.height) - VIEWPORT_PADDING;
    }

    tooltipElement.style.top = `${top}px`;
    tooltipElement.style.left = `${left}px`;
  };

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (showTooltip && tooltipElement) {
      updateTooltipPosition();
    }
  });

  onMount(() => {
    // Add event listeners to the anchor element
    anchor.addEventListener('mouseenter', handleMouseEnter);
    anchor.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      if (showTooltip) {
        updateTooltipPosition();
      }
    };

    const handleScroll = () => {
      if (showTooltip) {
        updateTooltipPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeouts();
      anchor.removeEventListener('mouseenter', handleMouseEnter);
      anchor.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  });
</script>

{#snippet tooltipBase()}
  {#if showTooltip && !disabled}
    <div
      bind:this={tooltipElement}
      class={twMerge('z-1000001 absolute left-0 top-0', clsx(propsClassName))}
      role="tooltip"
      transition:fade={{ duration: defaultTransitionDurationMs }}
    >
      {@render children()}
    </div>
  {/if}
{/snippet}

{#if portal}
  <Portal>
    {@render tooltipBase()}
  </Portal>
{:else}
  {@render tooltipBase()}
{/if}
