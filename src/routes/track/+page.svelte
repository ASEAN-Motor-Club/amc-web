<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import SelectTrack from '$lib/components/TrackEditor/Editor/SelectTrack.svelte';
  import type { Track } from '$lib/schema/track';
  import { m } from '$lib/paraglide/messages';
  import { getTrackDataContext } from './+layout.svelte';

  const trackData = getTrackDataContext();

  const handleSelect = (track: Track | undefined) => {
    trackData.value = track;
    const params = page.url.searchParams.toString();
    goto('/track/edit' + (params && `?${params}`));
  };
</script>

<svelte:head>
  <title
    >{m['track_editor.head']({
      siteName: m['site_name_short'](),
    })}</title
  >
</svelte:head>

<SelectTrack onSelect={handleSelect} />
