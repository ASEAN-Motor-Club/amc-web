<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import type { Icon } from './types';

  export type IconProps = {
    /**
     * The icon to display, don't forget to add to icon_names in app.html
     */
    icon: Icon;
    /**
     * CSS class to apply to the icon component
     */
    class?: ClassValue;
    /**
     * Whether the icon should be filled or outlined
     * @default false
     */
    filled?: boolean;
    /**
     * The font weight of the icon
     * @default 400
     */
    weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
    /**
     * The optical size of the icon
     * @default 24
     */
    opticalSize?: 20 | 24 | 40 | 48;
    /**
     * The grade of the icon
     * @default 0
     */
    grade?: -25 | 0 | 200;
    /**
     * Size of the icon
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg' | 'custom';
  };

  const {
    icon,
    filled = false,
    weight = 400,
    opticalSize = 24,
    grade = 0,
    size = 'md',
    class: propsClassName,
  }: IconProps = $props();
</script>

<span
  style:font-variation-settings={`'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`}
  class={[
    'material-symbols-rounded select-none',
    {
      '!text-[1.25rem]': size === 'sm',
      '!text-[1.5rem]': size === 'md',
      '!text-[2rem]': size === 'lg',
    },
    propsClassName,
  ]}
>
  {icon}
</span>
