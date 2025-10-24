<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export interface DividerProps {
    /**
     * CSS class to apply to the divider component
     */
    class?: ClassValue;
    /**
     * The spacing around the divider
     * @default 'md'
     */
    spacing?: 'sm' | 'md' | 'lg' | false;
    /**
     * Whether the divider should be vertical
     * @default false
     */
    vertical?: boolean;
  }

  const { class: propsClass, spacing = 'md', vertical = false }: DividerProps = $props();

  const spacingClass = {
    sm: vertical ? 'mx-4' : 'my-4',
    md: vertical ? 'mx-6' : 'my-6',
    lg: vertical ? 'mx-8' : 'my-8',
  };
</script>

<hr
  class={twMerge(
    'border-neutral-500',
    vertical && 'h-full w-0 border-t-0 border-l',
    spacing && spacingClass[spacing],
    clsx(propsClass),
  )}
/>
