<script lang="ts">
  import type { Icon as IconType } from '$lib/ui/Icon/types';
  import { m } from '$lib/paraglide/messages';
  import IconButton from '$lib/ui/IconButton/IconButton.svelte';
  import { onMount } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { fly } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import NavbarItem from './NavbarItem.svelte';
  import LoadClass from '$lib/ui/LoadClass/LoadClass.svelte';

  const links = [
    {
      href: '/map',
      label: m['navbar.map'](),
      icon: 'map',
    },
    {
      href: '/housing',
      label: m['navbar.housing'](),
      icon: 'home',
    },
    {
      href: '/industries',
      label: m['navbar.industries'](),
      icon: 'factory',
    },
    {
      href: '/radio',
      label: m['navbar.radio'](),
      icon: 'radio',
    },
    {
      href: '/track',
      label: m['navbar.track_editor'](),
      icon: 'route',
    },
  ] satisfies {
    href: string;
    label: string;
    icon?: IconType;
  }[];

  let darkMode = $state(false);

  onMount(() => {
    darkMode = document.documentElement.classList.contains('dark');
  });

  const swapTheme = () => {
    console.log('Swapping theme');
    document.documentElement.classList.toggle('dark');
    darkMode = document.documentElement.classList.contains('dark');
  };

  $effect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  });

  let menu = $state(false);
</script>

<nav
  class="bg-background-100 dark:bg-background-900 ring-black/1 fixed flex h-14 w-full items-center px-4 shadow-black/10 ring lg:h-16"
>
  <LoadClass class={['-ml-2 mr-2 lg:hidden']}>
    {#snippet children([className])}
      <IconButton
        buttonClass={className}
        variant="text"
        icon="menu"
        size="md"
        onClick={() => (menu = true)}
      />
    {/snippet}
  </LoadClass>
  <a href="/" class="mr-8 text-2xl font-bold leading-none">
    <span class="contents max-[375px]:hidden lg:max-xl:hidden">
      {m['site_name']()}
    </span>
    <span class="hidden max-[375px]:contents lg:max-xl:contents">
      {m['site_name_short']()}
    </span>
  </a>
  <div class="hidden gap-6 lg:flex">
    {#each links as { href, label, icon } (href)}
      <NavbarItem {href} {label} {icon} onClick={() => (menu = false)} />
    {/each}
    <Button
      variant="contained-light"
      class="hover:!bg-[#5865f2]/10 hover:!text-[#5865f2]"
      tag="a"
      href="https://discord.com/invite/Wcf8ZcEHD6"
      target="_blank">{m['navbar.join_discord']()}</Button
    >
  </div>
  <Modal open={menu} onClose={() => (menu = false)} class="align-start justify-start !p-0">
    <div
      class="bg-background-100 dark:bg-background-900 flex h-dvh flex-col gap-6 p-4"
      transition:fly={{ x: '-100%', duration: defaultTransitionDurationMs }}
    >
      <a href="/" class="my-4 text-2xl font-bold" onclick={() => (menu = false)}
        >{m['site_name']()}</a
      >
      {#each links as { href, label, icon } (href)}
        <NavbarItem {href} {label} {icon} onClick={() => (menu = false)} />
      {/each}
      <Button
        variant="contained-light"
        class="mt-4 hover:!bg-[#5865f2]/10 hover:!text-[#5865f2]"
        tag="a"
        href="https://discord.com/invite/Wcf8ZcEHD6"
        target="_blank">{m['navbar.join_discord']()}</Button
      >
    </div>
  </Modal>

  <LoadClass class={['ml-auto']}>
    {#snippet children([className])}
      <IconButton
        buttonClass={className}
        variant="text"
        round
        icon={darkMode ? 'dark_mode' : 'light_mode'}
        size="sm"
        onClick={swapTheme}
      />
    {/snippet}
  </LoadClass>
</nav>
