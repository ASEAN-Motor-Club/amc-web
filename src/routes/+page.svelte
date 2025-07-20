<script lang="ts">
  import posterX10 from '$lib/assets/images/poster/asean_poster_cut_x1.avif';
  import posterX15 from '$lib/assets/images/poster/asean_poster_cut_x1.5.avif';
  import posterX20 from '$lib/assets/images/poster/asean_poster_cut_x2.avif';
  import ScrollHint from '$lib/components/Home/ScrollHint.svelte';
  import { m } from '$lib/paraglide/messages';
  import { SvelteDate } from 'svelte/reactivity';

  const date = new SvelteDate();

  const year = $derived(date.getFullYear());
</script>

<svelte:head>
  <title>{m['site_name']()}</title>
</svelte:head>

<div class="flex w-full flex-col items-center">
  <div
    class="relative flex h-dvh w-full flex-col items-center justify-center -mt-16 pt-16"
  >
    <div class="max-w-250 mx-20 mb-20 w-full px-8 sm:px-16">
      <img
        srcset={`${posterX10} 1x, ${posterX15} 1.5x, ${posterX20} 2x`}
        alt="ASEAN Poster"
        class="aspect-ratio-1818/1162 w-full object-contain"
        fetchpriority="high"
      />
    </div>

    <h1 class="font-cursive px-1 text-center text-6xl font-bold tracking-tight">
      {m['site_name']()}
    </h1>
    <ScrollHint />
  </div>
  <div
    class="max-w-300 grid min-h-dvh items-center gap-8 px-8 py-16 sm:px-16 md:grid-cols-2 -mt-16 pt-32"
  >
    <div>
      <h2 class="font-cursive mb-3 text-2xl font-semibold">{m['home.desc_title']()}</h2>
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
        loading="lazy"
      ></iframe>
    </div>
  </div>
</div>
