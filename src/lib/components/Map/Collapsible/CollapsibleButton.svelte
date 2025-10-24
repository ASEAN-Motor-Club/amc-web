<script lang="ts">
  import Button from '$lib/ui/Button/Button.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import type { ClassValue } from 'svelte/elements';

  interface Props {
    class: ClassValue;
    href: string;
    icon: string;
    text?: string;
  }

  const { class: propsClass, href, icon, text }: Props = $props();
</script>

<Button
  class={['flex-col rounded-none bg-neutral-500/10 text-[0.625rem] font-normal', propsClass]}
  variant="contained-light"
  tag="a"
  {href}
>
  <Icon class={icon} />
  {text}
</Button>
