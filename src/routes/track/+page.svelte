<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import SelectTrack from '$lib/components/TrackEditor/Editor/SelectTrack.svelte';
  import type { TrackData } from '$lib/components/TrackEditor/types';
  import { getTrackDataContext } from './+layout.svelte';

  const trackData = getTrackDataContext();

  const handleSelect = (track: TrackData | undefined) => {
    trackData.value = track;
    const params = page.url.searchParams.toString();
    goto('/track/edit' + (params && `?${params}`));
  };
</script>

<SelectTrack onSelect={handleSelect} />
