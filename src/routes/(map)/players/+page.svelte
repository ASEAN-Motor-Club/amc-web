<script lang="ts">
  import { m } from '#messages';
  const title = $derived(
    m['players.head']({
      siteName: m.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
</svelte:head>

<!-- will be handled by layout -->
