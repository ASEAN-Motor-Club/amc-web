<script lang="ts">
  import { type Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import Portal from 'svelte-portal';
  import type { ClassValue } from 'svelte/elements';
  import { defaultTransitionDurationMs } from '$lib/tw-var';

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
</script>

{#if portal}
  <Portal target={portalTarget}>
    {#if open}
      <div
        class={[
          'z-1000000 fixed inset-0 flex items-center justify-center bg-black/20 p-5',
          propsClassName,
        ]}
        transition:fade={{
          duration: defaultTransitionDurationMs,
        }}
      >
        <button
          class="-z-1 fixed inset-0 h-full w-full opacity-0"
          onclick={onClose}
          aria-label="Close modal"
        ></button>
        {@render children()}
      </div>
    {/if}
  </Portal>
{:else if open}
  <div
    class={[
      'z-1000000 fixed inset-0 flex items-center justify-center bg-black/20 p-5',
      propsClassName,
    ]}
    transition:fade={{
      duration: 150,
    }}
  >
    <button
      class="-z-1 fixed inset-0 h-full w-full opacity-0"
      onclick={onClose}
      aria-label="Close modal"
    ></button>
    {@render children()}
  </div>
{/if}
