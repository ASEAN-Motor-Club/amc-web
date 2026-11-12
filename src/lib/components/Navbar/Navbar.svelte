<script lang="ts">
  import '#lib/font-sans-em.ts';
  import { m } from '#messages';
  import Button from '#lib/ui/Button/Button.svelte';
  import Modal from '#lib/ui/Modal/Modal.svelte';
  import { fly } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '#lib/tw-var.ts';
  import NavbarItem from './NavbarItem.svelte';
  import NavbarIcon from './NavbarIcon.svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import { PUBLIC_DISCORD_LINK } from '$app/env/public';
  import NavbarPageLoading from './NavbarPageLoading.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import SettingsMenu from './SettingsMenu.svelte';
  import type { NavbarItem as NavbarItemType } from './types.ts';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getGlobalPlayerContext } from '../Radio/GlobalPlayer/context.ts';
  import SoundBarIcon from './SoundBarIcon.svelte';
  import { isLg } from '#lib/utils/media.svelte.ts';

  const playerContext = getGlobalPlayerContext();

  const links: NavbarItemType[] = $derived([
    {
      href: '/map',
      label: m['navbar.map'](),
      icon: mapIcon,
      subItems: [
        {
          href: '/players',
          label: m['navbar.players'](),
          icon: playerIcon,
        },
        {
          href: '/housing',
          label: m['navbar.housing'](),
          icon: housingIcon,
        },
        {
          href: '/jobs',
          label: m['navbar.jobs'](),
          icon: jobIcon,
        },
      ],
    },
    {
      label: m['navbar.tools'](),
      icon: toolsIcon,
      subItems: [
        {
          href: '/track',
          label: m['navbar.track_editor'](),
          icon: trackIcon,
          exact: false,
        },
        {
          href: '/pak/conflict',
          label: m['navbar.pak_conflict'](),
          icon: pakIcon,
          exact: false,
        },
      ],
    },
    {
      label: m['navbar.community'](),
      icon: communityIcon,
      subItems: [
        {
          href: 'https://wiki.aseanmotorclub.com/',
          label: m['navbar.wiki'](),
          icon: wikiIcon,
          external: true,
        },
        {
          href: 'https://docs.aseanmotorclub.com/',
          label: m['navbar.docs'](),
          icon: docsIcon,
          external: true,
        },
        {
          href: 'https://gov.aseanmotorclub.com/',
          label: m['navbar.government'](),
          icon: governmentIcon,
          external: true,
        },
        {
          href: 'https://mods.aseanmotorclub.com/',
          label: m['navbar.tire_mod_creator'](),
          icon: tireModIcon,
          external: true,
        },
      ],
    },
    {
      href: '/radio',
      label: m['navbar.radio'](),
      textClass: playerContext.isPlaying ? '!text-orange-500' : undefined,
      icon: radioIcon,
    },
    // {
    //   href: '/championship',
    //   label: m['navbar.amc_cup'](),
    //   icon: trophyIcon,
    //   textClass: 'text-amber-600 dark:text-amber-400',
    //   subItems: [
    //     {
    //       href: '/championship/details',
    //       label: m['navbar.details'](),
    //       icon: champDetailsIcon,
    //     },
    //   ],
    // },
  ]);

  const menu = $derived(page.state.navbarMenuOpen ?? false);

  const setMenu = (value: boolean) => {
    if (value) {
      goto('', {
        shallow: true,
        state: { ...page.state, navbarMenuOpen: true },
      });
    } else {
      goto('', {
        shallow: true,
        replace: true,
        state: { ...page.state, navbarMenuOpen: false },
      });
    }
  };
</script>

