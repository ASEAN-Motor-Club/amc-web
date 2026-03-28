<script lang="ts">
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
  }

  const { dotClass, label, desc, enabled, onclick, sub = false }: PoiItemProps = $props();
</script>

<button
  class={[
    'flex w-full cursor-pointer gap-2 py-2 text-left transition-colors hover:bg-gray-100/5',
    sub ? 'border-t border-gray-100/10 pr-2.5 pl-6' : 'px-2.5',
  ]}
  {onclick}
>
  <div
    class={['mt-1.25 size-3 shrink-0 rounded-full border', dotClass, !enabled && 'opacity-30']}
  ></div>
  <div class="flex flex-col">
    <span class={['text-sm font-semibold', enabled ? 'text-text-dark' : 'text-text-dark/50']}
      >{label}</span
    >
    <span class="text-text-dark/60 text-xs">{desc}</span>
  </div>
</button>
