<script>
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import NotFinished from '$lib/components/NotFinished/NotFinished.svelte';
  import { m as msg } from '$lib/paraglide/messages';
</script>

<svelte:head>
  <title>{msg['industries.head']({ siteName: msg['site_name_short']() })}</title>
</svelte:head>

<CommonHead>{msg['industries.title']()}</CommonHead>
<NotFinished />
