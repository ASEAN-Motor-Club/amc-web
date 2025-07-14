<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { onMount, type Snippet } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { fly } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import NavbarItem from './NavbarItem.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';

  const links = [
    {
      href: '/map',
      label: m['navbar.map'](),
      icon: mapIcon,
    },
    {
      href: '/housing',
      label: m['navbar.housing'](),
      icon: housingIcon,
    },
    {
      href: '/industries',
      label: m['navbar.industries'](),
      icon: industriesIcon,
    },
    {
      href: '/radio',
      label: m['navbar.radio'](),
      icon: radioIcon,
    },
    {
      href: '/track',
      label: m['navbar.track_editor'](),
      icon: trackIcon,
    },
  ] satisfies {
    href: string;
    label: string;
    icon: Snippet;
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

{#snippet mapIcon()}
  <Icon
    class="i-material-symbols:map-outline-rounded transition-colors group-hover:text-green-500"
  />
{/snippet}

{#snippet housingIcon()}
  <Icon
    class="i-material-symbols:home-outline-rounded transition-colors group-hover:text-blue-500"
  />
{/snippet}

{#snippet industriesIcon()}
  <Icon
    class="i-material-symbols:factory-outline-rounded transition-colors group-hover:text-yellow-500"
  />
{/snippet}

{#snippet radioIcon()}
  <Icon
    class="i-material-symbols:radio-outline-rounded transition-colors group-hover:text-orange-500"
  />
{/snippet}

{#snippet trackIcon()}
  <Icon class="i-material-symbols:route-outline transition-colors group-hover:text-red-500" />
{/snippet}

{#snippet menuItems()}
  {#each links as { href, label, icon } (href)}
    <NavbarItem {href} {label} {icon} onClick={() => (menu = false)} />
  {/each}
  <Button
    variant="contained-light"
    class="!bg-[#5865f2]/15 !text-[#5865f2] hover:!bg-[#5865f2]/25 dark:!bg-[#5865f2]/10 dark:hover:!bg-[#5865f2]/20"
    tag="a"
    href="https://discord.com/invite/Wcf8ZcEHD6"
    target="_blank">{m['navbar.join_discord']()}</Button
  >
{/snippet}

<nav
  class="bg-background-100 dark:bg-background-900 ring-black/1 z-100000 fixed flex h-14 w-full select-none items-center px-4 shadow-black/10 ring lg:h-16"
>
  <Button class="-ml-2 mr-2 lg:hidden" variant="text" onClick={() => (menu = true)} icon>
    <Icon class="i-material-symbols:menu-rounded" />
  </Button>
  <a href="/" class="font-cursive mr-8 text-2xl font-bold leading-none">
    <span class="contents max-[375px]:hidden lg:max-xl:hidden">
      {m['site_name']()}
    </span>
    <span class="hidden max-[375px]:contents lg:max-xl:contents">
      {m['site_name_short']()}
    </span>
  </a>
  <div class="hidden gap-6 lg:flex">
    {@render menuItems()}
  </div>
  <Modal open={menu} onClose={() => (menu = false)} class="align-start justify-start !p-0">
    <div
      class="bg-background-100 dark:bg-background-900 flex h-dvh flex-col gap-6 p-4"
      transition:fly={{ x: '-100%', duration: defaultTransitionDurationMs }}
    >
      <a
        href="/"
        class="font-cursive my-4 text-2xl font-bold tracking-tight"
        onclick={() => (menu = false)}
      >
        {m['site_name']()}
      </a>
      {@render menuItems()}
    </div>
  </Modal>
  <Button class="ml-auto" variant="text" round size="sm" onClick={swapTheme} icon>
    <Icon
      class={[
        darkMode
          ? `i-material-symbols:dark-mode-outline-rounded`
          : `i-material-symbols:light-mode-outline-rounded`,
      ]}
      size="sm"
    />
  </Button>
</nav>
