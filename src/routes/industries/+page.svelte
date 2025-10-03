<script>
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import NotFinished from '$lib/components/NotFinished/NotFinished.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';

  const title = $derived(
    siteLocale.msg['industries.head']({
      siteName: siteLocale.msg.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<CommonHead>{siteLocale.msg['industries.title']()}</CommonHead>
<NotFinished />
