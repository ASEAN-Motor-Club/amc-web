<script lang="ts">
  import Editor from '$lib/components/TrackEditor/Editor/Editor.svelte';
  import { onMount } from 'svelte';
  import { getTrackDataContext } from '../+layout.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  const trackData = getTrackDataContext();

  onMount(() => {
    if (!trackData.value) {
      const params = page.url.searchParams.toString();
      goto('/track' + (params && `?${params}`), { replaceState: true });
    }
  });
</script>

{#if trackData.value}
  <Editor initialTrackData={trackData.value} />
{/if}
