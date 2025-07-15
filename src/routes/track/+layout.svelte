<script module lang="ts">
  import type { Track } from '$lib/schema/track';
  import { getContext, setContext } from 'svelte';

  const key = {};

  export type TrackDataContext = {
    value: Track | undefined;
  };

  export function setTrackDataContext(trackData: TrackDataContext) {
    setContext(key, trackData);
  }

  export function getTrackDataContext() {
    const context = getContext(key);
    if (context === undefined) {
      throw new Error('TrackData context not found. Make sure to set it before using.');
    }
    return context as TrackDataContext;
  }
</script>

<script lang="ts">
  let trackData = $state<TrackDataContext>({
    value: undefined,
  });

  setTrackDataContext(trackData);

  const { children } = $props();
</script>

{@render children()}
