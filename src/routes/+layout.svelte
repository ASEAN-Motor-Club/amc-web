<script lang="ts">
  import 'virtual:uno.css';
  import '../app.css';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Navbar from '$lib/components/Navbar/Navbar.svelte';
  import { onMount } from 'svelte';
  import { colorBackground100, colorBackground900, defaultTransitionDurationMs } from '$lib/tw-var';
  import { fade } from 'svelte/transition';
  import { page } from '$app/state';
  import GlobalPlayer from '$lib/components/Radio/GlobalPlayer/GlobalPlayer.svelte';
  import splashBig from '$lib/assets/images/splash_big.jpg';
  import {
    localStorageKey,
    defineCustomClientStrategy,
    baseLocale,
    type Locale,
  } from '$lib/paraglide/runtime';
  import { m as msg } from '$lib/paraglide/messages';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { noop } from 'lodash-es';

  defineCustomClientStrategy('custom-svelteReactiveLocale', {
    getLocale: () => {
      console.log('Getting locale from siteLocale state:', siteLocale.l);
      return siteLocale.l;
    },
    setLocale: noop, // use setLocale from locale.svelte to update the state instead
  });

  const { children } = $props();

  let color = $state<string | undefined>();

  $effect(() => {
    document.documentElement.lang = siteLocale.l;
  });

  onMount(() => {
    siteLocale.l = (localStorage.getItem(localStorageKey) as Locale | null) || baseLocale;

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

  const id = $derived(page.route.id?.startsWith('/(map)') ? '/(map)' : page.route.id);
</script>

<svelte:head>
  <meta name="description" content={msg['home.desc_title']()} />
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

  <meta property="og:site_name" content={msg.site_name()} />
  <meta property="og:description" content={msg['home.desc_title']()} />
  <meta property="og:image" content={splashBig} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="og:type" content="website" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content={msg.site_name_short()} />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-status-bar-style" content="default" />
  <meta name="mobile-web-app-title" content={msg.site_name_short()} />
</svelte:head>

<GlobalPlayer>
  <MsgModal>
    <Navbar />
    {#key id}
      <main class="h-full min-h-dvh pt-16" in:fade={{ duration: defaultTransitionDurationMs * 3 }}>
        {@render children()}
      </main>
    {/key}
  </MsgModal>
</GlobalPlayer>
