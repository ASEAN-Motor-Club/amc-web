<script lang="ts">
  import { m } from '$messages';
  const title = $derived(
    m['map.head']({
      siteName: m.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<!-- will be handled by layout -->
