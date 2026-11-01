<script lang="ts" module>
  export interface SelectProps<T> {
    /**
     * The value of the input (id)
     */
    value: T;
    /**
     * Menu items to display in the input
     */
    children: Snippet;
    /**
     * The name attribute for the input
     */
    name: string;
    /**
     * The placeholder text for the input
     */
    placeholder?: string;
    /**
     * CSS class to apply to the component
     */
    class?: ClassValue;
    /**
     * CSS class to apply to the input component
     */
    inputClass?: ClassValue;
    /**
     * CSS class to apply to the menu component
     */
    menuClass?: ClassValue;
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
    onChange?: (id: T) => void;
    /**
     * Whether the input is disabled
     * @default false
     */
    disabled?: boolean;
    /**
     * The id of the input
     */
    id?: string;
    /** Accessible name when no InputGroup label is associated with the select */
    'aria-label'?: string;
  }
</script>

<script generics="T extends string | number" lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { getInputGroupContext } from '../InputGroup/context.ts';
  import type { Snippet } from 'svelte';
  import TextInput from '../TextInput/TextInput.svelte';
  import Card from '../Card/Card.svelte';
  import ClickAwayBlock from '../ClickAwayBlock/ClickAwayBlock.svelte';
  import { slide } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '#lib/tw-var.ts';
  import { setSelectContext } from './context.ts';
  import { SvelteMap } from 'svelte/reactivity';
  import Icon from '../Icon/Icon.svelte';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';
  import { prefersReducedMotion } from 'svelte/motion';
  import { activeSelect } from './activeSelect.svelte.ts';

  const {
    value,
    placeholder: propsPlaceholder,
    name,
    class: propsClass,
    error = false,
    variant = 'outlined',
    size = 'md',
    round = false,
    id: propsId,
    disabled,
    children,
    inputClass,
    menuClass,
    onChange,
    'aria-label': ariaLabel,
  }: SelectProps<T> = $props();

  const uid = Math.random().toString(36).substring(2, 15);

  const inputGroupContext = getInputGroupContext();

  const placeholder = $derived(propsPlaceholder ?? inputGroupContext?.label ?? '');

  const contextId = inputGroupContext?.getId();

  const id = $derived(propsId ?? contextId ?? '');

  let open = $state(false);

  const handleInputClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    open = !open;
  };

  const optionMap = new SvelteMap<T, string>();

  setSelectContext<T>({
    onSelect: (id) => {
      onChange?.(id);
      open = false;
    },
    addOption: (id, value) => {
      optionMap.set(id, value);
    },
    getOption: (id) => optionMap.get(id) ?? '',
  });

  const displayedValue = $derived(optionMap.get(value) ?? '');

  $effect(() => {
    if (open) {
      activeSelect.a = uid;
    } else if (activeSelect.a === uid) {
      activeSelect.a = undefined;
    }
  });

  const uniqueOpen = $derived(open && activeSelect.a === uid);
</script>

<div class={twMerge('group relative flex w-full items-center', clsx(propsClass))}>
  <!-- The input is display-only: hidden from AT and covered by the trigger button rather than nested
       inside it, since a focusable control inside a button is announced inconsistently. The button
       carries the id so an InputGroup <label for> names it. -->
  <!-- TextInput's root is flex-none; this wrapper keeps it at the select's width. -->
  <div class="w-full min-w-0">
    <TextInput
      class={twMerge('pointer-events-none w-full pr-10', clsx(inputClass))}
      type="text"
      autocomplete="off"
      value={displayedValue}
      {round}
      {size}
      {variant}
      {error}
      {placeholder}
      {name}
      {disabled}
      additionalAttributes={{ tabindex: -1, readonly: true, 'aria-hidden': 'true' }}
    />
  </div>
  <button
    type="button"
    class={twMerge(
      'absolute inset-0 cursor-pointer outline-offset-2',
      round ? 'rounded-full' : 'rounded-md',
    )}
    onclick={handleInputClick}
    id={id || undefined}
    aria-label={ariaLabel}
    aria-expanded={uniqueOpen}
    {disabled}
  >
    <span class="sr-only">{displayedValue || placeholder}</span>
  </button>

  <Icon
    class={[
      'i-material-symbols:arrow-drop-down-rounded pointer-events-none absolute right-0 mx-1.5 motion-safe:transition-transform',
      uniqueOpen && 'rotate-180',
    ]}
    size="!text-[1.75rem]"
  />

  <ClickAwayBlock onClickAway={() => (open = false)} active={open}>
    {#if uniqueOpen}
      <div
        class="absolute top-full z-6000 mt-1 w-full"
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs,
        }}
      >
        <Card
          class={twMerge(
            'flex w-full cursor-pointer flex-col overflow-y-auto p-0 select-none',
            clsx(menuClass),
          )}
        >
          {@render children()}
        </Card>
      </div>
    {:else}
      <div class="hidden">
        {@render children()}
      </div>
    {/if}
  </ClickAwayBlock>
</div>
