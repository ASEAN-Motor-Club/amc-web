<script lang="ts">
  import { type Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import Portal from 'svelte-portal';
  import type { ClassValue } from 'svelte/elements';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { modalCounter } from './ModalCounter.svelte';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';

  export type ModalProps = {
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
  };

  const {
    open,
    children,
    onClose,
    portal = true,
    portalTarget = 'body',
    class: propsClassName,
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

    return () => {
      modalCounter.delete(id);
      if (modalCounter.size === 0) {
        document.documentElement.style.scrollbarGutter = '';
        document.documentElement.style.overflowY = '';
      }
    };
  });
</script>

{#snippet modalBase()}
  {#if open}
    <div
      class={twMerge(
        'z-1000000 fixed inset-0 flex items-center justify-center overscroll-none bg-black/50 p-5',
        clsx(propsClassName),
      )}
      transition:fade={{
        duration: defaultTransitionDurationMs,
      }}
    >
      <button
        class="-z-1 fixed inset-0 h-full w-full overscroll-none opacity-0"
        onclick={onClose}
        aria-label="Close modal"
      ></button>
      {@render children()}
    </div>
  {/if}
{/snippet}

{#if portal}
  <Portal target={portalTarget}>
    {@render modalBase()}
  </Portal>
{:else if open}
  {@render modalBase()}
{/if}
