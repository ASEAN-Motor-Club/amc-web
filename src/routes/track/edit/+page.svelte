<script lang="ts">
  import Editor from '$lib/components/TrackEditor/Editor/Editor.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { m } from '$messages';
  import { trackData } from '$lib/components/TrackEditor/trackData.svelte';
  import { clientSearchParams } from '$lib/utils/clientSearchParamsGet';

  onMount(() => {
    if (!trackData.value) {
      const params = clientSearchParams().toString();
      goto('/track' + (params && `?${params}`), { replaceState: true });
    }
  });

  const title = $derived(
    trackData.value?.routeName
      ? m['track_editor.head_editing']({
          routeName: trackData.value.routeName,
          siteName: m.site_name_short(),
        })
      : m['track_editor.head']({
          siteName: m.site_name_short(),
        }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

{#if trackData.value}
  <Editor initialTrackData={trackData.value} />
{/if}