{#snippet toolsIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--build-outline-rounded] group-hover:text-rose-500"
    {pathMatch}
  />
{/snippet}

{#snippet communityIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--groups-outline-rounded] group-hover:text-violet-500"
    {pathMatch}
  />
{/snippet}

{#snippet docsIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--description-outline-rounded] group-hover:text-sky-500"
    {pathMatch}
  />
{/snippet}

{#snippet governmentIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--account-balance-outline-rounded] group-hover:text-indigo-500"
    {pathMatch}
  />
{/snippet}

{#snippet tireModIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--tire-repair-outline-rounded] group-hover:text-cyan-500"
    {pathMatch}
  />
{/snippet}

{#snippet mapIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--map-outline-rounded] group-hover:text-green-500"
    {pathMatch}
  />
{/snippet}

{#snippet housingIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--home-outline-rounded] group-hover:text-blue-500"
    {pathMatch}
  />
{/snippet}

{#snippet radioIcon(pathMatch: boolean)}
  {#if playerContext.isPlaying && !pathMatch && !prefersReducedMotion.current}
    <SoundBarIcon />
  {:else if prefersReducedMotion.current}
    <NavbarIcon class="icon-[material-symbols--play-circle-rounded] !text-orange-500" {pathMatch} />
  {:else}
    <NavbarIcon
      class={[
        'icon-[material-symbols--radio-outline-rounded] group-hover:text-orange-500',
        playerContext.isPlaying && '!text-orange-500',
      ]}
      {pathMatch}
    />
  {/if}
{/snippet}

{#snippet trackIcon(pathMatch: boolean)}
  <NavbarIcon class="icon-[material-symbols--route-outline] group-hover:text-red-500" {pathMatch} />
{/snippet}

{#snippet pakIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--folder-zip-outline-rounded] group-hover:text-yellow-500"
    {pathMatch}
  />
{/snippet}

{#snippet wikiIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--book-outline-rounded] group-hover:text-teal-500"
    {pathMatch}
  />
{/snippet}

<!-- {#snippet champDetailsIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--calendar-month-outline-rounded] group-hover:text-yellow-500"
    {pathMatch}
  />
{/snippet}

{#snippet trophyIcon()}
  <NavbarIcon class="icon-[material-symbols--trophy-rounded] text-amber-500" pathMatch />
{/snippet} -->

{#snippet jobIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--delivery-truck-speed-outline-rounded] group-hover:text-orange-500"
    {pathMatch}
  />
{/snippet}

{#snippet playerIcon(pathMatch: boolean)}
  <NavbarIcon
    class="icon-[material-symbols--person-outline-rounded] group-hover:text-emerald-500"
    {pathMatch}
  />
{/snippet}

{#snippet menuItems(mobile = false)}
  {#each links as link (link.label)}
    <NavbarItem {...link} onClick={() => setMenu(false)} {mobile} />
  {/each}
  <li class="mt-6 flex items-center lg:mt-0">
    <Button
      variant="contained-light"
      color="custom"
      class="bg-[#5865f2]/15 !text-[#4752c4] hover:bg-[#5865f2]/25 contrast-more:text-[#2f3699]! dark:bg-[#5865f2]/10 dark:!text-[#9ba3f7] dark:hover:bg-[#5865f2]/20 dark:contrast-more:text-[#c5cafb]!"
      tag="a"
      href={PUBLIC_DISCORD_LINK}
      target="_blank"
      rel="noreferrer">{m['navbar.join_discord']()}</Button
    >
  </li>
{/snippet}

<nav
  aria-label={m['a11y.main_navigation']()}
  class="fixed z-100000 flex h-16 w-full items-center bg-background-200 px-4 ring shadow-gray-950/10 ring-gray-950/1 select-none dark:bg-background-900"
>
  <Button
    class="mr-2 -ml-2 lg:hidden"
    variant="text"
    onClick={() => setMenu(true)}
    icon
    aria-label={m['a11y.open_menu']()}
    aria-expanded={menu}
  >
    <Icon class="icon-[material-symbols--menu-rounded]" />
  </Button>
  <a href="/" class="mr-6 font-sans-em text-2xl leading-none tracking-wide">
    {m.site_name()}
  </a>
  {#if isLg.current}
    <ul class="flex h-full items-stretch gap-6">
      {@render menuItems()}
    </ul>
  {:else}
    <Modal
      open={menu}
      onClose={() => setMenu(false)}
      class="justify-start p-0 align-top"
      aria-label={m['a11y.main_navigation']()}
    >
      <div
        class="flex h-dvh flex-col bg-background-200 px-4 py-8 dark:bg-background-900"
        transition:fly|global={{
          x: '-100%',
          duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs,
        }}
      >
        <a
          href="/"
          class="mb-10 font-sans-em text-2xl tracking-wide"
          onclick={() => setMenu(false)}
        >
          {m.site_name()}
        </a>
        <ul class="flex flex-col gap-4">
          {@render menuItems(true)}
        </ul>
      </div>
    </Modal>
  {/if}
  <SettingsMenu />
</nav>
<NavbarPageLoading />
