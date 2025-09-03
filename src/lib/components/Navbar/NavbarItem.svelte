<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { twMerge } from 'tailwind-merge';

  const {
    href,
    label,
    icon,
    onClick,
    exact = true,
    external = false,
    onMouseOver,
  }: {
    href: string;
    label: string;
    icon: Snippet<[boolean]>;
    onClick: () => void;
    exact?: boolean;
    external?: boolean;
    onMouseOver?: () => void;
  } = $props();

  const pathMatch = $derived.by(() => {
    if (external) return false;
    if (exact) {
      return page.url.pathname === href;
    }
    return page.url.pathname.startsWith(href);
  });
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<a
  {href}
  class="group flex items-center gap-1"
  onclick={onClick}
  onmouseover={onMouseOver}
  target={external ? '_blank' : undefined}
  rel={external ? 'noreferrer' : undefined}
>
  {@render icon(pathMatch)}
  <div class="relative flex items-center">
    <span class="invisible font-bold leading-none">{label}</span>
    <span
      class={twMerge(
        'absolute left-0 whitespace-nowrap leading-none transition-all group-hover:font-bold',
        pathMatch ? 'font-bold' : 'text-text/80 dark:text-text-dark/80',
        href === '/championship' ? 'text-amber-600 dark:text-amber-400' : '',
      )}>{label}</span
    >
  </div>
</a>
