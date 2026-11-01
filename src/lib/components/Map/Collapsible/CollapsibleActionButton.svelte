<script lang="ts">
  import Button from '#lib/ui/Button/Button.svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import type { Color } from '#lib/ui/shared.ts';
  import type { ClassValue } from 'svelte/elements';
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';

  interface Props {
    class?: ClassValue;
    color: Color;
    href: string;
    icon: string;
    /** Accessible name, the button shows only an icon */
    label: string;
  }

  const { class: propsClass, href, icon, color, label }: Props = $props();
</script>

<div
  transition:slide={{
    duration: prefersReducedMotion.current ? 0 : 1000,
    axis: 'y',
  }}
>
  <Button
    class={['size-11 flex-none rounded-none', propsClass]}
    icon
    variant="contained-light"
    {color}
    tag="a"
    {href}
    aria-label={label}
  >
    <Icon class={icon} />
  </Button>
</div>
