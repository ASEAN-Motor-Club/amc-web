<script lang="ts">
  import { page } from '$app/state';
  import Collapsible from '$lib/components/Map/Collapsible/Collapsible.svelte';
  import Map from '$lib/components/Map/Map/Map.svelte';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import { isSm } from '$lib/utils/media.svelte';
  import { fade } from 'svelte/transition';

  const { children } = $props();

  const showFull = $derived.by(() => {
    const path = page.url.pathname.split('/')[1];
    return ['housing', 'jobs', 'delivery'].includes(path);
  });

  const validOpenCollapsible = $derived.by(() => {
    const menu = (clientSearchParamsGet('menu') ?? '').split('/')[0];
    return ['housing', 'jobs', 'delivery'].includes(menu);
  });
</script>

<div class="relative flex h-full w-full">
  <div class="flex h-full w-full flex-1 overflow-hidden pb-12 sm:pb-0">
    {#if !(showFull || (!isSm.current && validOpenCollapsible))}
      <div
        class="flex h-full w-full sm:min-w-60"
        transition:fade={{ duration: defaultTransitionDurationMs }}
      >
        <Map />
      </div>
    {/if}
  </div>

  <Collapsible />
</div>

{@render children()}
