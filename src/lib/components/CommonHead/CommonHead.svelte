<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    class?: string;
    children: Snippet;
  };

  const { class: className, children }: Props = $props();
</script>

<div class={['flex justify-between p-8', className]}>
  <h1 class="text-5xl font-bold">{@render children()}</h1>
</div>
