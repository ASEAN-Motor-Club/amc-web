<script>
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import NotFinished from '$lib/components/NotFinished/NotFinished.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
</script>

<svelte:head>
  <title
    >{siteLocale.msg['industries.head']({
      siteName: siteLocale.msg['site_name_short'](),
    })}</title
  >
</svelte:head>

<CommonHead>{siteLocale.msg['industries.title']()}</CommonHead>
<NotFinished />
