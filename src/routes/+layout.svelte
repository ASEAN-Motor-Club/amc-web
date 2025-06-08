<script lang="ts">
  import '../app.css';
  import { locales, localizeHref } from '$lib/paraglide/runtime';
  import { page } from '$app/state';

  let { children } = $props();
</script>

{@render children()}

<div style="display:none">
  {#each locales as locale (locale)}
    <a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
  {/each}
</div>
