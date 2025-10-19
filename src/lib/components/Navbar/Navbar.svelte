<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { fly } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import NavbarItem from './NavbarItem.svelte';
  import NavbarIcon from './NavbarIcon.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { PUBLIC_DISCORD_LINK } from '$env/static/public';
  import NavbarPageLoading from './NavbarPageLoading.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import SettingsMenu from './SettingsMenu.svelte';
  import type { NavbarItem as NavbarItemType } from './types';
  import { page } from '$app/state';
  import { pushState, replaceState } from '$app/navigation';
  import { getGlobalPlayerContext } from '../Radio/GlobalPlayer/context';
  import SoundBarIcon from './SoundBarIcon.svelte';
  import { isLg } from '$lib/utils/media.svelte';

  const playerContext = getGlobalPlayerContext();

  const links: NavbarItemType[] = $derived([
    {
      href: '/map',
      label: msg['navbar.map'](),
      icon: mapIcon,
      subItems: [
        {
          href: '/players',
          label: msg['navbar.players'](),
          icon: playerIcon,
        },
        {
          href: '/housing',
          label: msg['navbar.housing'](),
          icon: housingIcon,
        },
        {
          href: '/jobs',
          label: msg['navbar.jobs'](),
          icon: jobIcon,
        },
      ],
    },
    {
      label: msg['navbar.tools'](),
      icon: toolsIcon,
      subItems: [
        {
          href: 'https://wiki.aseanmotorclub.com/',
          label: msg['navbar.wiki'](),
          icon: wikiIcon,
          external: true,
        },
        {
          href: '/track',
          label: msg['navbar.track_editor'](),
          icon: trackIcon,
          exact: false,
        },
      ],
    },
    {
      href: '/radio',
      label: msg['navbar.radio'](),
      textClass: playerContext.isPlaying ? '!text-orange-500' : undefined,
      icon: radioIcon,
    },
    {
      href: '/championship',
      label: msg['navbar.amc_cup'](),
      icon: trophyIcon,
      textClass: 'text-amber-600 dark:text-amber-400',
      subItems: [
        {
          href: '/championship/details',
          label: msg['navbar.details'](),
          icon: champDetailsIcon,
        },
      ],
    },
  ]);

  const menu = $derived(page.state.navbarMenuOpen ?? false);

  const setMenu = (value: boolean) => {
    if (value) {
      pushState('', { ...page.state, navbarMenuOpen: true });
    } else {
      replaceState('', { ...page.state, navbarMenuOpen: false });
    }
  };
</script>

{#snippet toolsIcon(pathMatch: boolean)}
  <NavbarIcon
    class="i-material-symbols:build-outline-rounded group-hover:text-rose-500"
    {pathMatch}
  />
{/snippet}

{#snippet mapIcon(pathMatch: boolean)}
  <NavbarIcon
    class="i-material-symbols:map-outline-rounded group-hover:text-green-500"
    {pathMatch}
  />
{/snippet}

{#snippet housingIcon(pathMatch: boolean)}
  <NavbarIcon
    class="i-material-symbols:home-outline-rounded group-hover:text-blue-500"
    {pathMatch}
  />
{/snippet}

{#snippet radioIcon(pathMatch: boolean)}
  {#if playerContext.isPlaying && !pathMatch && !prefersReducedMotion.current}
    <SoundBarIcon />
  {:else if prefersReducedMotion.current}
    <NavbarIcon class="i-material-symbols:play-circle-rounded !text-orange-500" {pathMatch} />
  {:else}
    <NavbarIcon
      class={[
        'i-material-symbols:radio-outline-rounded group-hover:text-orange-500',
        playerContext.isPlaying && '!text-orange-500',
      ]}
      {pathMatch}
    />
  {/if}
{/snippet}

{#snippet trackIcon(pathMatch: boolean)}
  <NavbarIcon class="i-material-symbols:route-outline group-hover:text-red-500" {pathMatch} />
{/snippet}

{#snippet wikiIcon(pathMatch: boolean)}
  <NavbarIcon
    class="i-material-symbols:book-outline-rounded group-hover:text-teal-500"
    {pathMatch}
  />
{/snippet}

{#snippet champDetailsIcon(pathMatch: boolean)}
  <NavbarIcon
    class="i-material-symbols:calendar-month-outline-rounded group-hover:text-yellow-500"
    {pathMatch}
  />
{/snippet}

{#snippet trophyIcon()}
  <NavbarIcon class="i-material-symbols:trophy-rounded text-amber-500" pathMatch />
{/snippet}

{#snippet jobIcon(pathMatch: boolean)}
  <NavbarIcon
    class="i-material-symbols:delivery-truck-speed-outline-rounded group-hover:text-orange-500"
    {pathMatch}
  />
{/snippet}

{#snippet playerIcon(pathMatch: boolean)}
  <NavbarIcon
    class="i-material-symbols:person-outline-rounded group-hover:text-emerald-500"
    {pathMatch}
  />
{/snippet}

{#snippet menuItems(mobile = false)}
  {#each links as link (link.label)}
    <NavbarItem {...link} onClick={() => setMenu(false)} {mobile} />
  {/each}
  <div class="flex items-center">
    <Button
      variant="contained-light"
      class="bg-[#5865f2]/15 !text-[#5865f2] hover:bg-[#5865f2]/25 dark:bg-[#5865f2]/10 dark:hover:bg-[#5865f2]/20"
      tag="a"
      href={PUBLIC_DISCORD_LINK}
      target="_blank"
      rel="noreferrer">{msg['navbar.join_discord']()}</Button
    >
  </div>
{/snippet}

<nav
  class="bg-background-100 dark:bg-background-900 ring-black/1 z-100000 fixed flex h-16 w-full select-none items-center px-4 shadow-black/10 ring"
>
  <Button class="-ml-2 mr-2 lg:hidden" variant="text" onClick={() => setMenu(true)} icon>
    <Icon class="i-material-symbols:menu-rounded" />
  </Button>
  <a href="/" class="font-sans-alt mr-6 text-2xl leading-none tracking-wide">
    {msg.site_name()}
  </a>
  {#if isLg.current}
    <div class="flex h-full items-stretch gap-6">
      {@render menuItems()}
    </div>
  {:else}
    <Modal open={menu} onClose={() => setMenu(false)} class="align-start justify-start p-0">
      <div
        class="bg-background-100 dark:bg-background-900 flex h-dvh flex-col gap-6 p-4"
        transition:fly={{
          x: '-100%',
          duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs,
        }}
      >
        <a href="/" class="font-sans-alt my-4 text-2xl" onclick={() => setMenu(false)}>
          {msg.site_name()}
        </a>
        {@render menuItems(true)}
      </div>
    </Modal>
  {/if}
  <SettingsMenu />
</nav>
<NavbarPageLoading />
