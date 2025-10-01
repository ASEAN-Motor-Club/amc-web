<script lang="ts">
  import { type Snippet, onMount } from 'svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { getStreamUrl } from '$lib/api/radio';
  import { setGlobalPlayerContext } from './context';

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  const VOLUME_STORAGE_KEY = 'radioVolume';

  let audio: HTMLAudioElement;
  let isPlaying = $state<boolean>(false);

  let volume = $state(1);

  onMount(() => {
    let vol = +(localStorage.getItem(VOLUME_STORAGE_KEY) ?? 1);
    if (Number.isNaN(vol)) {
      vol = 1;
    }
    vol = Math.min(Math.max(vol, 0), 1);
    localStorage.setItem(VOLUME_STORAGE_KEY, vol.toString());
    volume = vol;
  });

  // Web Audio API variables
  let audioCtx: AudioContext;
  let analyser: AnalyserNode | null = $state(null);

  // Track state
  // let currentTrack = $state<string>('Loading...');

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

  function handlePlay() {
    isPlaying = true;
  }

  function handleAbort() {
    isPlaying = false;
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (isPlaying) {
      event.preventDefault();
      return siteLocale.msg['radio.leave_warning']();
    }
  }

  function restartAudio() {
    clearTimeout(restartTimeout);
    restartTimeout = setTimeout(() => {
      if (isPlaying) {
        audio.pause();
        streamUrl = getStreamUrl();
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

    // const stopPolling = startNowPlayingPolling((track) => {
    //   currentTrack = track;
    // });

    return () => {
      // stopPolling();
      audioCtx.close();
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
    };
  });

  function togglePlay() {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!isPlaying) {
      audio.play();
    } else {
      audio.pause();
      streamUrl = getStreamUrl();
    }
  }

  function changeVolume(value: number) {
    audio.volume = value;
    localStorage.setItem(VOLUME_STORAGE_KEY, value.toString());
    volume = value;
  }

  setGlobalPlayerContext({
    changeVolume,
    togglePlay,
    get isPlaying() {
      return isPlaying;
    },
    get volume() {
      return volume;
    },
    get analyser() {
      return analyser;
    },
  });
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

{@render children()}
<audio
  bind:this={audio}
  src={streamUrl}
  preload="none"
  crossorigin="anonymous"
  onstalled={handleAudioStall}
  onerror={handleAudioError}
  onplay={handlePlay}
  onabort={handleAbort}
  onpause={handleAbort}
></audio>
