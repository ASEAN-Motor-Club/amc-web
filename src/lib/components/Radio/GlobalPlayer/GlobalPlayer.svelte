<script lang="ts">
  import { type Snippet, onMount } from 'svelte';
  import { PUBLIC_RADIO_STREAM_URL } from '$env/static/public';
  import { m } from '$messages';
  import { setGlobalPlayerContext } from './context';

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  const VOLUME_STORAGE_KEY = 'radioVolume';
  const RECONNECT_DELAY_MS = 1_000;
  const FFT_SIZE = 128;

  let audio: HTMLAudioElement;
  let isPlaying = $state(false);
  let volume = $state(1);
  let analyser: AnalyserNode | null = $state(null);

  let audioCtx: AudioContext | undefined;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    const stored = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
    volume = Number.isFinite(stored) ? Math.min(Math.max(stored, 0), 1) : 1;
    audio.volume = volume;

    return () => {
      clearTimeout(reconnectTimeout);
      void audioCtx?.close();
    };
  });

  /**
   * Built on the first play so the context starts running instead of suspended. The element is
   * routed through the graph, which is why the stream must be CORS-readable — a tainted source
   * feeds silence to the destination.
   */
  function connectAudioGraph() {
    if (audioCtx) {
      return;
    }
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;
    audioCtx.createMediaElementSource(audio).connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function start() {
    audio.src = PUBLIC_RADIO_STREAM_URL;
    audio.play().catch((error: unknown) => {
      console.warn('Radio stream failed to start', error);
      stop();
    });
  }

  /** A live stream has no past to resume, so stopping drops the connection instead of buffering. */
  function stop() {
    clearTimeout(reconnectTimeout);
    isPlaying = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  /** `stalled` and `error` mean the connection died mid-listen; refetch the same url. */
  function reconnect() {
    if (!isPlaying) {
      return;
    }
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(start, RECONNECT_DELAY_MS);
  }

  function togglePlay() {
    if (isPlaying) {
      stop();
      return;
    }
    connectAudioGraph();
    start();
  }

  function changeVolume(value: number) {
    audio.volume = value;
    volume = value;
    localStorage.setItem(VOLUME_STORAGE_KEY, value.toString());
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (isPlaying) {
      event.preventDefault();
      return m['radio.leave_warning']();
    }
  }

  setGlobalPlayerContext({
    togglePlay,
    changeVolume,
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
  preload="none"
  crossorigin="anonymous"
  onplay={() => (isPlaying = true)}
  onpause={() => (isPlaying = false)}
  onstalled={reconnect}
  onerror={reconnect}
></audio>
