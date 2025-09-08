<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    children: Snippet;
  }

  const { class: className, children }: Props = $props();
</script>

<div class={['flex p-8', className]}>
  <h1 class="text-5xl font-bold tracking-tight">{@render children()}</h1>
</div>
