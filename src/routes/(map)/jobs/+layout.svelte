<script lang="ts">
  import { m } from '$messages';

  const { children } = $props();
  const title = $derived(
    m['jobs.head']({
      siteName: m.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

{@render children()}
