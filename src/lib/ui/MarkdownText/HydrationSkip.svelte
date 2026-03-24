<script>
  let { markup } = $props();

  if (typeof window !== 'undefined') {
    // this is a workaround so idc
    // eslint-disable-next-line svelte/no-unused-svelte-ignore
    // svelte-ignore state_referenced_locally
    const initial = markup;

    markup = undefined;

    $effect(() => {
      markup = initial;
    });
  }
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html markup}
