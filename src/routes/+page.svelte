<script lang="ts">
  import ScrollHint from '$lib/components/Home/ScrollHint.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { SvelteDate } from 'svelte/reactivity';
  import posterVid from '$lib/assets/videos/background_trailer.mp4';
  import Button from '$lib/ui/Button/Button.svelte';
  import { PUBLIC_DISCORD_LINK, PUBLIC_PATREON_LINK } from '$env/static/public';
  import { prefersReducedMotion } from 'svelte/motion';

  const date = new SvelteDate();

  $effect(() => {
    let animationId: number;

    const updateTime = () => {
      date.setTime(Date.now());
      animationId = requestAnimationFrame(updateTime);
    };

    animationId = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationId);
    };
  });

  const year = $derived(date.getFullYear());

  const features = $derived([
    siteLocale.msg['home.friendly_community'](),
    siteLocale.msg['home.regular_events'](),
    siteLocale.msg['home.ig_live_radio'](),
    siteLocale.msg['home.ig_bot'](),
  ]);

  const title = $derived(siteLocale.msg.site_name());
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
            <div class="relative mr-2 flex size-2">
              <div
                class="opacity-1 absolute size-full rounded-full bg-[currentColor] motion-safe:animate-ping"
              ></div>
              <div class="size-full rounded-full bg-[currentColor]"></div>
            </div>
            {siteLocale.msg['home.live_server_no_count']()}
          </Button>
        </div>
        <h1
          class="z-100 text-text-dark font-sans-alt pointer-events-none mb-4 select-none text-center text-7xl sm:mb-9 sm:text-left sm:text-8xl lg:text-9xl"
        >
          {siteLocale.msg.site_name()}
        </h1>
        <div class="sm:mb-15 mb-6 flex flex-wrap justify-center gap-1.5 sm:justify-start">
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
          <div class="rounded-md bg-black">
            <Button
              variant="contained"
              class=" bg-[#5865f2] hover:bg-[#5865f2]/80"
              tag="a"
              href={PUBLIC_DISCORD_LINK}
              target="_blank"
              rel="noreferrer">{siteLocale.msg['home.join_discord']()}</Button
            >
          </div>
          <div class="rounded-md bg-black">
            <Button
              variant="contained"
              class=" text-text bg-[#f96854] hover:bg-[#f96854]/80"
              tag="a"
              href={PUBLIC_PATREON_LINK}
              target="_blank"
              rel="noreferrer">{siteLocale.msg['home.join_patreon']()}</Button
            >
          </div>
          <Button
            variant="outlined"
            tag="a"
            href="/radio"
            class="!bg-text-dark/10 !border-text-dark/40 !text-text-dark !hover:bg-text-dark/12.5 backdrop-blur-xs"
            >{siteLocale.msg['home.listen_radio']()}</Button
          >
        </div>
      </div>
    </div>
    <div class="dark contents">
      <ScrollHint />
    </div>
  </div>
  <div
    class="max-w-340 -mt-16 grid min-h-svh w-full items-center gap-8 px-8 py-16 pt-32 sm:px-16 md:grid-cols-2"
  >
    <div>
      <h2 class="font-sans-alt mb-3 text-2xl tracking-wide">
        {siteLocale.msg['home.desc_title']()}
      </h2>
      <p class="text-lg">{siteLocale.msg['home.description']()}</p>
      <div class="text-text/75 dark:text-text-dark/75 mt-2 text-sm">
        {siteLocale.msg['home.copyright']({ year })}
      </div>
    </div>
    <div class="justify-self-end">
      <iframe
        title={siteLocale.msg['home.iframe_discord']()}
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
