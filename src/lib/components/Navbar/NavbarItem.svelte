<script lang="ts">
  import type { Icon as IconType } from '$lib/ui/Icon/types';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { page } from '$app/state';

  let {
    href,
    label,
    icon,
    onClick,
  }: {
    href: string;
    label: string;
    icon: IconType;
    onClick: () => void;
  } = $props();

  const pageActive = $derived(page.url.pathname.startsWith(href));
</script>

<a {href} class="group flex items-center gap-1" onclick={onClick}>
  <Icon
    {icon}
    class={[
      pageActive
        ? {
            'text-green-500': href === '/map',
            'text-blue-500': href === '/housing',
            'text-yellow-500': href === '/industries',
            'text-orange-500': href === '/radio',
            'text-red-500': href === '/track',
          }
        : {
            'group-hover:text-green-500': href === '/map',
            'group-hover:text-blue-500': href === '/housing',
            'group-hover:text-yellow-500': href === '/industries',
            'group-hover:text-orange-500': href === '/radio',
            'group-hover:text-red-500': href === '/track',
          },
    ]}
  />
  <span class="leading-none group-hover:underline">{label}</span>
</a>
