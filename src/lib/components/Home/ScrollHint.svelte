<script lang="ts">
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { UIEventHandler } from 'svelte/elements';
  import { fade } from 'svelte/transition';

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
    class="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 animate-bounce"
    transition:fade={{ duration: defaultTransitionDurationMs }}
  >
    <Icon class="i-material-symbols:keyboard-arrow-down-rounded text-text-dark" size="lg" />
  </div>
{/if}
