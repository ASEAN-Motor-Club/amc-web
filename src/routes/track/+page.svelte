<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import SelectTrack from '$lib/components/TrackEditor/Editor/SelectTrack.svelte';
  import type { Track } from '$lib/schema/track';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { trackData } from '$lib/components/TrackEditor/trackData.svelte';

  const handleSelect = (track: Track | undefined) => {
    trackData.value = track;
    const params = page.url.searchParams.toString();
    goto('/track/edit' + (params && `?${params}`));
  };
</script>

<svelte:head>
  <title
    >{siteLocale.msg['track_editor.head']({
      siteName: siteLocale.msg['site_name_short'](),
    })}</title
  >
</svelte:head>

<SelectTrack onSelect={handleSelect} />
