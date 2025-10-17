<script lang="ts">
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  const title = $derived(
    siteLocale.msg['jobs.head']({
      siteName: siteLocale.msg.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<!-- will be handled by layout -->
