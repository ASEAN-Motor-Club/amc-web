<script lang="ts">
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import Select from '$lib/ui/Select/Select.svelte';
  import { onMount } from 'svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import SelectOption from '$lib/ui/Select/SelectOption.svelte';
  import { mtLocale } from '../Locale/locale.svelte';
  import type { MtLocaleKey } from '$lib/data/types';
  import type { Locale } from '$lib/paraglide/runtime';
  import { setLocale } from '$lib/components/Locale/locale.svelte';

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

  const siteLocales = ['en', 'th'] as const;

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

  let menu = $state(false);

  const changeSiteLocale = (locale: Locale) => {
    setLocale(locale);
  };
</script>

<Button class="ml-auto" variant="text" round size="sm" onClick={() => (menu = true)} icon>
  <Icon class="i-material-symbols:settings-rounded" size="sm" />
</Button>

<Modal
  open={menu}
  onClose={() => (menu = false)}
  class="mt-13 left-auto right-0 mx-5 h-fit w-fit items-start justify-end bg-transparent p-0"
  bgScrollable
  clickAway
>
  <Card class="max-w-104 w-full">
    <div class="flex items-center justify-between gap-2">
      <div class="font-semibold">Theme</div>
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
        {darkMode ? 'Dark Theme' : 'Light Theme'}
      </Button>
    </div>
    <Divider spacing="sm" />
    <div class="mb-2 flex items-center justify-between gap-2">
      <div class="truncate whitespace-nowrap font-semibold">Site Language</div>
      <Select
        name="siteLocale"
        value={siteLocale.l}
        onChange={changeSiteLocale}
        class="w-3/5 flex-none"
        menuClass="max-h-[50svh]"
      >
        {#each siteLocales as localeKey (localeKey)}
          <SelectOption id={localeKey} value={siteLocale.msg[`locales.${localeKey}`]()} />
        {/each}
      </Select>
    </div>
    <div class="flex items-center justify-between gap-2">
      <div class="truncate whitespace-nowrap font-semibold">Game Language</div>
      <Select
        name="mtLocale"
        value={mtLocale.l}
        onChange={changeMtLocale}
        class="w-3/5 flex-none"
        menuClass="max-h-[50svh]"
      >
        {#each mtLocales as localeKey (localeKey)}
          <SelectOption id={localeKey} value={siteLocale.msg[`locales.${localeKey}`]()} />
        {/each}
      </Select>
    </div>
  </Card>
</Modal>
