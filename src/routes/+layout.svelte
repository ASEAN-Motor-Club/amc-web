<script lang="ts">
  import '@fontsource-variable/noto-sans';
  import 'virtual:uno.css';
  import '../app.css';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Navbar from '$lib/components/Navbar/Navbar.svelte';
  import { onMount } from 'svelte';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { fade } from 'svelte/transition';
  import { page } from '$app/state';
  import GlobalPlayer from '$lib/components/Radio/GlobalPlayer/GlobalPlayer.svelte';
  import {
    localStorageKey,
    defineCustomClientStrategy,
    baseLocale,
    type Locale,
  } from '$lib/paraglide/runtime';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { noop } from 'lodash-es';
  import { censored } from '$lib/censored.svelte';
  import { rtDate } from '$lib/realtimeDate.svelte';

  $effect(() => {
    let animationId: number;

    const updateTime = () => {
      rtDate.d = new Date();
      animationId = requestAnimationFrame(updateTime);
    };

    animationId = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationId);
    };
  });

  defineCustomClientStrategy('custom-svelteReactiveLocale', {
    getLocale: () => {
      return siteLocale.l;
    },
    setLocale: noop, // use setLocale from locale.svelte to update the state instead
  });

  const { children } = $props();

  $effect(() => {
    document.documentElement.lang = siteLocale.l;
  });

  const hasJobCensoredKey = 'hasJobCensored';

  onMount(() => {
    censored.c = localStorage.getItem(hasJobCensoredKey) === '1';
    siteLocale.l = (localStorage.getItem(localStorageKey) as Locale | null) || baseLocale;
  });

  $effect(() => {
    localStorage.setItem(hasJobCensoredKey, censored.c ? '1' : '0');
  });

  const id = $derived(page.route.id?.startsWith('/(map)') ? '/(map)' : page.route.id);
</script>

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
