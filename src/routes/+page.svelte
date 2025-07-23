<script lang="ts">
  import ScrollHint from '$lib/components/Home/ScrollHint.svelte';
  import { m } from '$lib/paraglide/messages';
  import { SvelteDate } from 'svelte/reactivity';
  import posterVid from '$lib/assets/videos/background_trailer.mp4';
  import Button from '$lib/ui/Button/Button.svelte';
  import { PUBLIC_DISCORD_LINK } from '$env/static/public';

  const date = new SvelteDate();

  const year = $derived(date.getFullYear());
</script>

<svelte:head>
  <title>{m['site_name']()}</title>
</svelte:head>

<div class="flex w-full flex-col items-center">
  <div class="relative -mt-16 h-dvh w-full pt-16">
    <div class="relative flex h-full w-full justify-center bg-black">
      <video
        autoplay
        loop
        muted
        class="absolute z-0 h-full w-full object-cover"
        src={posterVid}
        playsinline
      >
      </video>
      <div class="z-1 absolute h-full w-full bg-black/50"></div>
      <div class="max-w-340 z-10 flex h-full w-full flex-col justify-center px-8 py-16">
        <div class="dark mb-4 flex justify-center sm:justify-start">
          <Button
            variant="outlined"
            href="/map"
            size="xs"
            round
            class="backdrop-blur-xs h-6 px-2.5 font-medium"
            color="success"
            tag="a"
          >
            <div class="aspect-1 mr-2 w-2 rounded-full bg-[currentColor]"></div>
            {m['home.live_server_no_count']()}
          </Button>
        </div>
        <h1
          class="z-100 text-text-dark font-sans-alt pointer-events-none mb-4 select-none text-center text-7xl sm:mb-9 sm:text-left sm:text-8xl lg:text-9xl"
        >
          {m['site_name']()}
        </h1>
        <div class="sm:mb-15 mb-6 flex flex-wrap justify-center gap-1.5 sm:justify-start">
          <Button
            variant="contained"
            target="_blank"
            size="xs"
            round
            class="pointer-events-none h-6 px-2.5 font-medium"
            tag="div">{m['home.regular_events']()}</Button
          >
          <Button
            variant="contained"
            target="_blank"
            size="xs"
            round
            class="pointer-events-none h-6 px-2.5 font-medium"
            tag="div">{m['home.ig_live_radio']()}</Button
          >
          <Button
            variant="contained"
            target="_blank"
            size="xs"
            round
            class="pointer-events-none h-6 px-2.5 font-medium"
            tag="div">{m['home.ig_bot']()}</Button
          >
        </div>
        <div class="flex justify-center gap-2 sm:justify-start">
          <div class="rounded-md bg-black">
            <Button
              variant="contained"
              class=" !bg-[#5865f2] hover:!bg-[#5865f2]/80"
              tag="a"
              href={PUBLIC_DISCORD_LINK}
              target="_blank">{m['home.join_discord']()}</Button
            >
          </div>
          <Button
            variant="outlined"
            tag="a"
            href="/radio"
            class="!bg-text-dark/10 !border-text-dark/40 !text-text-dark !hover:bg-text-dark/15 backdrop-blur-xs"
            >{m['home.listen_radio']()}</Button
          >
        </div>
      </div>
    </div>
    <ScrollHint />
  </div>
  <div
    class="max-w-340 -mt-16 grid min-h-dvh w-full items-center gap-8 px-8 py-16 pt-32 sm:px-16 md:grid-cols-2"
  >
    <div>
      <h2 class="font-sans-alt mb-3 text-2xl tracking-wide">{m['home.desc_title']()}</h2>
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
