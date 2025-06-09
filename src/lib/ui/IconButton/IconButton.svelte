<script lang="ts">
  import Button, { type ButtonProps } from '../Button/Button.svelte';
  import type { ClassValue } from 'svelte/elements';
  import Icon, { type IconProps } from '../Icon/Icon.svelte';
  import type { Icon as IconTypes } from '../Icon/types';

  export type IconButtonProps = Omit<ButtonProps, 'children' | 'class'> &
    Omit<IconProps, 'size' | 'class'> & {
      /**
       * Content to be rendered inside the button component
       */
      icon: IconTypes;
      /**
       * CSS class to apply to the button component
       */
      buttonClass?: ClassValue;
      /**
       * CSS class to apply to the icon component
       */
      iconClass?: ClassValue;
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
    // svelte scream about "Index signature is unused." but no index signature is used here
    ..._
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
