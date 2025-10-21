<script lang="ts">
  import { fade } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * Content to be wrapped
     */
    children: Snippet;
  }

  const { children }: Props = $props();
</script>

<div
  class="sm:min-w-89 lg:min-w-109 xl:min-w-129 h-full duration-150"
  transition:fade={{ duration: defaultTransitionDurationMs }}
>
  {@render children()}
</div>
