<script lang="ts">
  import type { Icon as IconType } from '$lib/ui/Icon/types';
  import { m } from '$lib/paraglide/messages';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import IconButton from '$lib/ui/IconButton/IconButton.svelte';
  import { onMount } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import { page } from '$app/state';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { fly } from 'svelte/transition';
  import { transitionDuration } from '$lib/states/transitionDuration.svelte';

  const links = [
    {
      href: '/map',
      label: m['navbar.map'](),
      icon: 'map',
      hoverColorClass: 'group-hover:text-green-500',
      activeColorClass: 'text-green-500',
    },
    {
      href: '/housing',
      label: m['navbar.housing'](),
      icon: 'home',
      hoverColorClass: 'group-hover:text-blue-500',
      activeColorClass: 'text-blue-500',
    },
    {
      href: '/industries',
      label: m['navbar.industries'](),
      icon: 'factory',
      hoverColorClass: 'group-hover:text-yellow-500',
      activeColorClass: 'text-yellow-500',
    },
    {
      href: '/radio',
      label: m['navbar.radio'](),
      icon: 'radio',
      hoverColorClass: 'group-hover:text-orange-500',
      activeColorClass: 'text-orange-500',
    },
    {
      href: '/track',
      label: m['navbar.track_editor'](),
      icon: 'route',
      hoverColorClass: 'group-hover:text-red-500',
      activeColorClass: 'text-red-500',
    },
  ] satisfies {
    href: string;
    label: string;
    icon?: IconType;
    hoverColorClass: string;
    activeColorClass: string;
  }[];

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

  const pageActive = (href: string) => {
    const pathname = page.url.pathname;
    return pathname.startsWith(href);
  };

  let menu = $state(false);
</script>

<nav
  class="bg-background-100 dark:bg-background-900 fixed flex h-14 w-full items-center px-4 shadow/10 ring ring-black/1 lg:h-16"
>
  <IconButton
    buttonClass="-ml-2 mr-2 lg:hidden"
    variant="text"
    icon="menu"
    size="md"
    onClick={() => (menu = true)}
  />
  <a href="/" class="mr-8 text-2xl leading-none font-bold">
    <span class="contents max-[375px]:hidden lg:max-xl:hidden">
      {m['site_name']()}
    </span>
    <span class="hidden max-[375px]:contents lg:max-xl:contents">
      {m['site_name_short']()}
    </span>
  </a>
  <div class="hidden gap-6 lg:flex">
    {#each links as { href, label, icon, hoverColorClass, activeColorClass } (href)}
      <a {href} class="group flex items-center gap-1">
        <Icon {icon} class={[hoverColorClass, pageActive(href) && activeColorClass]} />
        <span class="leading-none group-hover:underline">{label}</span>
      </a>
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
      transition:fly={{ x: '-100%', duration: transitionDuration }}
    >
      <a href="/" class="my-4 text-2xl font-bold" onclick={() => (menu = false)}
        >{m['site_name']()}</a
      >
      {#each links as { href, label, icon, hoverColorClass, activeColorClass } (href)}
        <a {href} class="group flex items-center gap-1" onclick={() => (menu = false)}>
          <Icon {icon} class={[hoverColorClass, pageActive(href) && activeColorClass]} />
          <span class="leading-none group-hover:underline">{label}</span>
        </a>
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

  <IconButton
    buttonClass="ml-auto"
    variant="text"
    round
    icon={darkMode ? 'dark_mode' : 'light_mode'}
    size="sm"
    onClick={swapTheme}
  />
</nav>
