<script lang="ts">
  import ScrollHint from '$lib/components/Home/ScrollHint.svelte';
  import { m } from '$lib/paraglide/messages';
  import { SvelteDate } from 'svelte/reactivity';
  import posterVid from '$lib/assets/videos/background_trailer.mp4';

  const date = new SvelteDate();

  const year = $derived(date.getFullYear());
</script>

<svelte:head>
  <title>{m['site_name']()}</title>
</svelte:head>

<div class="flex w-full flex-col items-center">
  <div class="relative -mt-16 h-dvh w-full pt-16">
    <div class="relative flex h-full w-full flex-col items-center justify-center bg-black p-8">
      <video
        autoplay
        loop
        muted
        class="z-0 absolute h-full w-full object-cover"
        src={posterVid}
        playsinline
      >
      </video>
      <div class="z-1 absolute h-full w-full bg-black/50"></div>
      <h1 class="z-100 font-cursive text-center text-6xl font-bold tracking-tight">
        {m['site_name']()}
      </h1>
    </div>

    <ScrollHint />
  </div>
  <div
    class="max-w-300 -mt-16 grid min-h-dvh items-center gap-8 px-8 py-16 pt-32 sm:px-16 md:grid-cols-2"
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
