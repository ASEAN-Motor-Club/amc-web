<script>
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import NotFinished from '$lib/components/NotFinished/NotFinished.svelte';
  import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
  <title>{m['radio.head']({ siteName: m['site_name_short']() })}</title>
</svelte:head>

<CommonHead>{m['radio.title']()}</CommonHead>
<NotFinished />
