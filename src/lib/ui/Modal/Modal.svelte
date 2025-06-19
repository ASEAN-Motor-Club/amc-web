<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import Portal from 'svelte-portal';
  import type { ClassValue } from 'svelte/elements';
  import { cssTimeToMs } from '$lib/utils/cssTranstionToMs';

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

  const className = $derived([
    'fixed inset-0 z-10000 flex items-center justify-center bg-black/20 p-5',
    propsClassName,
  ]);

  const buttonClassName = 'fixed inset-0 -z-1 h-full w-full opacity-0';

  let duration = $state(0);

  onMount(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    duration = cssTimeToMs(computedStyle.getPropertyValue('--default-transition-duration'));
  });
</script>

{#if portal}
  <Portal target={portalTarget}>
    {#if open}
      <div
        class={className}
        transition:fade={{
          duration,
        }}
      >
        <button class={buttonClassName} aria-hidden="true" onclick={onClose}></button>
        {@render children()}
      </div>
    {/if}
  </Portal>
{:else if open}
  <div
    class={className}
    transition:fade={{
      duration: 150,
    }}
  >
    <button class={buttonClassName} aria-hidden="true" onclick={onClose}></button>
    {@render children()}
  </div>
{/if}
