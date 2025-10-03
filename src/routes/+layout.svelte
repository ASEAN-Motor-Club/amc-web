<script lang="ts">
  import 'virtual:uno.css';
  import '../app.css';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Navbar from '$lib/components/Navbar/Navbar.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { onMount } from 'svelte';
  import { colorBackground100, colorBackground900, defaultTransitionDurationMs } from '$lib/tw-var';
  import { fade } from 'svelte/transition';
  import { page } from '$app/state';
  import GlobalPlayer from '$lib/components/Radio/GlobalPlayer/GlobalPlayer.svelte';
  import poster909 from '$lib/assets/images/poster/png/asean_poster_w909.png';

  const { children } = $props();

  let color = $state<string | undefined>();

  onMount(() => {
    document.documentElement.lang = siteLocale.l;

    const updateThemeColor = () => {
      const isDark = document.documentElement.classList.contains('dark');
      color = isDark ? colorBackground900 : colorBackground100;
    };

    updateThemeColor();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateThemeColor();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  });
</script>

<svelte:head>
  <meta name="description" content={siteLocale.msg['home.desc_title']()} />
  <meta
    name="theme-color"
    content={color ?? colorBackground100}
    media="(prefers-color-scheme: light)"
  />
  <meta
    name="theme-color"
    content={color ?? colorBackground900}
    media="(prefers-color-scheme: dark)"
  />

  <meta property="og:site_name" content={siteLocale.msg.site_name()} />
  <meta property="og:description" content={siteLocale.msg['home.desc_title']()} />
  <meta property="og:image" content={poster909} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="og:type" content="website" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content={siteLocale.msg.site_name_short()} />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-status-bar-style" content="default" />
  <meta name="mobile-web-app-title" content={siteLocale.msg.site_name_short()} />
</svelte:head>

<GlobalPlayer>
  <MsgModal>
    <Navbar />
    {#key page.route.id}
      <main class="h-full min-h-dvh pt-16" in:fade={{ duration: defaultTransitionDurationMs * 3 }}>
        {@render children()}
      </main>
    {/key}
  </MsgModal>
</GlobalPlayer>
