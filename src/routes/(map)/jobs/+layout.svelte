<script lang="ts">
  import { censored } from '$lib/censored.svelte';
  import { m as msg } from '$lib/paraglide/messages';

  const { children } = $props();
  const title = $derived(
    censored.c
      ? msg['jobs.head_c']({
          siteName: msg.site_name_short(),
        })
      : msg['jobs.head']({
          siteName: msg.site_name_short(),
        }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

{@render children()}
