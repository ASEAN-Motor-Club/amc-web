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
  }
</script>

<script generics="T extends string | number" lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { getInputGroupContext } from '../InputGroup/context';
  import type { Snippet } from 'svelte';
  import TextInput from '../TextInput/TextInput.svelte';
  import Card from '../Card/Card.svelte';
  import ClickAwayBlock from '../ClickAwayBlock/ClickAwayBlock.svelte';
  import { slide } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { setSelectContext } from './context';
  import { SvelteMap } from 'svelte/reactivity';
  import Icon from '../Icon/Icon.svelte';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';
  import { prefersReducedMotion } from 'svelte/motion';
  import { activeSelect } from './activeSelect.svelte';

  const {
    value,
    placeholder: propsPlaceholder,
    name,
    class: propsClassname,
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

<div class={twMerge('relative flex w-full items-center', clsx(propsClassname))}>
  <button class="group w-full cursor-pointer" onclick={handleInputClick}>
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
      {id}
      {disabled}
    />
  </button>

  <Icon
    class={[
      'i-material-symbols:arrow-drop-down-rounded pointer-events-none absolute right-px mx-1.5 motion-safe:transition-transform',
      uniqueOpen && 'rotate-180',
    ]}
    size="!text-[1.75rem]"
  />

  <ClickAwayBlock onClickAway={() => (open = false)} active={open}>
    {#if uniqueOpen}
      <div
        class="z-6000 absolute top-full mt-1 w-full"
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : defaultTransitionDurationMs,
        }}
      >
        <Card
          class={twMerge(
            'flex w-full cursor-pointer select-none flex-col overflow-y-auto p-0',
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
