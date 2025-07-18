<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';

  const {
    href,
    label,
    icon,
    onClick,
  }: {
    href: string;
    label: string;
    icon: Snippet;
    onClick: () => void;
  } = $props();
</script>

<a {href} class="group flex items-center gap-1" onclick={onClick}>
  {@render icon()}
  <div class="relative flex items-center">
    <span class="invisible font-bold leading-none">{label}</span>
    <span
      class={[
        'absolute left-0 whitespace-nowrap leading-none transition-all group-hover:font-bold',
        href === page.url.pathname ? 'font-bold' : 'text-text/90 dark:text-text-dark/90',
        href === '/championship' ? '!text-amber-600 dark:!text-amber-400' : '',
      ]}>{label}</span
    >
  </div>
</a>
