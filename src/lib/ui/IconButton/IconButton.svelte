<script lang="ts">
  import Button, { type ButtonProps } from '../Button/Button.svelte';
  import type { Color } from '../shared';
  import type { ClassValue, MouseEventHandler } from 'svelte/elements';
  import Icon, { type IconProps } from '../Icon/Icon.svelte';
  import type { Icon as IconTypes } from '../Icon/types';

  export type IconButtonProps = Omit<ButtonProps, 'children' | 'class'> &
    Omit<IconProps, 'size' | 'class'> & {
      /**
       * Content to be rendered inside the button component
       */
      icon: IconTypes;
      /**
       * Css class to apply to the button component
       */
      buttonClass: ClassValue;
      /**
       * Css class to apply to the icon component
       */
      iconClass: ClassValue;
    };

  const {
    icon,
    buttonClass,
    iconClass,
    color,
    variant,
    size,
    type,
    onClick,
    round,
    filled,
    weight,
    opticalSize,
    grade,
  }: IconButtonProps = $props();
</script>

<Button
  class={['flex aspect-square items-center justify-center !p-0', buttonClass]}
  {color}
  {variant}
  {size}
  {type}
  {onClick}
  {round}
>
  <Icon {icon} class={iconClass} {size} {filled} {weight} {opticalSize} {grade} />
</Button>
