<script lang="ts">
  import { page } from '$app/state';
  import type { NavbarItem as NavbarItemType } from './types';
  import { slide } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { prefersReducedMotion } from 'svelte/motion';
  import { debounce, type DebouncedFunc } from 'lodash-es';
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

  let closeSubMenu: DebouncedFunc<() => void> = debounce(() => {
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
    console.log('leave');
    closeSubMenu();
  };

  onDestroy(() => {
    closeSubMenu.flush();
  });

  const baseLinkClass = $derived([
    'group flex items-center gap-1',
    !mobile && '-mx-3 px-3 transition-colors hover:bg-neutral-500/10',
  ]);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class={mobile ? 'contents' : 'relative'} onmouseleave={handleMouseLeave}>
  <a
    {href}
    class={['h-full', baseLinkClass, mobile && !href && 'pointer-events-none opacity-65']}
    onclick={onClick}
    onmouseenter={handleMouseEnter}
    target={external ? '_blank' : undefined}
    rel={external ? 'noreferrer' : undefined}
  >
    {@render icon(pathMatch(href, external, exact))}
    <NavbarText {href} {label} {exact} {external} {textClass} />
  </a>
  {#if subItems}
    {#if subMenu || mobile}
      <div
        class={mobile
          ? 'contents'
          : 'bg-background-100 dark:bg-background-900 absolute left-0 top-full z-10 -mx-3 box-content w-max min-w-full px-3 shadow-black/10'}
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs,
        }}
      >
        {#each subItems as item (label + item.label)}
          <a
            href={item.href}
            class={[baseLinkClass, mobile ? 'pl-4' : 'py-2']}
            onclick={onClick}
            onmouseenter={() => handleSubMenuMouseEnter(item.onMouseEnter)}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noreferrer' : undefined}
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
        {/each}
      </div>
    {/if}
  {/if}
</div>
