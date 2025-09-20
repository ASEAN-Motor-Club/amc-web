<script lang="ts">
  import Editor from '$lib/components/TrackEditor/Editor/Editor.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { trackData } from '$lib/components/TrackEditor/trackData.svelte';

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
      ? siteLocale.msg['track_editor.head_editing']({
          routeName: trackData.value.routeName,
          siteName: siteLocale.msg['site_name_short'](),
        })
      : siteLocale.msg['track_editor.head']({
          siteName: siteLocale.msg['site_name_short'](),
        })}</title
  >
</svelte:head>

{#if trackData.value}
  <Editor initialTrackData={trackData.value} />
{/if}
