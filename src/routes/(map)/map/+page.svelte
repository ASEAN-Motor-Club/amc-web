<script lang="ts">
  import { m } from '#messages';
  const title = $derived(
    m['map.head']({
      siteName: m.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
</svelte:head>

<!-- The map itself is drawn by the layout; the page contributes its heading for assistive tech. -->
<h1 class="sr-only">{m['navbar.map']()}</h1>
