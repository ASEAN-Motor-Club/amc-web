<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    analyser: AnalyserNode;
    grillVolume(vol: number): void;
  }

  // Width and height are no longer needed as props
  let { analyser, grillVolume }: Props = $props();

  let canvasCover: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let animationId: number;

  let antiDecayRate = -8;
  let lastTime = 0;

  function scaleWave(x: number): number {
    return 1 - (1 - x) * (1 - x);
  }

  onMount(() => {
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) {
      console.error('Failed to get 2D context');
      return;
    }

    const ctx = maybeCtx;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const waveData = new Uint8Array(analyser.fftSize);
    const prevWaveData = new Float32Array(analyser.fftSize);

    // Use a ResizeObserver to automatically handle canvas sizing.
    // This is more robust than passing width/height props.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;

      // Update the canvas's internal bitmap size for high-res screens
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Scale the drawing context so we can use CSS pixels
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    });

    observer.observe(canvasCover);

    function draw(timestamp: number) {
      animationId = requestAnimationFrame(draw);

      const deltaTime = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const decayWeight = Math.exp(antiDecayRate * deltaTime);

      // On each frame, get the canvas's current CSS-driven size
      const { clientWidth: width, clientHeight: height } = canvas;
      if (width === 0 || height === 0) return; // Skip drawing if canvas is not visible

      // --- Grill Volume ---
      analyser.getByteFrequencyData(freqData);
      const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
      grillVolume(avg);

      // --- Waveform Drawing ---
      analyser.getByteTimeDomainData(waveData);

      for (let i = 0; i < waveData.length; i++) {
        const current = waveData[i] / 128.0 - 1.0;
        prevWaveData[i] = prevWaveData[i] * decayWeight + current * (1 - decayWeight);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = 'source-in';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'hsl(200, 100%, 70%)';
      ctx.beginPath();

      const sliceWidth = width / (waveData.length - 1);
      let x = 0;

      for (let i = 0; i < waveData.length; i++) {
        const v = scaleWave(Math.abs(prevWaveData[i])) * Math.sign(prevWaveData[i]);
        // Position the y-coordinate vertically centered in the canvas
        const y = height / 2 + (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();
      ctx.restore();
    }

    requestAnimationFrame(draw);

    // The onMount function can return a cleanup function
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationId);
    };
  });
</script>

<div class="relative w-full" bind:this={canvasCover}>
  <canvas bind:this={canvas} class="absolute block h-full w-full" width="0" height="0"></canvas>
</div>
