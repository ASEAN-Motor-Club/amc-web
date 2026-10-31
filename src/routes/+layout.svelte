<script lang="ts">
  import '@fontsource-variable/noto-sans';
  import 'virtual:uno.css';
  import '../app.css';
  import MsgModal from '#lib/components/MsgModal/MsgModal.svelte';
  import Navbar from '#lib/components/Navbar/Navbar.svelte';
  import { onMount } from 'svelte';
  import { defaultTransitionDurationMs } from '#lib/tw-var.js';
  import { fade } from 'svelte/transition';
  import { page } from '$app/state';
  import GlobalPlayer from '#lib/components/Radio/GlobalPlayer/GlobalPlayer.svelte';
  import {
    localStorageKey,
    defineCustomClientStrategy,
    baseLocale,
    type Locale,
  } from '#lib/paraglide/runtime.js';
  import { siteLocale } from '#lib/components/Locale/locale.svelte.js';
  import { noop } from 'es-toolkit';

  import { rtDate } from '#lib/realtimeDate.svelte.js';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { createQueryClient } from '#lib/api/queryClient.js';
  import { m } from '#messages';

  const queryClient = createQueryClient();

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

  onMount(() => {
    siteLocale.l = (localStorage.getItem(localStorageKey) as Locale | null) || baseLocale;
  });

  const id = $derived(page.route.id?.startsWith('/(map)') ? '/(map)' : page.route.id);
</script>

<QueryClientProvider client={queryClient}>
  <GlobalPlayer>
    <MsgModal>
      <a
        href="#main-content"
        class="bg-background-50 dark:bg-background-900 sr-only fixed top-2 left-2 z-1000001 rounded-md px-4 py-2 font-semibold shadow-md focus:not-sr-only"
        >{m['a11y.skip_to_content']()}</a
      >
      <Navbar />
      {#key id}
        <main
          id="main-content"
          tabindex="-1"
          class="h-full min-h-dvh pt-16 outline-none"
          in:fade={{ duration: defaultTransitionDurationMs * 3 }}
        >
          {@render children()}
        </main>
      {/key}
    </MsgModal>
  </GlobalPlayer>
</QueryClientProvider>
