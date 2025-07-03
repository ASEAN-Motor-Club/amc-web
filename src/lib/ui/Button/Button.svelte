<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Color } from '../shared';
  import type { ClassValue, MouseEventHandler } from 'svelte/elements';

  export type ButtonProps = {
    /**
     * CSS class to apply to the button component
     */
    class?: ClassValue;
    /**
     * The color theme of the button
     * @default 'neutral'
     */
    color?: Color;
    /**
     * The visual style variant of the button
     * @default 'contained'
     */
    variant?: 'text' | 'contained' | 'contained-light' | 'outlined';
    /**
     * The size of the button
     * @default 'md'
     */
    size?: 'xs' | 'sm' | 'md' | 'lg';
    /**
     * The HTML button type attribute
     * @default 'button'
     */
    type?: 'button' | 'submit' | 'reset';
    /**
     * Event handler for button clicks
     */
    onClick?: MouseEventHandler<HTMLButtonElement>;
    /**
     * Content to be rendered inside the button component
     */
    children: Snippet;
    /**
     * Round the button corners
     * @default false
     */
    round?: boolean;
    /**
     * Whether the button should be un-padded, useful for text variant button in modal
     * @default false
     */
    unPadded?: boolean;
    /**
     * Whether the button should be disabled
     * @default false
     */
    disabled?: boolean;
    /**
     * The HTML tag to render the button as
     * @default 'button'
     */
    tag?: 'button' | 'a';
    /**
     * The href attribute for the button if it is an anchor tag
     */
    href?: string;
    /**
     * The target attribute for the button if it is an anchor tag
     * @default '_self'
     */
    target?: '_blank' | '_self' | '_parent' | '_top';
  };

  const {
    children,
    color = 'neutral',
    variant = 'contained',
    size = 'md',
    type = 'button',
    onClick,
    class: propsClassName,
    round,
    unPadded,
    disabled,
    tag = 'button',
    href,
    target = '_self',
  }: ButtonProps = $props();
</script>

<svelte:element
  this={tag}
  class={[
    'inline-flex flex-none cursor-pointer select-none items-center justify-center whitespace-nowrap font-semibold leading-none transition',
    disabled && 'pointer-events-none opacity-50',
    // Variant + color classes
    variant === 'contained' && {
      'text-text-dark bg-primary-700 hover:bg-primary-800 active:bg-primary-600':
        color === 'primary',
      'text-text-dark bg-secondary-700 hover:bg-secondary-800 active:bg-secondary-600':
        color === 'secondary',
      'text-text-dark bg-info-700 hover:bg-info-800 active:bg-info-600': color === 'info',
      'text-text-dark bg-success-700 hover:bg-success-800 active:bg-success-600':
        color === 'success',
      'text-text-dark bg-warning-700 hover:bg-warning-800 active:bg-warning-600':
        color === 'warning',
      'text-text-dark bg-error-700 hover:bg-error-800 active:bg-error-600': color === 'error',
      'text-text-dark bg-neutral-700 hover:bg-neutral-800 active:bg-neutral-600':
        color === 'neutral',
    },
    variant === 'contained-light' && {
      'text-text dark:text-text-dark bg-primary-700/10 hover:bg-primary-600/20 active:bg-primary-800/20':
        color === 'primary',
      'text-text dark:text-text-dark bg-secondary-700/10 hover:bg-secondary-600/20 active:bg-secondary-800/20':
        color === 'secondary',
      'text-text dark:text-text-dark bg-info-700/10 hover:bg-info-600/20 active:bg-info-800/20':
        color === 'info',
      'text-text dark:text-text-dark bg-success-700/10 hover:bg-success-600/20 active:bg-success-800/20':
        color === 'success',
      'text-text dark:text-text-dark bg-warning-700/10 hover:bg-warning-600/20 active:bg-warning-800/20':
        color === 'warning',
      'text-text dark:text-text-dark bg-error-700/10 hover:bg-error-600/20 active:bg-error-800/20':
        color === 'error',
      'text-text dark:text-text-dark bg-neutral-700/10 hover:bg-neutral-600/20 active:bg-neutral-800/20':
        color === 'neutral',
    },
    variant === 'outlined' && {
      'text-primary-700 dark:text-primary-500 hover:bg-primary-700/10 border-primary-700 dark:border-primary-500 active:bg-primary-600/20 border':
        color === 'primary',
      'text-secondary-700 dark:text-secondary-500 hover:bg-secondary-700/10 border-secondary-700 dark:border-secondary-500 active:bg-secondary-600/20 border':
        color === 'secondary',
      'text-info-700 dark:text-info-500 hover:bg-info-700/10 border-info-700 dark:border-info-500 active:bg-info-600/20 border':
        color === 'info',
      'text-success-700 dark:text-success-500 hover:bg-success-700/10 border-success-700 dark:border-success-500 active:bg-success-600/20 border':
        color === 'success',
      'text-warning-700 dark:text-warning-500 hover:bg-warning-700/10 border-warning-700 dark:border-warning-500 active:bg-warning-600/20 border':
        color === 'warning',
      'text-error-700 dark:text-error-500 hover:bg-error-700/10 border-error-700 dark:border-error-500 active:bg-error-600/20 border':
        color === 'error',
      'border border-neutral-700 text-neutral-600 hover:bg-neutral-700/10 active:bg-neutral-600/20 dark:border-neutral-500 dark:text-neutral-400':
        color === 'neutral',
    },
    variant === 'text' && {
      'text-primary-700 dark:text-primary-500 hover:bg-primary-700/10 active:bg-primary-600/20':
        color === 'primary',
      'text-secondary-700 dark:text-secondary-500 hover:bg-secondary-700/10 active:bg-secondary-600/20':
        color === 'secondary',
      'text-info-700 dark:text-info-500 hover:bg-info-700/10 active:bg-info-600/20':
        color === 'info',
      'text-success-700 dark:text-success-500 hover:bg-success-700/10 active:bg-success-600/20':
        color === 'success',
      'text-warning-700 dark:text-warning-500 hover:bg-warning-700/10 active:bg-warning-600/20':
        color === 'warning',
      'text-error-700 dark:text-error-500 hover:bg-error-700/10 active:bg-error-600/20':
        color === 'error',
      'text-neutral-600 hover:bg-neutral-700/10 active:bg-neutral-600/20 dark:text-neutral-400':
        color === 'neutral',
    },
    // Size/shape classes
    size === 'xs' && [
      'h-5 text-xs',
      round ? 'rounded-full px-2' : 'rounded-sm px-1',
      unPadded && '-mx-1 -my-0.5',
    ],
    size === 'sm' && [
      'h-8 text-sm',
      round ? 'rounded-full px-3' : 'rounded-sm px-2',
      unPadded && '-mx-2 -my-1.5',
    ],
    size === 'md' && [
      'h-10 text-base',
      round ? 'rounded-full px-4' : 'rounded-md px-3',
      unPadded && '-mx-3 -my-2',
    ],
    size === 'lg' && [
      'h-12 text-lg',
      round ? 'rounded-full px-5' : 'rounded-lg px-4',
      unPadded && '-mx-4 -my-2.5',
    ],
    propsClassName,
  ]}
  onclick={onClick}
  {type}
  {disabled}
  {href}
  role={tag}
  target={tag === 'a' ? target : undefined}
>
  {@render children()}
</svelte:element>
