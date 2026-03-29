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
     * @default 'gray'
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
    size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
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
    color = 'gray',
    variant = 'contained',
    size = 'md',
    onClick,
    class: propsClass,
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

  const variantClass = $derived.by(() => {
    switch (variant) {
      case 'contained': {
        const containedBase = 'text-text-dark';
        switch (color) {
          case 'primary':
            return `${containedBase} bg-primary-700 hover:bg-primary-600 active:bg-primary-800`;
          case 'danger':
            return `${containedBase} bg-danger-700 hover:bg-danger-600 active:bg-danger-800`;
          case 'gray':
            return `${containedBase} bg-gray-700 hover:bg-gray-600 active:bg-gray-800`;
          default:
            return containedBase;
        }
      }
      case 'contained-light': {
        const containedLightBase = 'text-text dark:text-text-dark';
        switch (color) {
          case 'primary':
            return `${containedLightBase} bg-primary-700/10 hover:bg-primary-600/20 active:bg-primary-800/20`;
          case 'danger':
            return `${containedLightBase} bg-danger-700/10 hover:bg-danger-600/20 active:bg-danger-800/20`;
          case 'gray':
            return `${containedLightBase} bg-gray-700/10 hover:bg-gray-600/20 active:bg-gray-800/20`;
          default:
            return containedLightBase;
        }
      }
      case 'outlined': {
        const outlinedBase = 'border';
        switch (color) {
          case 'primary':
            return `${outlinedBase} text-primary-700 dark:text-primary-500 hover:bg-primary-700/10 border-primary-700 dark:border-primary-500 active:bg-primary-700/15`;
          case 'danger':
            return `${outlinedBase} text-danger-700 dark:text-danger-500 hover:bg-danger-700/10 border-danger-700 dark:border-danger-500 active:bg-danger-700/15`;
          case 'gray':
            return `${outlinedBase} text-gray-600 dark:text-gray-400 hover:bg-gray-700/10 border-gray-700 dark:border-gray-500 active:bg-gray-700/15`;
          default:
            return outlinedBase;
        }
      }
      case 'text': {
        switch (color) {
          case 'primary':
            return `text-primary-700 dark:text-primary-500 hover:bg-primary-700/10 active:bg-primary-800/20`;
          case 'danger':
            return `text-danger-700 dark:text-danger-500 hover:bg-danger-700/10 active:bg-danger-800/20`;
          case 'gray':
            return 'text-gray-600 dark:text-gray-400 hover:bg-gray-700/10 active:bg-gray-800/20';
          default:
            return '';
        }
      }
      default:
        return '';
    }
  });

  const sizeClass = $derived.by(() => {
    switch (size) {
      case 'xxs':
        return `h-4 text-[10px] ${round ? 'rounded-full px-1.5' : 'rounded-sm px-1'}`;
      case 'xs':
        return `h-5 text-xs ${round ? 'rounded-full px-2' : 'rounded-sm px-1.5'}`;
      case 'sm':
        return `h-8 text-sm ${round ? 'rounded-full px-3' : 'rounded-md px-2'}`;
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
    variantClass,
    sizeClass,
    icon && 'aspect-square p-0',
    disabled && 'pointer-events-none opacity-50',
    clsx(propsClass),
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
