<script lang="ts">
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { UIEventHandler } from 'svelte/elements';
  import { fade } from 'svelte/transition';

  export interface ScrollHintProps {
    fixed?: boolean;
  }

  const { fixed = false }: ScrollHintProps = $props();

  let show = $state(true);

  const handleScroll: UIEventHandler<Window> = (e) => {
    if (e.currentTarget.scrollY > 0) {
      show = false;
    } else {
      show = true;
    }
  };
</script>

<svelte:window onscroll={handleScroll} />

{#if show}
  <div
    class={[
      'bottom-1 left-1/2 z-20 flex -translate-x-1/2 animate-bounce',
      fixed ? 'fixed' : 'absolute',
    ]}
    transition:fade={{ duration: defaultTransitionDurationMs }}
  >
    <Icon
      class="i-material-symbols:keyboard-arrow-down-rounded text-text dark:text-text-dark"
      size="lg"
    />
  </div>
{/if}
