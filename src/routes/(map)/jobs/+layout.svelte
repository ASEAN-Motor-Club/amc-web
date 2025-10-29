<script lang="ts">
  import { censored } from '$lib/censored.svelte';
  import { m } from '$lib/paraglide/messages';

  const { children } = $props();
  const title = $derived(
    censored.c
      ? m['jobs.head_c']({
          siteName: m.site_name_short(),
        })
      : m['jobs.head']({
          siteName: m.site_name_short(),
        }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

{@render children()}
