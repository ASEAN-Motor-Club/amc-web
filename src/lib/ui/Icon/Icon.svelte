<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

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
</script>

<div
  class={[
    {
      '!text-[0.75rem]': size === 'xs',
      '!text-[1.25rem]': size === 'sm',
      '!text-[1.5rem]': size === 'md',
      '!text-[2rem]': size === 'lg',
    },
    propsClassName,
  ]}
></div>
