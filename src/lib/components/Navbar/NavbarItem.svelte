<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    href,
    label,
    icon,
    onClick,
  }: {
    href: string;
    label: string;
    icon: Snippet;
    onClick: () => void;
  } = $props();
</script>

<a {href} class="group flex items-center gap-1" onclick={onClick}>
  {@render icon()}
  <span class="leading-none group-hover:underline">{label}</span>
</a>
