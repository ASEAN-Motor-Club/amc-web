<script lang="ts">
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import Select from '$lib/ui/Select/Select.svelte';
  import { onMount } from 'svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import SelectOption from '$lib/ui/Select/SelectOption.svelte';
  import { mtLocale } from '../MtLocale/mtLocale.svelte';

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

  let darkMode = $state(false);

  onMount(() => {
    darkMode = document.documentElement.classList.contains('dark');
  });

  const swapTheme = () => {
    document.documentElement.classList.toggle('dark');
    darkMode = document.documentElement.classList.contains('dark');
  };

  $effect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  });

  let menu = $state(false);
</script>

<Button class="ml-auto" variant="text" round size="sm" onClick={() => (menu = true)} icon>
  <Icon class="i-material-symbols:settings-rounded" size="sm" />
</Button>

<Modal
  open={menu}
  onClose={() => (menu = false)}
  class="mt-21 left-auto right-0 mx-5 h-fit w-fit items-start justify-end bg-transparent p-0"
  bgScrollable
  clickAway
>
  <Card class="max-w-103 w-full">
    <div class="flex items-center justify-center gap-6">
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
    <div class="flex items-center justify-center gap-6">
      <div class="whitespace-nowrap font-semibold">Game Language</div>
      <Select
        name="mtLocale"
        value={mtLocale.l}
        onChange={(e) => (mtLocale.l = e)}
        menuClass="max-h-[50svh]"
      >
        {#each mtLocales as locale (locale)}
          <SelectOption id={locale} value={msg[`locales.${locale}`]()} />
        {/each}
      </Select>
    </div>
  </Card>
</Modal>
