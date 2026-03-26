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
    class: propsClass,
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

  const variantClass = $derived.by(() => {
    switch (variant) {
      case 'contained': {
        const baseClass =
          'focus:outline-solid focus:outline-1 focus:bg-gray-500/10 dark:focus:bg-gray-500/10';
        if (error) {
          return `${baseClass} placeholder-danger-500 dark:placeholder-danger-700 bg-danger-500/20 dark:bg-danger-600/10 hover:bg-danger-500/30 group-hover:bg-danger-500/30 dark:hover:bg-danger-600/20 dark:group-hover:bg-danger-600/20 outline-danger-500 dark:outline-danger-800`;
        } else {
          return `${baseClass} bg-gray-900/10 outline-gray-400 hover:bg-gray-900/20 group-hover:bg-gray-900/20 dark:bg-gray-100/10 dark:outline-gray-600 dark:hover:bg-gray-100/20 dark:group-hover:bg-gray-100/20`;
        }
      }
      case 'outlined': {
        const borderBase = 'border bg-white dark:bg-gray-900';
        if (error) {
          return `${borderBase} placeholder-danger-400 dark:placeholder-danger-800 border-danger-400 dark:border-danger-800 dark:hover:border-danger-500 dark:group-hover:border-danger-500 hover:border-danger-500 group-hover:border-danger-500 focus:border-danger-600 focus:dark:border-danger-600`;
        } else {
          return `${borderBase} border-gray-400 hover:border-gray-500 focus:border-gray-600 group-hover:border-gray-500 dark:border-gray-700 dark:hover:border-gray-600 dark:group-hover:border-gray-600`;
        }
      }
      default:
        return '';
    }
  });

  const sizeClass = $derived.by(() => {
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
      variantClass,
      sizeClass,
      disabled && 'pointer-events-none opacity-50',
      onClear && 'pr-10',
      clsx(propsClass),
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
