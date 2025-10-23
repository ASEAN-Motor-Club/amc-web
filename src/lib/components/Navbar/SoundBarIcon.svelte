<script lang="ts">
  import { getGlobalPlayerContext } from '../Radio/GlobalPlayer/context';

  const playerContext = getGlobalPlayerContext();

  let animationId: number;
  let barHeights = $state([0, 0, 0, 0]);

  $effect(() => {
    if (playerContext.audioContext && playerContext.analyser) {
      const freqData = new Uint8Array(playerContext.analyser.frequencyBinCount);

      // outside of bar 44 (at 64 frequencyBinCount and 48khz equal 33khz) usually contains nothing
      const binsCount = 44;
      const binsPerBar = Math.floor(binsCount / 4);

      function draw() {
        animationId = requestAnimationFrame(draw);

        if (playerContext.analyser) {
          playerContext.analyser.getByteFrequencyData(freqData);
          for (let i = 0; i < 4; i++) {
            const startBin = i * binsPerBar;
            const endBin = i === 3 ? binsCount : (i + 1) * binsPerBar;

            let sum = 0;
            const binCount = endBin - startBin;

            for (let j = startBin; j < endBin; j++) {
              sum += freqData[j];
            }
            const average = sum / binCount;

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
      <div class="min-h-0.75 w-0.75 rounded-sm bg-orange-500" style:height="{height}%"></div>
    {/each}
  </div>
</div>
