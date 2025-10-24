<script lang="ts" module>
  export interface SelectOptionProps<T> {
    /**
     * The id of the option
     */
    id: T;
    /**
     * Value to display after selected
     */
    value: string;
    /**
     * Class to apply to the option
     */
    class?: ClassValue;
    /**
     * The content of the option, leave empty to use value
     */
    children?: Snippet;
  }
</script>

<script lang="ts" generics="T extends string | number">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { getSelectContext } from './context';
  import clsx from 'clsx';
  import { twMerge } from 'tailwind-merge';

  const { id, value, class: propsClass, children }: SelectOptionProps<T> = $props();

  const { onSelect, addOption, getOption } = getSelectContext<T>();

  function handleClick() {
    onSelect(id);
  }

  $effect(() => {
    if (getOption(id) === value) {
      return;
    }
    addOption(id, value);
  });
</script>

<button
  class={twMerge(
    'cursor-pointer px-4 py-2 text-left transition-colors hover:bg-neutral-500/10 active:bg-neutral-500/15',
    clsx(propsClass),
  )}
  onclick={handleClick}
>
  {#if children}
    {@render children()}
  {:else}
    {value}
  {/if}
</button>
