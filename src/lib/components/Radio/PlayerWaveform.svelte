<script lang="ts">
  import { colorNeutral400 } from '$lib/tw-var';
  import { devicePixelRatio } from 'svelte/reactivity/window';
  import { prefersReducedMotion } from 'svelte/motion';
  import { expoOut } from 'svelte/easing';

  const sampleInterval = 1000 / 30;
  const antiDecayRate = -2;

  interface Props {
    analyser: AnalyserNode;
  }

  let { analyser }: Props = $props();

  let canvasCover: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  $effect(() => {
    const pixelRatio = devicePixelRatio.current || 1;
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) {
      console.error('Failed to get 2D context');
      return;
    }

    const ctx = maybeCtx;
    const waveData = new Float32Array(analyser.fftSize);
    const prevWaveData = new Float32Array(analyser.fftSize);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      const dpr = pixelRatio;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    });

    observer.observe(canvasCover);

    let lastTime = 0;
    let lastSampleTime = 0;
    let animationId: number;
    function draw(timestamp: number) {
      animationId = requestAnimationFrame(draw);

      const deltaTime = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const decayWeight = Math.exp(antiDecayRate * deltaTime);

      const { clientWidth: width, clientHeight: height } = canvas;
      if (width === 0 || height === 0) return;

      if (timestamp - lastSampleTime >= sampleInterval) {
        analyser.getFloatTimeDomainData(waveData);
        lastSampleTime = timestamp;
      }

      for (let i = 0; i < waveData.length; i++) {
        prevWaveData[i] = prevWaveData[i] * decayWeight + waveData[i] * (1 - decayWeight);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = colorNeutral400;
      ctx.beginPath();

      const sliceWidth = width / (prevWaveData.length - 1);
      let x = 0;

      for (let i = 0; i < prevWaveData.length; i++) {
        const v = expoOut(Math.abs(prevWaveData[i])) * Math.sign(prevWaveData[i]);

        const y = height / 2 + (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();
    }

    if (!prefersReducedMotion.current) {
      requestAnimationFrame(draw);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationId);
    };
  });
</script>

<div class="relative w-full" bind:this={canvasCover}>
  <canvas bind:this={canvas} class="absolute block h-full w-full" width="0" height="0"></canvas>
</div>
