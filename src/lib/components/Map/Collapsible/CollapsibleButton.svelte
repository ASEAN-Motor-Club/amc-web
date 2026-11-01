<script lang="ts">
  import Button from '#lib/ui/Button/Button.svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import type { ClassValue } from 'svelte/elements';

  interface Props {
    class: ClassValue;
    href: string;
    icon: string;
    text?: string;
    /** Marks the tab whose panel is open */
    current?: boolean;
  }

  const { class: propsClass, href, icon, text, current = false }: Props = $props();
</script>

<Button
  class={['flex-col rounded-none bg-gray-500/10 text-[0.625rem] font-normal', propsClass]}
  variant="contained-light"
  tag="a"
  {href}
  aria-current={current ? 'page' : undefined}
>
  <Icon class={icon} />
  {text}
</Button>
