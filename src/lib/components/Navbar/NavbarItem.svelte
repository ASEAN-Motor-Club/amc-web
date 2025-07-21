<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';

  const {
    href,
    label,
    icon,
    onClick,
    exact = true,
  }: {
    href: string;
    label: string;
    icon: Snippet<[boolean]>;
    onClick: () => void;
    exact?: boolean;
  } = $props();

  const pathMatch = $derived.by(() => {
    if (exact) {
      return page.url.pathname === href;
    }
    return page.url.pathname.startsWith(href);
  });
</script>

<a {href} class="group flex items-center gap-1" onclick={onClick}>
  {@render icon(pathMatch)}
  <div class="relative flex items-center">
    <span class="invisible font-bold leading-none">{label}</span>
    <span
      class={[
        'absolute left-0 whitespace-nowrap leading-none transition-all group-hover:font-bold',
        pathMatch ? 'font-bold' : 'text-text/80 dark:text-text-dark/80',
        href === '/championship' ? '!text-amber-600 dark:!text-amber-400' : '',
      ]}>{label}</span
    >
  </div>
</a>
