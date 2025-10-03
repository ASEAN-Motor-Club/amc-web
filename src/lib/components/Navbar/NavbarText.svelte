<script lang="ts">
  import { page } from '$app/state';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';

  export interface NavbarTextProps {
    href: string | undefined;
    label: string;
    exact: boolean | undefined;
    external: boolean | undefined;
    textClass: ClassValue | undefined;
  }

  const { href, label, exact = true, external = false, textClass }: NavbarTextProps = $props();

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
</script>

<div class="relative flex items-center">
  <span class="invisible font-bold leading-none">{label}</span>
  <span
    class={twMerge(
      'absolute left-0 whitespace-nowrap leading-none motion-safe:transition-all motion-reduce:transition-colors',
      pathMatch(href, external, exact) ? 'font-bold' : 'text-text/80 dark:text-text-dark/80',
      clsx(textClass),
    )}>{label}</span
  >
</div>
