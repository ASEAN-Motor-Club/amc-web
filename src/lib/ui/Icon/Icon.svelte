<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { getBtnIconSizeContext } from '../Button/context';

  export type IconProps = {
    /**
     * Icon and CSS class to apply to the icon component, preferably icon should use rounded version.
     */
    class: ClassValue;
    /**
     * Size of the icon
     * @default 'md'
     */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'custom';
  };

  const { size = 'md', class: propsClassName }: IconProps = $props();

  const sizeContext = getBtnIconSizeContext();

  const iconSize = $derived(sizeContext ? sizeContext.getSize() : size);
</script>

<div
  class={[
    {
      '!text-[0.75rem]': iconSize === 'xs',
      '!text-[1.25rem]': iconSize === 'sm',
      '!text-[1.5rem]': iconSize === 'md',
      '!text-[2rem]': iconSize === 'lg',
    },
    propsClassName,
  ]}
></div>
