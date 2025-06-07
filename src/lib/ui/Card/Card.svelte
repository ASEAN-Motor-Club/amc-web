<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    class?: ClassValue;
    children: Snippet;
  };

  const { children, class: className }: Props = $props();
</script>

<div
  class={[
    'rounded-md p-4 shadow-md ring ring-black/5 dark:shadow-white/3 dark:ring-white/5',
    className,
  ]}
>
  {@render children()}
</div>
