<script lang="ts">
  import { page } from '$app/state';
  import { twMerge } from 'tailwind-merge';
  import type { NavbarItem as NavbarItemType } from './types';
  import { slide } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { prefersReducedMotion } from 'svelte/motion';
  import clsx from 'clsx';
  import { debounce, type DebouncedFunc } from 'lodash-es';
  import { onDestroy } from 'svelte';

  const {
    href,
    label,
    icon,
    onClick,
    exact = true,
    external = false,
    onMouseOver,
    textClass,
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

  let closeSubMenu: DebouncedFunc<() => void> = debounce(() => {
    subMenu = false;
  }, 150);

  const handleMouseOver = () => {
    onMouseOver?.();
    closeSubMenu?.cancel();
    subMenu = true;
  };

  const handleSubMenuMouseOver = (
    onSubMenuMouseOver: NavbarItemType['onMouseOver'] | undefined,
  ) => {
    onSubMenuMouseOver?.();
    closeSubMenu?.cancel();
    subMenu = true;
  };

  const handleMouseOut = () => {
    closeSubMenu();
  };

  onDestroy(() => {
    closeSubMenu?.flush();
  });
</script>

<div class={mobile ? 'contents' : 'relative flex'}>
  <!-- svelte-ignore a11y_mouse_events_have_key_events -->
  <a
    {href}
    class={['group flex items-center gap-1', mobile && !href && 'pointer-events-none opacity-65']}
    onclick={onClick}
    onmouseover={handleMouseOver}
    onmouseout={handleMouseOut}
    target={external ? '_blank' : undefined}
    rel={external ? 'noreferrer' : undefined}
  >
    {@render icon(pathMatch(href, external, exact))}
    <div class="relative flex items-center">
      <span class="invisible font-bold leading-none">{label}</span>
      <span
        class={twMerge(
          'absolute left-0 whitespace-nowrap leading-none group-hover:font-bold motion-safe:transition-all',
          pathMatch(href, external, exact) ? 'font-bold' : 'text-text/80 dark:text-text-dark/80',
          clsx(textClass),
        )}>{label}</span
      >
    </div>
  </a>
  {#if subItems}
    {#if subMenu || mobile}
      <div
        class={mobile
          ? 'contents'
          : 'bg-background-100 dark:bg-background-900 top-13 border-t-none border-black/1 absolute left-0 z-10 -mx-3 box-content w-max min-w-full border px-3 shadow-black/10'}
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs,
        }}
      >
        {#each subItems as item (label + item.label)}
          <!-- svelte-ignore a11y_mouse_events_have_key_events -->
          <a
            href={item.href}
            class={[
              'group flex items-center gap-1',
              mobile ? 'pl-4' : '-mx-3 px-3 py-2 hover:bg-white/10',
            ]}
            onclick={onClick}
            onmouseover={() => handleSubMenuMouseOver(item.onMouseOver)}
            onmouseout={handleMouseOut}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noreferrer' : undefined}
          >
            {@render item.icon(pathMatch(item.href, item.external, item.exact))}
            <div class="relative flex items-center">
              <span class="invisible font-bold leading-none">{item.label}</span>
              <span
                class={twMerge(
                  'absolute left-0 whitespace-nowrap leading-none group-hover:font-bold motion-safe:transition-all',
                  pathMatch(item.href, item.external, item.exact)
                    ? 'font-bold'
                    : 'text-text/80 dark:text-text-dark/80',
                  clsx(item.textClass),
                )}>{item.label}</span
              >
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {/if}
</div>
