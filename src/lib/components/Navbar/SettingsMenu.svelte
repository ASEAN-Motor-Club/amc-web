<script lang="ts">
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import Select from '$lib/ui/Select/Select.svelte';
  import { onMount } from 'svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import SelectOption from '$lib/ui/Select/SelectOption.svelte';
  import { mtLocale, setLocale } from '../Locale/locale.svelte';
  import type { MtLocaleKey } from '$lib/data/types';
  import { getLocale, type Locale } from '$lib/paraglide/runtime';
  import ClickAwayBlock from '$lib/ui/ClickAwayBlock/ClickAwayBlock.svelte';
  import { fade } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { page } from '$app/state';
  import { pushState, replaceState } from '$app/navigation';
  import { censored } from '$lib/censored.svelte';

  const mtLocales = [
    'cs',
    'de',
    'en',
    'es-419',
    'es-ES',
    'fi',
    'fr',
    'hu',
    'it',
    'ja',
    'ko',
    'lt',
    'nl',
    'no',
    'pl',
    'pt-BR',
    'ru',
    'sv',
    'tr',
    'uk',
    'vi',
    'zh-Hans',
    'zh-Hant',
  ] as const;

  const siteLocales = ['en', 'th', 'id'] as const;

  let darkMode = $state(false);

  onMount(() => {
    const storageLocale = localStorage.getItem('mtLocale') as MtLocaleKey | null;
    mtLocale.l = storageLocale && mtLocales.includes(storageLocale) ? storageLocale : 'en';
    darkMode = document.documentElement.classList.contains('dark');
  });

  const swapTheme = () => {
    document.documentElement.classList.toggle('dark');
    darkMode = document.documentElement.classList.contains('dark');
  };

  const changeMtLocale = (locale: MtLocaleKey) => {
    mtLocale.l = locale;
    localStorage.setItem('mtLocale', locale);
  };

  $effect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  });

  const menu = $derived(page.state.settingMenuOpen ?? false);

  const setMenu = (value: boolean) => {
    if (value) {
      pushState('', { ...page.state, settingMenuOpen: true });
    } else {
      replaceState('', { ...page.state, settingMenuOpen: false });
    }
  };

  const changeSiteLocale = (locale: Locale) => {
    setLocale(locale);
  };

  const handleMenuClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu(!menu);
  };
</script>

<Button class="ml-auto" variant="text" round size="sm" onClick={handleMenuClick} icon>
  <Icon class="i-material-symbols:settings-rounded" size="sm" />
</Button>

<ClickAwayBlock onClickAway={() => setMenu(false)} active={menu}>
  {#if menu}
    <div
      transition:fade={{
        duration: defaultTransitionDurationMs,
      }}
      class="max-w-104 z-10000 absolute right-0 top-14 w-full px-5"
    >
      <Card class="w-full">
        <div class="flex items-center justify-between gap-2">
          <div class="font-semibold">{msg['settings.theme.title']()}</div>
          <Button class="ml-auto" variant="contained-light" onClick={swapTheme}>
            {#snippet prependIcon()}
              <Icon
                class={[
                  darkMode
                    ? `i-material-symbols:dark-mode-outline-rounded`
                    : `i-material-symbols:light-mode-outline-rounded`,
                ]}
              />
            {/snippet}
            {darkMode ? msg['settings.theme.dark']() : msg['settings.theme.light']()}
          </Button>
        </div>
        <Divider spacing="sm" />
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="truncate whitespace-nowrap font-semibold">
            {msg['settings.site_language']()}
          </div>
          <Select
            name="siteLocale"
            value={getLocale()}
            onChange={changeSiteLocale}
            class="w-3/5 flex-none"
            menuClass="max-h-[50svh]"
          >
            {#each siteLocales as localeKey (localeKey)}
              <SelectOption id={localeKey} value={msg[`locales.${localeKey}`]()} />
            {/each}
          </Select>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="truncate whitespace-nowrap font-semibold">
            {msg['settings.game_language']()}
          </div>
          <Select
            name="mtLocale"
            value={mtLocale.l}
            onChange={changeMtLocale}
            class="w-3/5 flex-none"
            menuClass="max-h-[50svh]"
          >
            {#each mtLocales as localeKey (localeKey)}
              <SelectOption id={localeKey} value={msg[`locales.${localeKey}`]()} />
            {/each}
          </Select>
        </div>
        <button
          class="text-text/60 dark:text-text-dark/60 hover:text-text/80 hover:dark:text-text-dark/80 mt-4 flex cursor-pointer items-center justify-between gap-2 text-xs underline"
          type="button"
          onclick={() => (censored.c = !censored.c)}
        >
          {#if censored.c}
            Click here if you like being employed 👍
          {:else}
            Click here if you are Yuuka or hate employment.
          {/if}
        </button>
      </Card>
    </div>
  {/if}
</ClickAwayBlock>
