<script lang="ts">
  import { getGlobalPlayerContext } from '../Radio/GlobalPlayer/context';
  import { createFrequencyBands } from '../Radio/GlobalPlayer/frequency.svelte';

  const BAR_COUNT = 3;
  const PERCENT = 100;

  const playerContext = getGlobalPlayerContext();
  const spectrum = createFrequencyBands(() => playerContext.analyser, BAR_COUNT);
</script>

<div class="flex h-6 w-6 items-center justify-center">
  <div class="flex h-5 w-4 items-center justify-between">
    {#each spectrum.bands as level, i (i)}
      <div class="min-h-1 w-1 rounded-sm bg-orange-500" style:height="{level * PERCENT}%"></div>
    {/each}
  </div>
</div>
