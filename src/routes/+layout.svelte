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
  import { prefersReducedMotion } from 'svelte/motion';

  const { children } = $props();

  let color = $state<string | undefined>();

  onMount(() => {
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
  <title>{siteLocale.msg['site_name']()}</title>
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
</svelte:head>

<MsgModal>
  <Navbar />
  {#key page.route.id}
    <main
      class="h-full min-h-dvh pt-16"
      in:fade={{ duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs * 3 }}
    >
      {@render children()}
    </main>
  {/key}
</MsgModal>
