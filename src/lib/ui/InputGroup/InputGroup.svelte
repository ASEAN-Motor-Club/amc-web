<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { setInputGroupContext } from './context';

  interface Props {
    /**
     * The label text for the input group
     */
    label: string;
    /**
     * CSS class to apply to the input group container
     */
    class?: ClassValue;
    /**
     * CSS class to apply to the label
     */
    labelClass?: ClassValue;
    /**
     * Content slot for the input elements
     */
    children: Snippet;
    /**
     * Optional items to render at the end of the input group label
     */
    appendLabel?: Snippet;
    /**
     * Optional index to focus on a specific input element when click on the label
     * @default 0
     */
    focusIndex?: number;
  }
  const {
    label,
    appendLabel,
    class: className,
    labelClass,
    children,
    focusIndex = 0,
  }: Props = $props();

  const id = `input-group-${Math.random().toString(36).substring(2, 15)}`;

  let itemCount = $state(0);

  setInputGroupContext({
    get label() {
      return label;
    },
    getId: () => {
      const item = itemCount++;
      return `${id}-${item}`;
    },
  });
</script>

<div class={['flex flex-col gap-1', className]}>
  <div
    class={[
      'text-text/80 dark:text-text-dark/80 flex items-center justify-between text-xs font-semibold',
      labelClass,
    ]}
  >
    <label for={`${id}-${focusIndex}`}>{label}</label>
    {@render appendLabel?.()}
  </div>
  {@render children()}
</div>
