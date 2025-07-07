<script lang="ts">
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  let show = $state(true);

  onMount(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        show = false;
      } else {
        show = true;
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });
</script>

{#if show}
  <div
    class="bottom-13 absolute flex animate-bounce"
    transition:fade={{ duration: defaultTransitionDurationMs }}
  >
    <Icon class="i-material-symbols:keyboard-double-arrow-down-rounded" size="lg" />
  </div>
{/if}
