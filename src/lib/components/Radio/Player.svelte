<script lang="ts">
  import '@fontsource-variable/noto-sans-mono';
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Slider from '$lib/ui/Slider/Slider.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import PlayerWaveform from './PlayerWaveform.svelte';
  import { getGlobalPlayerContext } from './GlobalPlayer/context';
  import { createFrequencyBands } from './GlobalPlayer/frequency.svelte';

  /** Loudness is 0–1; these turn it into a subtle bulge and wobble of the speaker grill. */
  const MAX_GRILL_GROWTH = 0.42;
  const MAX_GRILL_WOBBLE_DEG = 17;

  const playerContext = getGlobalPlayerContext();
  const spectrum = createFrequencyBands(() => playerContext.analyser, 1);

  const grillScale = $derived(1 + spectrum.average * MAX_GRILL_GROWTH);
  const grillRotate = $derived((Math.random() - 0.5) * spectrum.average * MAX_GRILL_WOBBLE_DEG);
</script>

<div
  class="mx-auto flex h-auto w-full max-w-175 flex-col overflow-hidden rounded-lg border-3 border-[#5a2c00] bg-[#8b4513] shadow-lg shadow-gray-950/30"
>
  <div
    class="border-b-2 border-gray-950/20 bg-[#5a2c00] px-4 py-1.5 text-center font-medium text-[#d2b48c] shadow-lg"
  >
    {m['radio.station_name']()}
  </div>

  <div class="flex flex-1 flex-col bg-[#d2b48c] md:flex-row">
    <div
      class="aspect-2 md:aspect-1 flex h-full flex-[1_0_auto] items-center justify-center bg-[#6b3410] [background-image:linear-gradient(135deg,#a58a69_0%,#8a6f52_20%,#a58a69_40%,#8a6f52_60%,#a58a69_80%,#8a6f52_100%)] p-4"
    >
      <div
        class="bg-background-950 relative aspect-square h-[85%] origin-center overflow-hidden rounded-full border-3 border-solid border-[#555] bg-linear-to-b from-[#333] to-[#111] [box-shadow:inset_0_0_10px_rgba(0,0,0,0.5)] ease-out before:absolute before:inset-0 before:[background-image:repeating-linear-gradient(0deg,#444,#444_2px,transparent_2px,transparent_7px),repeating-linear-gradient(90deg,#444,#444_2px,transparent_2px,transparent_7px)] before:content-[''] motion-safe:transition-transform"
        style:transform={`rotate(${grillRotate}deg) scale(${grillScale})`}
      ></div>
    </div>

    <div class="flex flex-1 flex-col p-4">
      <div
        class="mb-4 flex min-h-25 flex-grow-1 overflow-hidden rounded-md border-2 border-[#5a2c00] shadow-sm shadow-gray-950/50"
      >
        {#if playerContext.analyser}
          <PlayerWaveform analyser={playerContext.analyser} />
        {/if}
      </div>
      <Button
        onClick={playerContext.togglePlay}
        class="mb-4 bg-[#5a2c00] hover:bg-[color-mix(in_oklab,#5a2c00_90%,white)] active:bg-[color-mix(in_oklab,#5a2c00_95%,black)]"
        color="custom"
      >
        {#snippet prependIcon()}
          {#if playerContext.isPlaying}
            <Icon class="i-material-symbols:pause-rounded" />
          {:else}
            <Icon class="i-material-symbols:play-arrow-rounded" />
          {/if}
        {/snippet}
        {playerContext.isPlaying ? m['radio.pause']() : m['radio.play']()}
      </Button>
      <Slider
        value={playerContext.volume}
        onChange={playerContext.changeVolume}
        name="radio_volume"
        min={0}
        max={1}
        size="sm"
        class="w-full"
        color="custom"
        trackClass="bg-[color-mix(in_oklab,#5a2c00_60%,white)]"
        progressedTrackClass="bg-[color-mix(in_oklab,#5a2c00_90%,white)]"
        knobClass="bg-[#5a2c00] hover:bg-[color-mix(in_oklab,#5a2c00_90%,white)]"
      />
    </div>
  </div>
</div>
