<script lang="ts">
  import ScrollHint from '$lib/components/Home/ScrollHint.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import posterVid from '$lib/assets/videos/background_trailer.mp4';
  import Button from '$lib/ui/Button/Button.svelte';
  import { PUBLIC_DISCORD_LINK, PUBLIC_PATREON_LINK } from '$env/static/public';
  import { prefersReducedMotion } from 'svelte/motion';
  import { createSvelteDate } from '$lib/svelteDate.svelte';

  const svelteDate = createSvelteDate();

  const year = $derived(svelteDate.getFullYear());

  const features = $derived([
    msg['home.friendly_community'](),
    msg['home.regular_events'](),
    msg['home.ig_live_radio'](),
    msg['home.ig_bot'](),
  ]);

  const title = $derived(msg.site_name());
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<div class="flex w-full flex-col items-center">
  <div class="relative -mt-16 h-svh w-full pt-16">
    <div class="relative flex h-full w-full justify-center bg-black">
      <video
        autoplay={!prefersReducedMotion.current}
        loop
        muted
        class="absolute z-0 h-full w-full object-cover"
        src={posterVid}
        playsinline
      >
      </video>
      <div class="absolute z-1 h-full w-full bg-black/50"></div>
      <div class="z-10 flex h-full w-full max-w-340 flex-col justify-center px-8 py-16">
        <div class="dark mb-4 flex justify-center sm:justify-start">
          <Button
            variant="outlined"
            href="/map"
            size="xs"
            round
            class="h-6 px-2.5 font-medium backdrop-blur-xs"
            color="success"
            tag="a"
          >
            <div class="relative mr-2 flex size-2">
              <div
                class="absolute size-full rounded-full bg-[currentColor] opacity-1 motion-safe:animate-ping"
              ></div>
              <div class="size-full rounded-full bg-[currentColor]"></div>
            </div>
            {msg['home.live_server_no_count']()}
          </Button>
        </div>
        <h1
          class="text-text-dark font-sans-alt pointer-events-none z-100 mb-4 text-center text-7xl select-none sm:mb-9 sm:text-left sm:text-8xl lg:text-9xl"
        >
          {msg.site_name()}
        </h1>
        <div class="mb-6 flex flex-wrap justify-center gap-1.5 sm:mb-15 sm:justify-start">
          {#each features as feature (feature)}
            <Button
              variant="contained"
              size="xs"
              round
              class="pointer-events-none h-6 px-2.5 font-medium"
              tag="div">{feature}</Button
            >
          {/each}
        </div>
        <div class="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button
            variant="contained"
            class=" bg-[#5865f2] hover:bg-[color-mix(in_oklab,#5865f2_90%,white)] active:bg-[color-mix(in_oklab,#5865f2_95%,black)]"
            tag="a"
            href={PUBLIC_DISCORD_LINK}
            target="_blank"
            rel="noreferrer">{msg['home.join_discord']()}</Button
          >
          <div class="rounded-md bg-white">
            <Button
              variant="contained"
              class=" text-text bg-[#f96854] hover:bg-[color-mix(in_oklab,#f96854_90%,white)] active:bg-[color-mix(in_oklab,#f96854_95%,black)]"
              tag="a"
              href={PUBLIC_PATREON_LINK}
              target="_blank"
              rel="noreferrer">{msg['home.join_patreon']()}</Button
            >
          </div>
          <Button
            variant="outlined"
            tag="a"
            href="/radio"
            class="!bg-text-dark/10 !border-text-dark/40 !text-text-dark !hover:bg-text-dark/12.5 backdrop-blur-xs"
            >{msg['home.listen_radio']()}</Button
          >
        </div>
      </div>
    </div>
    <div class="dark contents">
      <ScrollHint />
    </div>
  </div>
  <div
    class="-mt-16 grid min-h-svh w-full max-w-340 items-center gap-8 px-8 py-16 pt-32 sm:px-16 md:grid-cols-2"
  >
    <div>
      <h2 class="font-sans-alt mb-3 text-2xl tracking-wide">
        {msg['home.desc_title']()}
      </h2>
      <p class="text-lg">{msg['home.description']()}</p>
      <div class="text-text/75 dark:text-text-dark/75 mt-2 text-sm">
        {msg['home.copyright']({ year })}
      </div>
    </div>
    <div class="justify-self-end">
      <iframe
        title={msg['home.iframe_discord']()}
        src="https://discordapp.com/widget?id=1341775494026231859&theme=dark"
        allowtransparency
        frameborder="0"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        class="h-[50dvh] w-75 max-w-full"
        loading="lazy"
      ></iframe>
    </div>
  </div>
</div>
