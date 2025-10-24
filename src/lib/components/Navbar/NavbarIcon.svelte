<script lang="ts">
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { ClassValue } from 'svelte/elements';
  import clsx from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export interface NavbarIconProps {
    /**
     * Whether the current path matches this icon's route
     * @default false
     */
    pathMatch?: boolean;
    /**
     * CSS classes including the icon class and hover colors
     */
    class?: ClassValue;
  }

  const { pathMatch = false, class: propsClass }: NavbarIconProps = $props();

  const baseClass = $derived(
    twMerge(
      'transition-colors',
      !pathMatch && 'text-text/80 dark:text-text-dark/80',
      clsx(propsClass),
    ),
  );
</script>

<Icon class={baseClass} />
