<script lang="ts">
  import Editor from '$lib/components/TrackEditor/Editor/Editor.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { m as msg } from '$lib/paraglide/messages';
  import { trackData } from '$lib/components/TrackEditor/trackData.svelte';

  onMount(() => {
    console.log(trackData.value);
    if (!trackData.value) {
      const params = page.url.searchParams.toString();
      goto('/track' + (params && `?${params}`), { replaceState: true });
    }
  });
</script>

<svelte:head>
  <title
    >{trackData.value?.routeName
      ? msg['track_editor.head_editing']({
          routeName: trackData.value.routeName,
          siteName: msg['site_name_short'](),
        })
      : msg['track_editor.head']({ siteName: msg['site_name_short']() })}</title
  >
</svelte:head>

{#if trackData.value}
  <Editor initialTrackData={trackData.value} />
{/if}
