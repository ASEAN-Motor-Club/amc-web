<script lang="ts">
  import { setLocale } from '$lib/paraglide/runtime';
  import { m } from '$lib/paraglide/messages.js';
</script>

<h1>{m.hello_world({ name: 'SvelteKit User' })}</h1>
<div>
  <button onclick={() => setLocale('en')}>en</button>
  <button onclick={() => setLocale('th')}>th</button>
  <button onclick={() => setLocale('ms')}>ms</button>
  <button onclick={() => setLocale('id')}>id</button>
  <button onclick={() => setLocale('vi')}>vi</button>
  <button onclick={() => setLocale('tl')}>tl</button>
</div>
<p>
  If you use VSCode, install the <a
    href="https://marketplace.visualstudio.com/items?itemName=inlang.vs-code-extension"
    target="_blank">Sherlock i18n extension</a
  > for a better i18n experience.
</p>
