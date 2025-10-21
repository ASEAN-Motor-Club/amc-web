<script lang="ts">
  import Button from '$lib/ui/Button/Button.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { Color } from '$lib/ui/shared';
  import type { ClassValue } from 'svelte/elements';
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';

  interface Props {
    class?: ClassValue;
    color: Color;
    href: string;
    icon: string;
  }

  const { class: className, href, icon, color }: Props = $props();
</script>

<div
  transition:slide={{
    duration: prefersReducedMotion.current ? 0 : 1000,
    axis: 'y',
  }}
>
  <Button
    class={['size-11 flex-none rounded-none', className]}
    icon
    variant="contained-light"
    {color}
    tag="a"
    {href}
  >
    <Icon class={icon} />
  </Button>
</div>
