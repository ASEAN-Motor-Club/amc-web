<script lang="ts">
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { m } from '$messages';

  export interface PoiItemProps {
    /** Tailwind border + bg color classes for the dot, e.g. 'border-yellow-950 bg-yellow-500' */
    dotClass: string;
    /** Display label */
    label: string;
    /** Short description shown below label */
    desc: string;
    /** Whether this layer/option is currently enabled */
    enabled: boolean;
    /** Click handler */
    onclick: () => void;
    /** Sub-item — adds left indent and a top border */
    sub?: boolean;
    /** Whether the parent/main category is enabled (affects sub-item opacity) */
    parentEnabled?: boolean;
    /** Whether enabling this option filters out items from the map */
    filter?: boolean;
  }

  const {
    dotClass,
    label,
    desc,
    enabled,
    onclick,
    sub = false,
    parentEnabled = true,
    filter = false,
  }: PoiItemProps = $props();

  // main:on  sub:on  → opacity 100 (no class)
  // main:on  sub:off → opacity 30
  // main:off sub:on  → opacity 25
  // main:off sub:off → opacity 15
  const opacityClass = $derived({
    'opacity-50': parentEnabled && !enabled,
    'opacity-25': !parentEnabled && enabled,
    'opacity-10': !parentEnabled && !enabled,
  });
</script>

<button
  class={[
    'flex w-full py-2 text-left transition-colors',
    'cursor-pointer hover:bg-gray-100/5',
    sub ? 'border-t border-gray-100/10 pr-2.5 pl-6' : 'px-2.5',
  ]}
  {onclick}
>
  <div class={['flex gap-2 transition-opacity', opacityClass]}>
    <div class={['mt-1.25 size-3 shrink-0 rounded-full border', dotClass]}></div>
    <div class="flex flex-col">
      <div class="flex items-center gap-1">
        {#if filter}
          <Icon
            class="i-material-symbols:filter-alt text-text-300"
            size="sm"
            title={m['map.poi.filter_desc']()}
          />
        {/if}
        <span class="text-text-dark text-sm font-semibold">{label}</span>
      </div>
      <span class="text-text-300 text-xs">{desc}</span>
    </div>
  </div>
</button>
