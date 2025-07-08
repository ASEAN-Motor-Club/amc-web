<!-- PlayerWaveform.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    analyser: AnalyserNode;
    width: number;
    height: number;
    grillScale(scale: number): void;
  }

  let { analyser, width, height, grillScale }: Props = $props();

  let canvas: HTMLCanvasElement;
  let animationId: number;
  let pixelRatio: number = 1;

  onMount(() => {
    // Get device pixel ratio
    pixelRatio = window.devicePixelRatio || 1;

    // Set canvas dimensions accounting for pixel ratio
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) {
      console.error('Failed to get 2D context');
      return;
    }

    const ctx = maybeCtx;

    // Scale drawing context to match pixel ratio
    ctx.scale(pixelRatio, pixelRatio);

    // Initialize analyzer data arrays
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const waveformData = new Uint8Array(analyser.fftSize);

    function draw() {
      animationId = requestAnimationFrame(draw);

      // 1. Get frequency data for volume
      analyser.getByteFrequencyData(frequencyData);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += frequencyData[i];
      }
      const averageVolume = sum / bufferLength;
      const scale = 1 + averageVolume / 400;
      grillScale(scale);

      // 2. Draw the waveform
      analyser.getByteTimeDomainData(waveformData);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.font = 'bold 180px Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = width / 2;
      const cy = height / 2;
      ctx.fillStyle = '#222';
      ctx.fillText('AMC', cx, cy);

      ctx.globalCompositeOperation = 'source-in';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'hsl(200, 100%, 70%)';

      ctx.beginPath();
      const slice = width / waveformData.length;
      let x = 0;

      for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] / 128; // Convert to 0-1 range
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += slice;
      }

      ctx.stroke();
      ctx.restore();
    }

    draw();
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
  });
</script>

<canvas bind:this={canvas} class="max-h-30 max-w-85 block h-auto w-full"></canvas>
