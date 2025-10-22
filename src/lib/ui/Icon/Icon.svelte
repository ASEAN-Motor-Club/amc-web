<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { getBtnIconSizeContext } from '../Button/context';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';

  export interface IconProps {
    /**
     * Icon and CSS class to apply to the icon component, preferably icon should use rounded version.
     */
    class: ClassValue;
    /**
     * Size of the icon
     * @default 'md'
     */
    size?: 'xs' | 'sm' | 'md' | 'lg' | `!text-${string}`;
  }

  const { size = 'md', class: propsClassName }: IconProps = $props();

  const sizeContext = getBtnIconSizeContext();

  const iconSize = $derived(sizeContext ? sizeContext.getSize() : size);

  const sizeClasses = $derived.by(() => {
    switch (iconSize) {
      case 'xs':
        return '!text-[0.9rem]';
      case 'sm':
        return '!text-[1.25rem]';
      case 'md':
        return '!text-[1.5rem]';
      case 'lg':
        return '!text-[2rem]';
      default:
        return iconSize;
    }
  });
</script>

<div class={twMerge(sizeClasses, clsx(propsClassName))}></div>
