<script lang="ts">
  import { getGlobalPlayerContext } from '../Radio/GlobalPlayer/context';

  const playerContext = getGlobalPlayerContext();

  let animationId: number;
  let barHeights = $state([0, 0, 0, 0]);

  $effect(() => {
    if (playerContext.audioContext && playerContext.analyser) {
      const freqData = new Uint8Array(playerContext.analyser.frequencyBinCount);

      const sampleRate = playerContext.audioContext.sampleRate;
      const binSize = sampleRate / (2 * freqData.length);

      const frequencyRanges = [
        { min: 20, max: 200 }, // Bass: 20Hz-200Hz (sub-bass to bass fundamentals)
        { min: 200, max: 800 }, // Lower Mid: 200Hz-800Hz (body, warmth, male vocals)
        { min: 800, max: 3200 }, // High Mid: 800Hz-3.2kHz (clarity, female vocals, presence)
        { min: 3200, max: 8000 }, // Treble: 3.2kHz-8kHz (brightness, cymbals, air)
      ];

      const binRanges = frequencyRanges.map((range) => ({
        startBin: Math.floor(range.min / binSize),
        endBin: Math.min(Math.floor(range.max / binSize), freqData.length - 1),
      }));

      function draw() {
        console.log('draw');
        animationId = requestAnimationFrame(draw);

        if (playerContext.analyser) {
          playerContext.analyser.getByteFrequencyData(freqData);

          for (let i = 0; i < 4; i++) {
            const { startBin, endBin } = binRanges[i];

            let sum = 0;
            const binCount = endBin - startBin + 1;

            for (let j = startBin; j <= endBin; j++) {
              sum += freqData[j];
            }
            const average = binCount > 0 ? sum / binCount : 0;

            const heightPercent = (average / 255) * 100;
            barHeights[i] = heightPercent;
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  });
</script>

<div class="flex h-6 w-6 items-center justify-center">
  <div class="flex h-5 w-5 items-center justify-between">
    {#each barHeights as height, i (i)}
      <div class="w-0.75 min-h-0.75 rounded-sm bg-orange-500" style:height="{height}%"></div>
    {/each}
  </div>
</div>
