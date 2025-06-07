<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Color } from '../shared';
  import type { MouseEventHandler } from 'svelte/elements';

  type Props = {
    children: Snippet;
    color?: Color;
    variant?: 'text' | 'contained' | 'contained-light' | 'outlined';
    size?: 'small' | 'medium' | 'large';
    type?: 'button' | 'submit' | 'reset';
    onClick?: MouseEventHandler<HTMLButtonElement>;
  };

  const {
    children,
    color = 'neutral',
    variant = 'contained',
    size = 'medium',
    type = 'button',
    onClick,
  }: Props = $props();

  const variantStyles = $derived.by(() => {
    switch (variant) {
      case 'contained':
        switch (color) {
          case 'primary':
            return 'text-text-dark bg-primary-700 hover:bg-primary-800 active:bg-primary-600';
          case 'secondary':
            return 'text-text-dark bg-secondary-700 hover:bg-secondary-800 active:bg-secondary-600';
          case 'info':
            return 'text-text-dark bg-info-700 hover:bg-info-800 active:bg-info-600';
          case 'success':
            return 'text-text-dark bg-success-700 hover:bg-success-800 active:bg-success-600';
          case 'warning':
            return 'text-text-dark bg-warning-700 hover:bg-warning-800 active:bg-warning-600';
          case 'error':
            return 'text-text-dark bg-error-700 hover:bg-error-800 active:bg-error-600';
          case 'neutral':
            return 'text-text-dark bg-neutral-700 hover:bg-neutral-800 active:bg-neutral-600';
        }
      case 'contained-light':
        switch (color) {
          case 'primary':
            return 'text-text dark:text-text-dark bg-primary-700/10 hover:bg-primary-600/20 active:bg-primary-800/20';
          case 'secondary':
            return 'text-text dark:text-text-dark bg-secondary-700/10 hover:bg-secondary-600/20 active:bg-secondary-800/20';
          case 'info':
            return 'text-text dark:text-text-dark bg-info-700/10 hover:bg-info-600/20 active:bg-info-800/20';
          case 'success':
            return 'text-text dark:text-text-dark bg-success-700/10 hover:bg-success-600/20 active:bg-success-800/20';
          case 'warning':
            return 'text-text dark:text-text-dark bg-warning-700/10 hover:bg-warning-600/20 active:bg-warning-800/20';
          case 'error':
            return 'text-text dark:text-text-dark bg-error-700/10 hover:bg-error-600/20 active:bg-error-800/20';
          case 'neutral':
            return 'text-text dark:text-text-dark bg-neutral-700/10 hover:bg-neutral-600/20 active:bg-neutral-800/20';
        }
      case 'outlined':
        switch (color) {
          case 'primary':
            return 'text-primary-700 dark:text-primary-500 hover:bg-primary-700/10 border-primary-700 dark:border-primary-500 border active:bg-primary-600/20';
          case 'secondary':
            return 'text-secondary-700 dark:text-secondary-500 hover:bg-secondary-700/10 border-secondary-700 dark:border-secondary-500 border active:bg-secondary-600/20';
          case 'info':
            return 'text-info-700 dark:text-info-500 hover:bg-info-700/10 border-info-700 dark:border-info-500 border active:bg-info-600/20';
          case 'success':
            return 'text-success-700 dark:text-success-500 hover:bg-success-700/10 border-success-700 dark:border-success-500 border active:bg-success-600/20';
          case 'warning':
            return 'text-warning-700 dark:text-warning-500 hover:bg-warning-700/10 border-warning-700 dark:border-warning-500 border active:bg-warning-600/20';
          case 'error':
            return 'text-error-700 dark:text-error-500 hover:bg-error-700/10 border-error-700 dark:border-error-500 border active:bg-error-600/20';
          case 'neutral':
            return 'text-neutral-700 dark:text-neutral-500 hover:bg-neutral-700/10 border-neutral-700 dark:border-neutral-500 border active:bg-neutral-600/20';
        }
      case 'text':
        switch (color) {
          case 'primary':
            return 'text-primary-700 dark:text-primary-500 hover:bg-primary-700/10 active:bg-primary-600/20';
          case 'secondary':
            return 'text-secondary-700 dark:text-secondary-500 hover:bg-secondary-700/10 active:bg-secondary-600/20';
          case 'info':
            return 'text-info-700 dark:text-info-500 hover:bg-info-700/10 active:bg-info-600/20';
          case 'success':
            return 'text-success-700 dark:text-success-500 hover:bg-success-700/10 active:bg-success-600/20';
          case 'warning':
            return 'text-warning-700 dark:text-warning-500 hover:bg-warning-700/10 active:bg-warning-600/20';
          case 'error':
            return 'text-error-700 dark:text-error-500 hover:bg-error-700/10 active:bg-error-600/20';
          case 'neutral':
            return 'text-neutral-700 dark:text-neutral-500 hover:bg-neutral-700/10 active:bg-neutral-600/20';
        }
    }
  });

  const sizeClassName = $derived.by(() => {
    switch (size) {
      case 'small':
        return 'text-sm px-2 rounded-sm h-8';
      case 'medium':
        return 'text-base px-3 rounded-md h-10';
      case 'large':
        return 'text-lg px-4 rounded-lg h-12';
    }
  });
  const className = $derived.by(() => [
    'font-semibold cursor-pointer transition-colors leading-none',
    variantStyles,
    sizeClassName,
  ]);
</script>

<button class={className} onclick={onClick} {type}>
  {@render children()}
</button>
