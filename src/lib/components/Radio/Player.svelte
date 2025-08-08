<script lang="ts">
  import { onMount } from 'svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import { startNowPlayingPolling, getStreamUrl } from '$lib/api/radio';
  import Button from '$lib/ui/Button/Button.svelte';
  import Slider from '$lib/ui/Slider/Slider.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import PlayerWaveform from './PlayerWaveform.svelte';

  interface Props {
    stationName: string;
  }

  const VOLUME_STORAGE_KEY = 'radioVolume';

  const { stationName }: Props = $props();

  let audio: HTMLAudioElement;
  let isPlaying = $state<boolean | null>(false);

  let volume = $state(1);

  onMount(() => {
    volume = +(localStorage.getItem(VOLUME_STORAGE_KEY) ?? 1);
  });

  // Web Audio API variables
  let audioCtx: AudioContext;
  let analyser: AnalyserNode | null = $state(null);

  // Track state
  let currentTrack = $state<string>('Loading...');

  // Restart mechanism
  let restartTimeout: ReturnType<typeof setTimeout> | undefined;

  // Stream
  let streamUrl = $state(getStreamUrl());

  function handleAudioStall() {
    if (isPlaying) {
      console.warn(`Audio stalled. Attempting restart`);
      restartAudio();
    }
  }

  function handleAudioError(event: Event) {
    if (isPlaying) {
      console.warn(`Audio error occurred. Attempting restart`, event);
      restartAudio();
    }
  }

  function restartAudio() {
    clearTimeout(restartTimeout);
    restartTimeout = setTimeout(() => {
      if (isPlaying) {
        audio.load();
        audio.play();
      }
    }, 1000);
  }

  onMount(() => {
    audio.volume = volume;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0;

    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const stopPolling = startNowPlayingPolling((track) => {
      currentTrack = track;
    });

    // Add audio event listeners for restart mechanism
    audio.addEventListener('stalled', handleAudioStall);
    audio.addEventListener('error', handleAudioError);

    return () => {
      stopPolling();
      audioCtx?.close();
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
      audio.removeEventListener('stalled', handleAudioStall);
      audio.removeEventListener('error', handleAudioError);
    };
  });

  function togglePlay() {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!isPlaying) {
      audio.play().catch(() => {
        handleAudioError(new Event('error'));
      });
    } else {
      audio.pause();
      streamUrl = getStreamUrl();
    }
    isPlaying = !isPlaying;
  }

  function onVolume(value: number) {
    audio.volume = +value;
    localStorage.setItem(VOLUME_STORAGE_KEY, value.toString());
    volume = value;
  }

  let grillTranslateX = $state(0);
  let grillTranslateY = $state(0);
  let grillRotate = $state(0);
  let grillScale = $state(1);

  function handleGrillVolume(vol: number) {
    const volume = vol;
    grillScale = 1 + volume / 400;
    const vibrationIntensity = volume / 200;
    grillTranslateX = (Math.random() - 0.5) * vibrationIntensity;
    grillTranslateY = (Math.random() - 0.5) * vibrationIntensity;
    grillRotate = (Math.random() - 0.5) * vibrationIntensity * 2;
  }
</script>

<div
  class="border-3 border-3 max-w-175 mx-auto flex h-auto w-full flex-col overflow-hidden rounded-lg border-[#5a2c00] bg-[#8b4513] shadow-lg shadow-black/30"
>
  <div
    class="border-b-2 border-black/20 bg-[#5a2c00] px-4 py-1.5 text-center font-medium text-[#d2b48c] shadow-lg"
  >
    {stationName}
  </div>

  <div class="flex flex-1 flex-col bg-[#d2b48c] md:flex-row">
    <div
      class="aspect-3 md:aspect-1 flex h-full flex-[1_0_auto] items-center justify-center bg-[#6b3410] p-4 [background-image:linear-gradient(135deg,#a58a69_0%,#8a6f52_20%,#a58a69_40%,#8a6f52_60%,#a58a69_80%,#8a6f52_100%)]"
    >
      <div
        class="border-3 bg-background-950 bg-linear-to-b relative aspect-square h-[85%] overflow-hidden rounded-full border-solid border-[#555] from-[#333] to-[#111] transition-transform duration-100 ease-out [box-shadow:inset_0_0_10px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:content-[''] before:[background-image:repeating-linear-gradient(0deg,#444,#444_2px,transparent_2px,transparent_7px),repeating-linear-gradient(90deg,#444,#444_2px,transparent_2px,transparent_7px)]"
        style:transform={`translate(${grillTranslateX}px, ${grillTranslateY}px) rotate(${grillRotate}deg) scale(${grillScale})`}
      ></div>
    </div>

    <div class="flex flex-1 flex-col p-4">
      <div
        class="flex-grow-1 mb-2.5 flex min-h-40 overflow-hidden rounded-md border-2 border-[#5a2c00] bg-black shadow-lg shadow-black/50"
      >
        {#if analyser}
          <PlayerWaveform {analyser} grillVolume={(vol) => handleGrillVolume(vol)} />
        {/if}
      </div>
      <div
        class="flex flex-col items-center justify-center rounded-md bg-[#5a2c00] p-3 text-[#d2b48c] shadow-lg shadow-black/40"
      >
        <div
          class="mb-2.5 text-center font-mono text-sm text-[#aaffaa] [text-shadow:0_0_5px_rgba(170,255,170,0.7)]"
        >
          {currentTrack}
        </div>
        <Button onClick={togglePlay} class="mb-3" color="info">
          {#snippet appendIcon()}
            {#if isPlaying}
              <Icon class="i-material-symbols:pause-rounded" />
            {:else}
              <Icon class="i-material-symbols:play-arrow-rounded" />
            {/if}
          {/snippet}
          {isPlaying ? msg['radio.pause']() : msg['radio.play']()}
        </Button>
        <Slider
          value={volume}
          onChange={(value) => onVolume(value)}
          name="radio_volume"
          min={0}
          max={1}
          size="sm"
          class="w-full"
          color="info"
        />
      </div>
    </div>
  </div>

  <audio bind:this={audio} src={streamUrl} preload="none" crossorigin="anonymous"></audio>
</div>
