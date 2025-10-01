<script lang="ts">
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Slider from '$lib/ui/Slider/Slider.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import PlayerWaveform from './PlayerWaveform.svelte';
  import { getGlobalPlayerContext } from './GlobalPlayer/context';
  import { prefersReducedMotion } from 'svelte/motion';

  const playerContext = getGlobalPlayerContext();
  let grillRotate = $state(0);
  let grillScale = $state(1);

  let animationId: number;

  function draw() {
    animationId = requestAnimationFrame(draw);

    if (playerContext.analyser) {
      const freqData = new Uint8Array(playerContext.analyser.frequencyBinCount);
      playerContext.analyser.getByteFrequencyData(freqData);
      const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
      grillScale = 1 + avg / 600;
      grillRotate = ((Math.random() - 0.5) * avg) / 15;
    }
  }

  $effect(() => {
    if (!prefersReducedMotion.current && playerContext.analyser) {
      animationId = requestAnimationFrame(draw);
    }

    return () => {
      grillScale = 1;
      grillRotate = 0;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  });
</script>

<div
  class="border-3 border-3 max-w-175 mx-auto flex h-auto w-full flex-col overflow-hidden rounded-lg border-[#5a2c00] bg-[#8b4513] shadow-lg shadow-black/30"
>
  <div
    class="border-b-2 border-black/20 bg-[#5a2c00] px-4 py-1.5 text-center font-medium text-[#d2b48c] shadow-lg"
  >
    {siteLocale.msg['radio.station_name']()}
  </div>

  <div class="flex flex-1 flex-col bg-[#d2b48c] md:flex-row">
    <div
      class="aspect-2 md:aspect-1 flex h-full flex-[1_0_auto] items-center justify-center bg-[#6b3410] p-4 [background-image:linear-gradient(135deg,#a58a69_0%,#8a6f52_20%,#a58a69_40%,#8a6f52_60%,#a58a69_80%,#8a6f52_100%)]"
    >
      <div
        class="border-3 bg-background-950 bg-linear-to-b relative aspect-square h-[85%] origin-center overflow-hidden rounded-full border-solid border-[#555] from-[#333] to-[#111] ease-out [box-shadow:inset_0_0_10px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:content-[''] before:[background-image:repeating-linear-gradient(0deg,#444,#444_2px,transparent_2px,transparent_7px),repeating-linear-gradient(90deg,#444,#444_2px,transparent_2px,transparent_7px)] motion-safe:transition-transform"
        style:transform={`rotate(${grillRotate}deg) scale(${grillScale})`}
      ></div>
    </div>

    <div class="flex flex-1 flex-col p-4">
      <div
        class="flex-grow-1 mb-4 flex min-h-25 overflow-hidden rounded-md border-2 border-[#5a2c00] bg-black shadow-sm shadow-black/50"
      >
        {#if playerContext.analyser}
          <PlayerWaveform analyser={playerContext.analyser} />
        {/if}
      </div>
      <!-- <div
          class="mb-2.5 text-center font-mono text-sm text-[#aaffaa] [text-shadow:0_0_5px_rgba(170,255,170,0.7)]"
        >
          {currentTrack}
        </div> -->
      <Button onClick={playerContext.togglePlay} color="neutral" class="mb-4">
        {#snippet prependIcon()}
          {#if playerContext.isPlaying}
            <Icon class="i-material-symbols:pause-rounded" />
          {:else}
            <Icon class="i-material-symbols:play-arrow-rounded" />
          {/if}
        {/snippet}
        {playerContext.isPlaying ? siteLocale.msg['radio.pause']() : siteLocale.msg['radio.play']()}
      </Button>
      <Slider
        value={playerContext.volume}
        onChange={playerContext.changeVolume}
        name="radio_volume"
        min={0}
        max={1}
        size="sm"
        class="w-full"
        color="neutral"
      />
    </div>
  </div>
</div>
