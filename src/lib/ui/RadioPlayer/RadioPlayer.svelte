<script lang="ts">
  import { onMount } from 'svelte';
  import type { ChangeEventHandler, ClassValue } from 'svelte/elements';

  export type RadioPlayerProps = {
    /**
     * CSS class to apply to the radio player component
     */
    class?: ClassValue;
    /**
     * The URL of the radio stream to play.
     */
    streamUrl: string;
    /**
     * The key used to store the volume in localStorage.
     * @default 'defaultRadio'
     */
    storageKey?: string;
  };

  const { streamUrl, storageKey = 'defaultRadio', class: className }: RadioPlayerProps = $props();

  const realStorageKey = $derived(`radio__${storageKey}__volume`);

  let playing = $state(false);
  let volume = $state(1);
  let stalled = $state(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let buffering = $state(false);

  let stalledDelay: ReturnType<typeof setTimeout> | undefined;
  let audio: HTMLAudioElement;

  onMount(() => {
    audio = new Audio();
    audio.pause();
    volume = parseFloat(localStorage.getItem(realStorageKey) || '1');
    audio.volume = volume;

    const changeSrc = () => {
      audio.src = streamUrl + '?t=' + Date.now();
      if (playing) {
        audio.play();
      }
    };

    const handleStalled = (_: Event) => {
      stalled = true;
      stalledDelay = setTimeout(changeSrc, 1000);
    };

    const handleCanPlay = () => {
      buffering = false;
    };

    const handleError = (event: Event) => {
      console.error('Audio error:', event);
      if (stalled) {
        clearTimeout(stalledDelay);
        stalledDelay = setTimeout(changeSrc, 1000);
      }
    };

    const handlePlaying = () => {
      stalled = false;
      buffering = false;
    };

    audio.addEventListener('stalled', handleStalled, { passive: true });
    audio.addEventListener('canplay', handleCanPlay, { passive: true });
    audio.addEventListener('error', handleError, { passive: true });
    audio.addEventListener('playing', handlePlaying, { passive: true });

    return () => {
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('playing', handlePlaying);

      // why do I need to manually stop the audio, wth
      audio.pause();
      audio.src = '';

      clearTimeout(stalledDelay);
      stalledDelay = undefined;
    };
  });

  const togglePlay = () => {
    if (audio.paused) {
      audio.src = streamUrl + '?t=' + Date.now();
      audio.play();
      playing = true;
      buffering = true;
    } else {
      audio.pause();
      playing = false;
    }
  };

  const updateVolume: ChangeEventHandler<HTMLInputElement> = (event) => {
    const target = event.currentTarget;
    volume = parseFloat(target.value);
    audio.volume = volume;
    localStorage.setItem(realStorageKey, volume.toString());
  };
</script>

<button onclick={togglePlay} class={['text-blue-600 dark:text-red-600', className]}>
  {playing ? '⏸️' : '▶️'}
</button>
<input type="range" min="0" max="1" step="0.01" value={volume} oninput={updateVolume} />
