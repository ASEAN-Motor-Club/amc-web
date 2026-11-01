<script lang="ts">
  import { page } from '$app/state';
  import type { NavbarItem as NavbarItemType } from './types';
  import { slide } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '#lib/tw-var.js';
  import { prefersReducedMotion } from 'svelte/motion';
  import { debounce, type DebouncedFunction } from 'es-toolkit';
  import { onDestroy } from 'svelte';
  import NavbarText from './NavbarText.svelte';

  const {
    href,
    label,
    icon,
    exact = true,
    external = false,
    textClass,
    onClick,
    onMouseEnter,
    subItems,
    mobile,
  }: {
    onClick: () => void;
    mobile?: boolean;
  } & NavbarItemType = $props();

  const pathMatch = (
    href: string | undefined,
    external: boolean | undefined,
    exact: boolean | undefined,
  ) => {
    if (!href || external) return false;
    if (exact) {
      return page.url.pathname === href;
    }
    return page.url.pathname.startsWith(href);
  };

  let subMenu = $state(false);

  let closeSubMenu: DebouncedFunction<() => void> = debounce(() => {
    subMenu = false;
  }, 100);

  const handleMouseEnter = () => {
    onMouseEnter?.();
    closeSubMenu.cancel();
    subMenu = true;
  };

  const handleSubMenuMouseEnter = (
    onSubMenuMouseEnter: NavbarItemType['onMouseEnter'] | undefined,
  ) => {
    onSubMenuMouseEnter?.();
    closeSubMenu.cancel();
    subMenu = true;
  };

  const handleMouseLeave = () => {
    closeSubMenu();
  };

  // Keyboard users reach the sub menu by tabbing into the item; close it once focus leaves.
  const handleFocusIn = () => {
    closeSubMenu.cancel();
    subMenu = true;
  };

  const handleFocusOut = (event: FocusEvent & { currentTarget: HTMLLIElement }) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeSubMenu();
    }
  };

  const toggleSubMenu = () => {
    closeSubMenu.cancel();
    subMenu = !subMenu;
  };

  onDestroy(() => {
    closeSubMenu.flush();
  });

  const baseLinkClass = $derived([
    'group flex items-center gap-1',
    !mobile && '-mx-3 px-3 transition-colors hover:bg-gray-500/10',
  ]);

  const subMenuId = $props.id();
</script>

<li
  class={mobile ? 'contents' : 'relative'}
  onmouseleave={handleMouseLeave}
  onfocusin={mobile ? undefined : handleFocusIn}
  onfocusout={mobile ? undefined : handleFocusOut}
>
  {#if href || mobile}
    <a
      {href}
      class={['h-full', baseLinkClass, mobile && !href && 'pointer-events-none opacity-80']}
      onclick={onClick}
      onmouseenter={handleMouseEnter}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      aria-current={pathMatch(href, external, exact) && exact ? 'page' : undefined}
    >
      {@render icon(pathMatch(href, external, exact))}
      <NavbarText {href} {label} {exact} {external} {textClass} />
    </a>
  {:else}
    <button
      type="button"
      class={['h-full cursor-pointer', baseLinkClass]}
      onclick={toggleSubMenu}
      onmouseenter={handleMouseEnter}
      aria-expanded={subMenu}
      aria-controls={subItems ? subMenuId : undefined}
    >
      {@render icon(pathMatch(href, external, exact))}
      <NavbarText {href} {label} {exact} {external} {textClass} />
    </button>
  {/if}
  {#if subItems}
    {#if subMenu || mobile}
      <ul
        id={subMenuId}
        class={mobile
          ? 'contents'
          : 'bg-background-200 dark:bg-background-900 absolute top-full left-0 z-10 -mx-3 box-content w-max min-w-full px-3 shadow-gray-950/10'}
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs,
        }}
      >
        {#each subItems as item (label + item.label)}
          <li class="contents">
            <a
              href={item.href}
              class={[baseLinkClass, mobile ? 'pl-4' : 'py-2']}
              onclick={onClick}
              onmouseenter={() => handleSubMenuMouseEnter(item.onMouseEnter)}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
              aria-current={pathMatch(item.href, item.external, item.exact) && (item.exact ?? true)
                ? 'page'
                : undefined}
            >
              {@render item.icon(pathMatch(item.href, item.external, item.exact))}
              <NavbarText
                href={item.href}
                label={item.label}
                exact={item.exact}
                external={item.external}
                textClass={item.textClass}
              />
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</li>
