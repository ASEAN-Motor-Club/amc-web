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
  import { noop } from 'es-toolkit';

  import { rtDate } from '$lib/realtimeDate.svelte';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { createQueryClient } from '$lib/api/queryClient';

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
      <Navbar />
      {#key id}
        <main
          class="h-full min-h-dvh pt-16"
          in:fade={{ duration: defaultTransitionDurationMs * 3 }}
        >
          {@render children()}
        </main>
      {/key}
    </MsgModal>
  </GlobalPlayer>
</QueryClientProvider>
