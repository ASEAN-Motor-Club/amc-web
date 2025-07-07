<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';

  export let streamUrl: string;
  export let stationName = 'My Radio';

  const dispatch = createEventDispatcher();

  // Element bindings
  let audio: HTMLAudioElement;
  let canvas: HTMLCanvasElement;
  let grillElement: HTMLDivElement; // Bind the grill div

  let isPlaying = false;
  let volume = 1;

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
    const ctx = canvas.getContext('2d')!;

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
    if (!isPlaying) audio.play().catch(console.error);
    else audio.pause();
    isPlaying = !isPlaying;
    dispatch('playstate', { isPlaying });
  }

  function onVolume(e: Event) {
    volume = +(e.target as HTMLInputElement).value;
    audio.volume = volume;
  }
</script>

<div
  class="radio-bg border-3 mx-auto flex max-h-screen w-full max-w-[700px] flex-col overflow-hidden rounded-[10px] border-[#5a2c00] shadow-[0_10px_20px_rgba(0,0,0,0.3)] md:h-auto"
>
  <div
    class="border-b-2 border-black/20 bg-[#5a2c00] px-4 py-1.5 text-center font-medium text-[#d2b48c] shadow-[inset_0_-2px_5px_rgba(0,0,0,0.2)]"
  >
    {stationName}
  </div>

  <div class="flex flex-1 flex-col bg-[#d2b48c] md:flex-row">
    <div
      class="left-half-bg flex h-[40vh] items-center justify-center p-4 md:h-auto md:flex-1 md:border-r-2 md:border-black/10"
    >
      <div bind:this={grillElement} class="grill h-[85%] md:h-[85%] md:w-[85%]"></div>
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
        <div class="song-glow mb-2.5 font-mono text-sm">
          <slot name="current">No track</slot>
        </div>
        <Button onClick={togglePlay} class="mb-3">
          {isPlaying ? `❚❚ ${m['radio.pause']()}` : `▶ ${m['radio.play']()}`}
        </Button>
        <input type="range" min="0" max="1" step="0.01" bind:value={volume} on:input={onVolume} />
      </div>
    </div>
  </div>

  <audio bind:this={audio} src={streamUrl} preload="none" crossorigin="anonymous"></audio>
</div>

<style>
  /* --- Style block is mostly unchanged, with one addition --- */

  .radio-bg {
    background:
      linear-gradient(
        135deg,
        #c2a27c 0%,
        #a18361 20%,
        #c2a27c 40%,
        #a18361 60%,
        #c2a27c 80%,
        #a18361 100%
      ),
      #8b4513;
  }
  .left-half-bg {
    background:
      linear-gradient(
        135deg,
        #c2a27c 0%,
        #a18361 20%,
        #c2a27c 40%,
        #a18361 60%,
        #c2a27c 80%,
        #a18361 100%
      ),
      #8b4513;
  }

  .grill {
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    background: linear-gradient(to bottom, #333, #111);
    border: 3px solid #555;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    position: relative;
    overflow: hidden;
    /* Add a transition for smooth scaling */
    transition: transform 0.1s ease-out;
  }
  @media (min-width: 768px) {
    .grill {
      aspect-ratio: auto;
    }
  }

  .grill::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, #444, #444 2px, transparent 2px, transparent 7px),
      repeating-linear-gradient(90deg, #444, #444 2px, transparent 2px, transparent 7px);
  }

  .song-glow {
    color: #aaffaa;
    text-shadow: 0 0 5px rgba(170, 255, 170, 0.7);
  }

  input[type='range'] {
    appearance: none;
    -webkit-appearance: none;
    width: 90%;
    height: 7px;
    background: #8b4513;
    border-radius: 5px;
    outline: none;
    transition: opacity 0.2s;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: #d2b48c;
    border: 2px solid #5a2c00;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }
  input[type='range']::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: #d2b48c;
    border: 2px solid #5a2c00;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }
</style>
