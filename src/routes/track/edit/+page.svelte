<script lang="ts">
  import Editor from '$lib/components/TrackEditor/Editor/Editor.svelte';
  import { onMount } from 'svelte';
  import { getTrackDataContext } from '../+layout.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages';

  const trackData = getTrackDataContext();

  onMount(() => {
    if (!trackData.value) {
      const params = page.url.searchParams.toString();
      goto('/track' + (params && `?${params}`), { replaceState: true });
    }
  });
</script>

<svelte:head>
  <title
    >{trackData.value?.routeName
      ? m['track_editor.head_editing']({
          routeName: trackData.value.routeName,
          siteName: m['site_name_short'](),
        })
      : m['track_editor.head']({ siteName: m['site_name_short']() })}</title
  >
</svelte:head>

{#if trackData.value}
  <Editor initialTrackData={trackData.value} />
{/if}
