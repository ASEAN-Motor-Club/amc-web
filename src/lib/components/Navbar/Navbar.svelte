<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  import { onMount, type Snippet } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { fly } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import NavbarItem from './NavbarItem.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { PUBLIC_DISCORD_LINK } from '$env/static/public';
  import NavbarPageLoading from './NavbarPageLoading.svelte';
  import lottieSpark from '$lib/assets/lottie/sparkle-long.json';
  import Lottie from '$lib/ui/Lottie/Lottie.svelte';

  const NAVBAR_AMC_HOVERED_KEY = 'navbarAmcHovered';

  let loop = $state<boolean | number>(10);

  onMount(() => {
    if (localStorage.getItem(NAVBAR_AMC_HOVERED_KEY) === '1') {
      loop = false;
    }
  });

  const links = [
    {
      href: '/map',
      label: msg['navbar.map'](),
      icon: mapIcon,
    },
    {
      href: '/housing',
      label: msg['navbar.housing'](),
      icon: housingIcon,
    },
    {
      href: '/industries',
      label: msg['navbar.industries'](),
      icon: industriesIcon,
    },
    {
      href: '/radio',
      label: msg['navbar.radio'](),
      icon: radioIcon,
    },
    {
      href: '/track',
      label: msg['navbar.track_editor'](),
      icon: trackIcon,
      exact: false,
    },
    {
      href: 'https://wiki.aseanmotorclub.com/',
      label: 'Wiki',
      icon: wikiIcon,
      external: true,
    },
    {
      href: '/championship',
      label: 'AMC Cup',
      icon: trophyIcon,
      onMouseOver: () => {
        loop = false;
        localStorage.setItem(NAVBAR_AMC_HOVERED_KEY, '1');
      },
    },
  ] satisfies {
    href: string;
    label: string;
    icon: Snippet<[boolean]>;
    exact?: boolean;
    external?: boolean;
    onMouseOver?: () => void;
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

  let menu = $state(false);
</script>

{#snippet mapIcon(pathMatch: boolean)}
  <Icon
    class={[
      'i-material-symbols:map-outline-rounded transition-colors group-hover:text-green-500',
      !pathMatch && 'text-text/80 dark:text-text-dark/80',
    ]}
  />
{/snippet}

{#snippet housingIcon(pathMatch: boolean)}
  <Icon
    class={[
      'i-material-symbols:home-outline-rounded transition-colors group-hover:text-blue-500',
      !pathMatch && 'text-text/80 dark:text-text-dark/80',
    ]}
  />
{/snippet}

{#snippet industriesIcon(pathMatch: boolean)}
  <Icon
    class={[
      'i-material-symbols:factory-outline-rounded transition-colors group-hover:text-yellow-500',
      !pathMatch && 'text-text/80 dark:text-text-dark/80',
    ]}
  />
{/snippet}

{#snippet radioIcon(pathMatch: boolean)}
  <Icon
    class={[
      'i-material-symbols:radio-outline-rounded transition-colors group-hover:text-orange-500',
      !pathMatch && 'text-text/80 dark:text-text-dark/80',
    ]}
  />
{/snippet}

{#snippet trackIcon(pathMatch: boolean)}
  <Icon
    class={[
      'i-material-symbols:route-outline transition-colors group-hover:text-red-500',
      !pathMatch && 'text-text/80 dark:text-text-dark/80',
    ]}
  />
{/snippet}

{#snippet wikiIcon(pathMatch: boolean)}
  <Icon
    class={[
      'i-material-symbols:book-outline-rounded transition-colors group-hover:text-teal-500',
      !pathMatch && 'text-text/80 dark:text-text-dark/80',
    ]}
  />
{/snippet}

{#snippet trophyIcon()}
  <div class="relative flex select-none items-center justify-center">
    <Icon class="i-material-symbols:trophy-rounded text-amber-500 transition-colors" />
    <div class="absolute h-full w-full">
      <Lottie animationData={lottieSpark} {loop} autoplay />
    </div>
  </div>
{/snippet}

{#snippet menuItems()}
  {#each links as { href, label, icon, exact, external, onMouseOver } (href)}
    <NavbarItem
      {href}
      {label}
      {icon}
      onClick={() => (menu = false)}
      {exact}
      {external}
      {onMouseOver}
    />
  {/each}
  <Button
    variant="contained-light"
    class="bg-[#5865f2]/15 !text-[#5865f2] hover:bg-[#5865f2]/25 dark:bg-[#5865f2]/10 dark:hover:bg-[#5865f2]/20"
    tag="a"
    href={PUBLIC_DISCORD_LINK}
    target="_blank"
    rel="noreferrer">{msg['navbar.join_discord']()}</Button
  >
{/snippet}

<nav
  class="bg-background-100 dark:bg-background-900 ring-black/1 z-100000 fixed flex h-16 w-full select-none items-center px-4 shadow-black/10 ring"
>
  <Button class="-ml-2 mr-2 min-[1075px]:hidden" variant="text" onClick={() => (menu = true)} icon>
    <Icon class="i-material-symbols:menu-rounded" />
  </Button>
  <a href="/" class="font-sans-alt mr-6 text-2xl leading-none tracking-wide">
    <span class="contents max-[1075px]:hidden">
      {msg['site_name_short']()}
    </span>
    <span class="hidden max-[1075px]:contents">
      {msg['site_name']()}
    </span>
  </a>
  <div class="hidden gap-6 min-[1075px]:flex">
    {@render menuItems()}
  </div>
  <Modal open={menu} onClose={() => (menu = false)} class="align-start justify-start p-0">
    <div
      class="bg-background-100 dark:bg-background-900 flex h-dvh flex-col gap-6 p-4"
      transition:fly={{ x: '-100%', duration: defaultTransitionDurationMs }}
    >
      <a href="/" class="font-sans-alt my-4 text-2xl" onclick={() => (menu = false)}>
        {msg['site_name']()}
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
<NavbarPageLoading />
