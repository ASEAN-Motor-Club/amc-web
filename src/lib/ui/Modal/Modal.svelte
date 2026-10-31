<script lang="ts">
  import { m } from '#messages';
  import { onMount, type Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import { portal } from '#lib/utils/portal.js';
  import type { ClassValue } from 'svelte/elements';
  import { defaultTransitionDurationMs } from '#lib/tw-var.js';
  import { modalCounter } from './modalCounter.svelte';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';

  export interface ModalProps {
    /**
     * Whether the modal is open or not
     */
    open: boolean;
    /**
     * Content to be rendered inside the modal
     */
    children: Snippet;
    /**
     * Callback function to be called when the modal is closed
     */
    onClose?: () => void;
    /**
     * Renders the modal inside a portal
     * @default true
     */
    portal?: boolean;
    /**
     * The target element or selector where the portal should render the modal
     * @default 'body'
     */
    portalTarget?: string | HTMLElement;
    /**
     * CSS class to apply to the modal component
     */
    class?: ClassValue;
  }

  const {
    open,
    children,
    onClose,
    portal: usePortal = true,
    portalTarget = 'body',
    class: propsClass,
  }: ModalProps = $props();

  const id = Math.random().toString(36).substring(2, 15);

  function isPageScrollable(): boolean {
    return document.documentElement.scrollHeight > document.documentElement.clientHeight;
  }

  $effect(() => {
    if (open) {
      modalCounter.add(id);
      if (isPageScrollable()) {
        document.documentElement.style.scrollbarGutter = 'stable';
      }
      document.documentElement.style.overflowY = 'hidden';
    } else {
      modalCounter.delete(id);
      if (modalCounter.size === 0) {
        document.documentElement.style.scrollbarGutter = '';
        document.documentElement.style.overflowY = '';
      }
    }
  });
  const handleKeydown = (event: KeyboardEvent) => {
    // Only the most recently opened modal reacts, so nested modals close one at a time.
    if (event.key !== 'Escape' || !open || [...modalCounter].at(-1) !== id) return;
    event.preventDefault();
    onClose?.();
  };

  onMount(() => {
    return () => {
      modalCounter.delete(id);
      if (modalCounter.size === 0) {
        document.documentElement.style.scrollbarGutter = '';
        document.documentElement.style.overflowY = '';
      }
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet modalBase()}
  <div
    role="dialog"
    aria-modal="true"
    class={twMerge(
      'fixed inset-0 z-1000000 flex items-center justify-center overscroll-none bg-black/50 p-5',
      clsx(propsClass),
    )}
    transition:fade={{
      duration: defaultTransitionDurationMs,
    }}
  >
    <button
      class="fixed inset-0 -z-1 h-full w-full overscroll-none opacity-0"
      onclick={onClose}
      tabindex="-1"
      aria-label={m['action.close']()}
    ></button>
    {@render children()}
  </div>
{/snippet}

{#if open}
  {#if usePortal}
    <div use:portal={portalTarget}>
      {@render modalBase()}
    </div>
  {:else}
    {@render modalBase()}
  {/if}
{/if}
