<script lang="ts">
  import type {
    ChangeEventHandler,
    ClassValue,
    FocusEventHandler,
    FormEventHandler,
    FullAutoFill,
    HTMLInputAttributes,
  } from 'svelte/elements';
  import { getInputGroupContext } from '../InputGroup/context';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';
  import Button from '../Button/Button.svelte';
  import Icon from '../Icon/Icon.svelte';

  export interface TextInputProps {
    /**
     * The value of the input
     */
    value: unknown;
    /**
     * The name attribute for the input
     */
    name: string;
    /**
     * The placeholder text for the input
     */
    placeholder?: string;
    /**
     * The HTML input type attribute
     * @default 'text'
     */
    type?: 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url';
    /**
     * CSS class to apply to the input component
     */
    class?: ClassValue;
    /**
     * Show an error state for the input
     * @default false
     */
    error?: boolean;
    /**
     * The visual style variant of the input
     * @default 'outlined'
     */
    variant?: 'contained' | 'outlined';
    /**
     * The size of the input
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg';
    /**
     * Round the button corners
     * @default false
     */
    round?: boolean;
    /**
     * Event handler for input changes
     */
    onChange?: ChangeEventHandler<HTMLInputElement>;
    /**
     * Event handler for input changes (fire after every input)
     */
    onInput?: FormEventHandler<HTMLInputElement>;
    /**
     * Autocomplete attribute for the input
     * @default 'off'
     */
    autocomplete?: FullAutoFill;
    /**
     * Event handler for focus changes
     */
    onFocus?: FocusEventHandler<HTMLInputElement>;
    /**
     * Event handler for input changes
     */
    onBlur?: FocusEventHandler<HTMLInputElement>;
    /**
     * Whether the input is disabled
     * @default false
     */
    disabled?: boolean;
    /**
     * The id of the input element
     */
    id?: string;
    /**
     * Additional HTMLInputAttributes to apply to the input element like `aria-*`, `data-*`, etc.
     */
    additionalAttributes?: Omit<
      HTMLInputAttributes,
      | 'class'
      | 'onchange'
      | 'type'
      | 'autocomplete'
      | 'value'
      | 'placeholder'
      | 'name'
      | 'size'
      | 'disabled'
    >;
    onClear?: () => void;
    clearBtnClass?: ClassValue;
  }

  const {
    onChange,
    onInput,
    type = 'text',
    autocomplete = 'off',
    value,
    placeholder: propsPlaceholder,
    name,
    class: propsClassname,
    error = false,
    variant = 'outlined',
    size = 'md',
    round = false,
    id: propsId,
    onFocus,
    onBlur,
    disabled,
    additionalAttributes,
    onClear,
    clearBtnClass,
  }: TextInputProps = $props();

  const inputGroupContext = getInputGroupContext();

  const placeholder = $derived(propsPlaceholder ?? inputGroupContext?.label ?? '');

  const contextId = inputGroupContext?.getId();

  const id = $derived(propsId ?? contextId ?? '');

  const variantClasses = $derived.by(() => {
    switch (variant) {
      case 'contained': {
        const baseClasses =
          'focus:outline-solid focus:outline-1 focus:bg-neutral-500/10 dark:focus:bg-neutral-500/10';
        if (error) {
          return `${baseClasses} placeholder-error-500 dark:placeholder-error-700 bg-error-500/20 dark:bg-error-600/10 hover:bg-error-500/30 group-hover:bg-error-500/30 dark:hover:bg-error-600/20 dark:group-hover:bg-error-600/20 outline-error-500 dark:outline-error-800`;
        } else {
          return `${baseClasses} bg-neutral-900/10 outline-neutral-400 hover:bg-neutral-900/20 group-hover:bg-neutral-900/20 dark:bg-neutral-100/10 dark:outline-neutral-600 dark:hover:bg-neutral-100/20 dark:group-hover:bg-neutral-100/20`;
        }
      }
      case 'outlined': {
        const borderBase = 'border bg-white dark:bg-neutral-900';
        if (error) {
          return `${borderBase} placeholder-error-400 dark:placeholder-error-800 border-error-400 dark:border-error-800 dark:hover:border-error-500 dark:group-hover:border-error-500 hover:border-error-500 group-hover:border-error-500 focus:border-error-600 focus:dark:border-error-600`;
        } else {
          return `${borderBase} border-neutral-400 hover:border-neutral-500 focus:border-neutral-600 group-hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-600 dark:group-hover:border-neutral-600`;
        }
      }
      default:
        return '';
    }
  });

  const sizeClasses = $derived.by(() => {
    switch (size) {
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

<div class="relative flex flex-none items-center">
  <input
    class={twMerge(
      'flex w-full items-center transition-colors outline-none',
      variantClasses,
      sizeClasses,
      disabled && 'pointer-events-none opacity-50',
      onClear && 'pr-10',
      clsx(propsClassname),
    )}
    onchange={onChange}
    oninput={onInput}
    {type}
    {autocomplete}
    {value}
    {placeholder}
    {name}
    {id}
    {disabled}
    {...additionalAttributes}
    onfocus={onFocus}
    onblur={onBlur}
  />
  {#if onClear && value}
    <Button
      class={twMerge('text-text dark:text-text-dark absolute right-0 mx-1', clsx(clearBtnClass))}
      variant="text"
      size="sm"
      onClick={() => onClear()}
      icon
    >
      <Icon class="i-material-symbols:close-rounded" size="!text-lg" />
    </Button>
  {/if}
</div>
