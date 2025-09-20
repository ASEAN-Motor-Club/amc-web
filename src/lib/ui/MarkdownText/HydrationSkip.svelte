<script>
  let { markup } = $props();

  if (typeof window !== 'undefined') {
    const initial = markup;

    markup = undefined;

    $effect(() => {
      markup = initial;
    });
  }
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html markup}
