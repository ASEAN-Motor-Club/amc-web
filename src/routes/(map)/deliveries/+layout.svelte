<script lang="ts">
  import { m } from '#messages';

  const { children } = $props();
  const title = $derived(
    m['delivery.head']({
      siteName: m.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
</svelte:head>

{@render children()}
