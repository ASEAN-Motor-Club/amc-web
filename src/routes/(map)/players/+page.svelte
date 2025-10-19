<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  const title = $derived(
    msg['players.head']({
      siteName: msg.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<!-- will be handled by layout -->
