<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Color } from '../shared';
  import type { ClassValue, MouseEventHandler } from 'svelte/elements';
  import { setBtnIconSizeContext } from './context';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';

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
     * Content to be rendered inside the button component
     */
    children: Snippet;
    /**
     * Round the button corners
     * @default false
     */
    round?: boolean;
    /**
     * Whether the button should be disabled
     * @default false
     */
    disabled?: boolean;
    /**
     * Whether the render a button as an icon button
     * @default false
     */
    icon?: boolean;
    /**
     * prepend Icon to the button, size will be automatically adjust
     */
    prependIcon?: Snippet;
    /**
     * append Icon to the button, size will be automatically adjust
     */
    appendIcon?: Snippet;
  } & (
    | {
        /**
         * The HTML tag to render the button as
         * @default 'button'
         */
        tag?: 'button';
        /**
         * The HTML button type attribute
         * @default 'button'
         */
        type?: 'button' | 'submit' | 'reset';
        /**
         * Event handler for button clicks
         */
        onClick?: MouseEventHandler<HTMLButtonElement>;
      }
    | {
        /**
         * The HTML tag to render the button as
         */
        tag: 'a';
        /**
         * The href attribute for the button if it is an anchor tag
         */
        href: string;
        /**
         * The target attribute for the button if it is an anchor tag
         */
        target?: '_blank' | '_self' | '_parent' | '_top';
        /**
         * The rel attribute for the button if it is an anchor tag
         */
        rel?: string;
        /**
         * Event handler for button clicks
         */
        onClick?: MouseEventHandler<HTMLAnchorElement>;
      }
    | {
        /**
         * The HTML tag to render the button as
         */
        tag: 'div';
        /**
         * Event handler for button clicks
         */
        onClick?: MouseEventHandler<HTMLDivElement>;
      }
  );

  const {
    children,
    color = 'neutral',
    variant = 'contained',
    size = 'md',
    onClick,
    class: propsClassName,
    round,
    disabled,
    icon = false,
    prependIcon,
    appendIcon,
    ...props
  }: ButtonProps = $props();

  setBtnIconSizeContext({
    getSize: () => size,
  });

  const variantClassName = $derived.by(() => {
    switch (variant) {
      case 'contained': {
        const containedBase = 'text-text-dark';
        switch (color) {
          case 'primary':
            return `${containedBase} bg-primary-700 hover:bg-primary-600 active:bg-primary-800`;
          case 'secondary':
            return `${containedBase} bg-secondary-700 hover:bg-secondary-600 active:bg-secondary-800`;
          case 'info':
            return `${containedBase} bg-info-700 hover:bg-info-600 active:bg-info-800`;
          case 'success':
            return `${containedBase} bg-success-700 hover:bg-success-600 active:bg-success-800`;
          case 'warning':
            return `${containedBase} bg-warning-700 hover:bg-warning-600 active:bg-warning-800`;
          case 'error':
            return `${containedBase} bg-error-700 hover:bg-error-600 active:bg-error-800`;
          case 'neutral':
            return `${containedBase} bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800`;
          default:
            return '';
        }
      }
      case 'contained-light': {
        const containedLightBase = 'text-text dark:text-text-dark';
        switch (color) {
          case 'primary':
            return `${containedLightBase} bg-primary-700/10 hover:bg-primary-600/20 active:bg-primary-800/20`;
          case 'secondary':
            return `${containedLightBase} bg-secondary-700/10 hover:bg-secondary-600/20 active:bg-secondary-800/20`;
          case 'info':
            return `${containedLightBase} bg-info-700/10 hover:bg-info-600/20 active:bg-info-800/20`;
          case 'success':
            return `${containedLightBase} bg-success-700/10 hover:bg-success-600/20 active:bg-success-800/20`;
          case 'warning':
            return `${containedLightBase} bg-warning-700/10 hover:bg-warning-600/20 active:bg-warning-800/20`;
          case 'error':
            return `${containedLightBase} bg-error-700/10 hover:bg-error-600/20 active:bg-error-800/20`;
          case 'neutral':
            return `${containedLightBase} bg-neutral-700/10 hover:bg-neutral-600/20 active:bg-neutral-800/20`;
          default:
            return '';
        }
      }
      case 'outlined': {
        const outlinedBase = 'border';
        switch (color) {
          case 'primary':
            return `${outlinedBase} text-primary-700 dark:text-primary-500 hover:bg-primary-700/10 border-primary-700 dark:border-primary-500 active:bg-primary-700/15`;
          case 'secondary':
            return `${outlinedBase} text-secondary-700 dark:text-secondary-500 hover:bg-secondary-700/10 border-secondary-700 dark:border-secondary-500 active:bg-secondary-700/15`;
          case 'info':
            return `${outlinedBase} text-info-700 dark:text-info-500 hover:bg-info-700/10 border-info-700 dark:border-info-500 active:bg-info-700/15`;
          case 'success':
            return `${outlinedBase} text-success-700 dark:text-success-500 hover:bg-success-700/10 border-success-700 dark:border-success-500 active:bg-success-700/15`;
          case 'warning':
            return `${outlinedBase} text-warning-700 dark:text-warning-500 hover:bg-warning-700/10 border-warning-700 dark:border-warning-500 active:bg-warning-700/15`;
          case 'error':
            return `${outlinedBase} text-error-700 dark:text-error-500 hover:bg-error-700/10 border-error-700 dark:border-error-500 active:bg-error-700/15`;
          case 'neutral':
            return `${outlinedBase} text-neutral-600 dark:text-neutral-400 hover:bg-neutral-700/10 border-neutral-700 dark:border-neutral-500 active:bg-neutral-700/15`;
          default:
            return '';
        }
      }
      case 'text': {
        switch (color) {
          case 'primary':
            return `text-primary-700 dark:text-primary-500 hover:bg-primary-700/10 active:bg-primary-800/20`;
          case 'secondary':
            return `text-secondary-700 dark:text-secondary-500 hover:bg-secondary-700/10 active:bg-secondary-800/20`;
          case 'info':
            return `text-info-700 dark:text-info-500 hover:bg-info-700/10 active:bg-info-800/20`;
          case 'success':
            return `text-success-700 dark:text-success-500 hover:bg-success-700/10 active:bg-success-800/20`;
          case 'warning':
            return `text-warning-700 dark:text-warning-500 hover:bg-warning-700/10 active:bg-warning-800/20`;
          case 'error':
            return `text-error-700 dark:text-error-500 hover:bg-error-700/10 active:bg-error-800/20`;
          case 'neutral':
            return 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-700/10 active:bg-neutral-800/20';
          default:
            return '';
        }
      }
      default:
        return '';
    }
  });

  const sizeClasses = $derived.by(() => {
    switch (size) {
      case 'xs':
        return `h-5 text-xs ${round ? 'rounded-full px-2' : 'rounded-sm px-1.5'}`;
      case 'sm':
        return `h-8 text-sm ${round ? 'rounded-full px-3' : 'rounded-sm px-2'}`;
      case 'md':
        return `h-10 text-base ${round ? 'rounded-full px-4' : 'rounded-md px-3'}`;
      case 'lg':
        return `h-12 text-lg ${round ? 'rounded-full px-5' : 'rounded-lg px-4'}`;
      default:
        return '';
    }
  });
