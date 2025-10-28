<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    children: Snippet;
  }

  const { class: propsClass, children }: Props = $props();
</script>

<div class={['flex p-8', propsClass]}>
  <h1 class="font-sans-em w-full text-5xl font-bold tracking-wide">{@render children()}</h1>
</div>
