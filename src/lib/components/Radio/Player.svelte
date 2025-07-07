<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import { m } from '$lib/paraglide/messages';
  import type { Snippet } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Slider from '$lib/ui/Slider/Slider.svelte';

  interface Props {
    streamUrl: string;
    stationName: string;
    playing: Snippet;
  }

  let { streamUrl, stationName = 'My Radio', playing }: Props = $props();

  const dispatch = createEventDispatcher();

  // Element bindings
  let audio: HTMLAudioElement;
  let canvas: HTMLCanvasElement;
  let grillElement: HTMLDivElement; // Bind the grill div

  const isPlaying = writable<boolean | null>(false);
  const volume = writable(1);

  // Web Audio API variables
  let audioCtx: AudioContext;
  let analyser: AnalyserNode;
  let dataArray: Uint8Array;
  let bufferLength: number;
  let animationId: number;

  onMount(() => {
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    // Use a smaller FFT size for more responsive volume detection
    analyser.fftSize = 512;
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    bufferLength = analyser.frequencyBinCount; // Use frequencyBinCount for frequency data
    dataArray = new Uint8Array(bufferLength);
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) {
      console.error('2D context not available');
      return;
    }
    const ctx = maybeCtx;

    function draw() {
      animationId = requestAnimationFrame(draw);

      // --- Grill Animation ---
      // 1. Get frequency data, which is better for detecting bass/volume changes
      analyser.getByteFrequencyData(dataArray);

      // 2. Calculate the average volume
      let sum = 0;
      for (const value of dataArray) {
        sum += value;
      }
      const averageVolume = sum / bufferLength;

      // 3. Map the volume to a subtle scale transform
      // The divisor (e.g., 400) controls the vibration intensity. Higher value = less intense.
      const scale = 1 + averageVolume / 400;
      if (grillElement) {
        grillElement.style.transform = `scale(${scale})`;
      }

      // --- Canvas Waveform (unchanged) ---
      const waveformData = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(waveformData);
      const { width, height } = canvas;
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
        const v = waveformData[i] / 128;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.stroke();
      ctx.restore();
    }
    draw();
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
    audioCtx?.close();
  });

  function togglePlay() {
    // Resume AudioContext if it was suspended
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!$isPlaying) audio.play().catch(console.error);
    else audio.pause();
    $isPlaying = !$isPlaying;
    dispatch('playstate', { isPlaying });
  }

  function onVolume(value: number) {
    audio.volume = +value;
  }
</script>

<div
  class="radio
           border-3 border-3 mx-auto
           flex max-h-screen
           w-full
           max-w-[700px] flex-col overflow-hidden rounded-[10px] rounded-lg border-[#5a2c00] bg-[#8b4513] bg-[linear-gradient(135deg,#c2a27c_0%,#a18361_20%,#c2a27c_40%,#a18361_60%,#c2a27c_80%,#a18361_100%)] shadow-[0_10px_20px_rgba(0,0,0,0.3)] md:h-auto"
>
  <div
    class="border-b-2 border-black/20 bg-[#5a2c00] px-4 py-1.5 text-center font-medium text-[#d2b48c] shadow-[inset_0_-2px_5px_rgba(0,0,0,0.2)]"
  >
    {stationName}
  </div>

  <div class="flex flex-1 flex-col bg-[#d2b48c] md:flex-row">
    <div
      class="flex h-[40vh] items-center justify-center bg-[#6b3410]
              p-4 [background-image:linear-gradient(135deg,#a58a69_0%,#8a6f52_20%,#a58a69_40%,#8a6f52_60%,#a58a69_80%,#8a6f52_100%)] md:h-auto md:flex-1
              md:border-r-2
              md:border-black/10"
    >
      <div
        bind:this={grillElement}
        class=" border-3
          bg-background-950
          relative
          aspect-square
          h-[85%]
          overflow-hidden
          rounded-full
          border-solid
          border-[#555]
          bg-gradient-to-b
          from-[#333]
          to-[#111]
          transition-transform
          duration-100
          ease-out
          [box-shadow:inset_0_0_10px_rgba(0,0,0,0.5)]
          before:absolute
          before:inset-0
          before:content-['']
          before:[background-image:repeating-linear-gradient(0deg,#444,#444_2px,transparent_2px,transparent_7px),repeating-linear-gradient(90deg,#444,#444_2px,transparent_2px,transparent_7px)]
          md:aspect-auto md:h-[85%] md:w-[85%]"
      ></div>
    </div>

    <div class="flex h-[40vh] flex-col p-4 md:h-auto md:flex-1">
      <div
        class="mb-2.5 flex h-full min-h-[150px] flex-[2] items-center justify-center overflow-hidden rounded-md border-2 border-[#5a2c00] bg-black shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
      >
        <canvas bind:this={canvas} width="400" height="250" class="block h-auto w-full"></canvas>
      </div>
      <div
        class="flex min-h-[80px] flex-1 flex-col items-center justify-center rounded-md bg-[#5a2c00] p-3 text-[#d2b48c] shadow-[inset_0_0_8px_rgba(0,0,0,0.4)]"
      >
        <div
          class="song-current mb-2.5 font-mono text-sm text-[#aaffaa] [text-shadow:0_0_5px_rgba(170,255,170,0.7)]"
        >
          {#if playing}
            {@render playing()}
          {:else}
            No track
          {/if}
        </div>
        <Button onClick={togglePlay} class="mb-3">
          {$isPlaying ? `❚❚ ${m['radio.pause']()}` : `▶ ${m['radio.play']()}`}
        </Button>
        <Slider
          value={$volume}
          onChange={(value) => onVolume(value)}
          name="radio_volume"
          min={0}
          max={1}
          size="sm"
          class="w-full"
        />
      </div>
    </div>
  </div>

  <audio bind:this={audio} src={streamUrl} preload="none" crossorigin="anonymous"></audio>
</div>