</script>

<svelte:element
  this={props.tag ?? 'button'}
  class={twMerge(
    'inline-flex flex-none cursor-pointer items-center justify-center leading-none font-semibold whitespace-nowrap transition-colors select-none',
    variantClassName,
    sizeClasses,
    icon && 'aspect-square p-0',
    disabled && 'pointer-events-none opacity-50',
    clsx(propsClassName),
  )}
  onclick={onClick as MouseEventHandler<HTMLDivElement>}
  type={props.tag === 'button' || props.tag === undefined ? (props.type ?? 'button') : undefined}
  {disabled}
  href={props.tag === 'a' ? props.href : undefined}
  role={props.tag ?? 'button'}
  target={props.tag === 'a' ? props.target : undefined}
  rel={props.tag === 'a' ? props.rel : undefined}
>
  {#if prependIcon}
    <span
      class={[
        'inline-flex',
        {
          'mr-0.5 -ml-0.25': size === 'xs',
          'mr-1 -ml-0.5': size === 'sm',
          'mr-2 -ml-1': size === 'md',
          'mr-2.5 -ml-2': size === 'lg',
        },
      ]}
    >
      {@render prependIcon()}
    </span>
  {/if}
  {@render children()}
  {#if appendIcon}
    <span
      class={[
        'inline-flex',
        {
          '-mr-0.25 ml-0.5': size === 'xs',
          '-mr-0.5 ml-1': size === 'sm',
          '-mr-1 ml-2': size === 'md',
          '-mr-2 ml-2.5': size === 'lg',
        },
      ]}
    >
      {@render appendIcon()}
    </span>
  {/if}
</svelte:element>
