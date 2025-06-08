<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import type { Icon } from './types';

  export type IconProps = {
    /**
     * The icon to display, don't forgot to add to icon_names in app.html
     */
    icon: Icon;
    /**
     * CSS class to apply to the button component
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
     * CSS class to apply to the icon component
     * defaults
     */
    size?: 'sm' | 'md' | 'lg';
  };

  const {
    icon,
    filled = false,
    weight = 400,
    opticalSize = 24,
    grade = 0,
    size = 'md',
  }: IconProps = $props();

  const className = $derived.by(() => {
    switch (size) {
      case 'sm':
        return ['!text-[1.25rem]'];
      case 'md':
        return ['!text-[1.5rem]'];
      case 'lg':
        return ['!text-[2rem]'];
    }
  });
</script>

<span
  style:font-variation-settings={`'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`}
  class={['material-symbols-rounded select-none', className]}
>
  {icon}
</span>
