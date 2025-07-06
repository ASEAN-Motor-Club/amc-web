<script lang="ts">
  import { type Snippet } from 'svelte';

  export type ClickAwayBlockProps = {
    /** The content to render inside the block */
    children: Snippet;
    /** Whether the check is active, usually this is based on whether the children is visible and/or focused */
    active: boolean;
    /** Event handler for click away events */
    onClickAway?: () => void;
    /** Additional elements to exclude from click away */
    additionalElements?: (Element | undefined)[];
  };

  const { children, active, onClickAway, additionalElements = [] }: ClickAwayBlockProps = $props();

  let clickAwayBlock: HTMLDivElement;

  $effect(() => {
    const closeMenu = (e: Event) => {
      if (!e.target) {
        onClickAway?.();
        return;
      }

      if (e.target !== clickAwayBlock && !clickAwayBlock.contains(e.target as Node)) {
        if (
          additionalElements.every((el) =>
            el ? e.target !== el && !el.contains(e.target as Node) : true,
          )
        ) {
          onClickAway?.();
        }
      }
    };

    if (active) {
      document.addEventListener('click', closeMenu);
    }

    return () => {
      document.removeEventListener('click', closeMenu);
    };
  });
</script>

<div class="contents" bind:this={clickAwayBlock}>{@render children()}</div>
