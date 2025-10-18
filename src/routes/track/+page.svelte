<script lang="ts">
  import { goto } from '$app/navigation';
  import SelectTrack from '$lib/components/TrackEditor/Editor/SelectTrack.svelte';
  import type { Track } from '$lib/schema/track';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { trackData } from '$lib/components/TrackEditor/trackData.svelte';
  import { clientSearchParams } from '$lib/utils/clientSearchParamsGet';

  const title = $derived(
    siteLocale.msg['track_editor.head']({
      siteName: siteLocale.msg.site_name_short(),
    }),
  );

  const handleSelect = (track: Track | undefined) => {
    trackData.value = track;
    const params = clientSearchParams().toString();
    goto('/track/edit' + (params && `?${params}`));
  };
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<SelectTrack onSelect={handleSelect} />
