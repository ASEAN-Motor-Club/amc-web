<script lang="ts">
  import Editor from '$lib/components/TrackEditor/Editor/Editor.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
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
      ? siteLocale.msg['track_editor.head_editing']({
          routeName: trackData.value.routeName,
          siteName: siteLocale.msg.site_name_short(),
        })
      : siteLocale.msg['track_editor.head']({
          siteName: siteLocale.msg.site_name_short(),
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
