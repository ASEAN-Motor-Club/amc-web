<script>
  import NotFinished from '$lib/components/NotFinished/NotFinished.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
</script>

<svelte:head>
  <title
    >{siteLocale.msg['industries.head']({ siteName: siteLocale.msg['site_name_short']() })}</title
  >
</svelte:head>
<NotFinished />
