<script lang="ts">
  import { goto } from '$app/navigation';
  import SelectTrack from '#lib/components/TrackEditor/Editor/SelectTrack.svelte';
  import type { Track } from '#lib/schema/track.js';
  import { m } from '#messages';
  import { trackData } from '#lib/components/TrackEditor/trackData.svelte.js';
  import { clientSearchParams } from '#lib/utils/clientSearchParamsGet.js';

  const title = $derived(
    m['track_editor.head']({
      siteName: m.site_name_short(),
    }),
  );

  const handleSelect = (track: Track | undefined) => {
    trackData.value = track;
    const params = clientSearchParams();
    goto('/track/edit' + (params && `?${params}`));
  };
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<SelectTrack onSelect={handleSelect} />
