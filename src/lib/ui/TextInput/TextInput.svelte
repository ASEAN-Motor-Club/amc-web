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
  }: TextInputProps = $props();

  const inputGroupContext = getInputGroupContext();

  const placeholder = $derived(propsPlaceholder ?? inputGroupContext?.label ?? '');

  const contextId = inputGroupContext?.getId();

  const id = $derived(propsId ?? contextId ?? '');

  const variantClasses = $derived.by(() => {
    switch (variant) {
      case 'contained': {
        const baseClasses =
          'focus:outline-solid focus:bg-neutral-500/10 dark:focus:bg-neutral-500/10';
        if (error) {
          return `${baseClasses} placeholder-error-500 dark:placeholder-error-700 bg-error-500/20 dark:bg-error-600/10 hover:bg-error-500/30 group-hover:bg-error-500/30 dark:hover:bg-error-600/20 dark:group-hover:bg-error-600/20 outline-error-500 dark:outline-error-800`;
        } else {
          return `${baseClasses} bg-neutral-900/10 outline-neutral-400 hover:bg-neutral-900/20 group-hover:bg-neutral-900/20 dark:bg-neutral-100/10 dark:outline-neutral-600 dark:hover:bg-neutral-100/20 dark:group-hover:bg-neutral-100/20`;
        }
      }
      case 'outlined': {
        const borderBase = 'border bg-white dark:bg-neutral-900';
        if (error) {
          return `${borderBase} placeholder-error-400 dark:placeholder-error-800 border-error-400 dark:border-error-800 dark:hover:border-error-600 dark:group-hover:border-error-600 hover:border-error-600 group-hover:border-error-600 focus:border-error-500 focus:dark:border-error-700`;
        } else {
          return `${borderBase} border-neutral-400 hover:border-neutral-600 focus:border-neutral-500 group-hover:border-neutral-600 dark:border-neutral-700 dark:hover:border-neutral-400 dark:group-hover:border-neutral-400`;
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

<input
  class={twMerge(
    'flex flex-none items-center outline-none transition-colors',
    variantClasses,
    sizeClasses,
    disabled && 'pointer-events-none opacity-50',
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
