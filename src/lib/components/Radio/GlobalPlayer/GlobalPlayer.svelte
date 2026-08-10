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
  const MAX_RECONNECT_ATTEMPTS = 5;
  const FFT_SIZE = 128;

  let audio: HTMLAudioElement;
  /** Listener intent, not element state — it stays true across a reconnect. */
  let isPlaying = $state(false);
  let volume = $state(1);
  let analyser: AnalyserNode | null = $state(null);

  let audioCtx: AudioContext | undefined;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  /** Set once the stream proves unreadable cross-origin; audio still plays, visualizers don't. */
  let corsBlocked = false;

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
   * Routing the element through an analyser requires a CORS-readable stream — a tainted source
   * feeds silence to the destination — so the graph is only built once playback has proven the
   * stream readable. Doing it on the first play also starts the context running, never suspended.
   */
  function connectAudioGraph() {
    if (audioCtx || corsBlocked) {
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
    if (corsBlocked) {
      audio.removeAttribute('crossorigin');
    } else {
      audio.crossOrigin = 'anonymous';
    }
    audio.src = PUBLIC_RADIO_STREAM_URL;
    audio.play().catch((error: unknown) => {
      // A failed load already arrives through the element's error event, and reporting it twice
      // makes the retry timer abort the load it just started. Only a refused gesture is ours.
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.warn('Radio playback was blocked by the browser', error);
        stop();
      }
    });
  }

  /** A live stream has no past to resume, so stopping drops the connection instead of buffering. */
  function stop() {
    clearTimeout(reconnectTimeout);
    isPlaying = false;
    failures = 0;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  function handleFailure() {
    if (!isPlaying) {
      return;
    }

    // A stream that serves no CORS headers cannot feed the analyser; retry it as a plain source.
    if (!corsBlocked && !audioCtx) {
      corsBlocked = true;
      start();
      return;
    }

    failures += 1;
    if (failures > MAX_RECONNECT_ATTEMPTS) {
      console.warn(`Radio stream unreachable after ${MAX_RECONNECT_ATTEMPTS} attempts`);
      stop();
      return;
    }

    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(start, RECONNECT_DELAY_MS);
  }

  function handlePlaying() {
    failures = 0;
    connectAudioGraph();
  }

  function togglePlay() {
    if (isPlaying) {
      stop();
      return;
    }
    isPlaying = true;
    failures = 0;
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
  onplaying={handlePlaying}
  onstalled={handleFailure}
  onerror={handleFailure}
></audio>
