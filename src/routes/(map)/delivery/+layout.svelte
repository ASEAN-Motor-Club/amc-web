<script lang="ts">
  import { siteLocale } from '$lib/components/Locale/locale.svelte';

  const { children } = $props();
  const title = $derived(
    siteLocale.msg['delivery.head']({
      siteName: siteLocale.msg.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

{@render children()}
