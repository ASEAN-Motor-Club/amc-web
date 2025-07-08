<script>
  import NotFinished from '$lib/components/NotFinished/NotFinished.svelte';
  import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
  <title>{m['industries.head']({ siteName: m['site_name_short']() })}</title>
</svelte:head>
<NotFinished />
