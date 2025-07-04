<script lang="ts">
  import poster from '$lib/assets/asean_poster.avif';
  import { m } from '$lib/paraglide/messages';
  import { SvelteDate } from 'svelte/reactivity';

  const date = new SvelteDate();

  const year = $derived(date.getFullYear());
</script>

<div class="flex w-full flex-col items-center">
  <div class="-mt-14 flex h-dvh flex-col items-center justify-center pt-14 lg:-mt-16 lg:pt-16">
    <img
      src={poster}
      alt="ASEAN Poster"
      class="max-w-250 mx-20 mb-20 w-full px-8 sm:px-16"
      fetchpriority="high"
    />
    <h1 class="text-center text-6xl font-bold">{m['site_name']()}</h1>
  </div>
  <div
    class="max-w-300 pt-30 -mt-14 grid min-h-dvh items-center gap-8 px-8 py-16 sm:px-16 md:grid-cols-2 lg:-mt-16 lg:pt-32"
  >
    <div>
      <h2 class="mb-3 text-2xl font-bold">{m['site_name']()}</h2>
      <p class="text-lg">{m['home.description']()}</p>
      <div class="text-text/75 dark:text-text-dark/75 mt-2 text-sm">
        {m['home.copyright']({ year })}
      </div>
    </div>
    <div class="justify-self-end">
      <iframe
        title="ASEAN Motor Club Discord"
        src="https://discordapp.com/widget?id=1341775494026231859&theme=dark"
        allowtransparency
        frameborder="0"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        class="w-75 h-[50dvh] max-w-full"
      ></iframe>
    </div>
  </div>
</div>
