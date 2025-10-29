<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  const title = $derived(
    m['players.head']({
      siteName: m.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<!-- will be handled by layout -->
