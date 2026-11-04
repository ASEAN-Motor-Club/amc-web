<script lang="ts">
  import { m } from '#messages';
  import Button from '#lib/ui/Button/Button.svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import type { Vector2 } from '#lib/types/index.ts';

  interface Props {
    /** Game coordinate of the pointer on the map */
    coord: Vector2;
    /** Drops the pointer, leaving the picker armed */
    onClear: () => void;
  }

  const { coord, onClear }: Props = $props();

  const x = $derived(Math.round(coord.x));
  const y = $derived(Math.round(coord.y));

  let copied = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  const copy = () => {
    navigator.clipboard.writeText(`${x}, ${y}`);
    copied = true;
    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => (copied = false), 2000);
  };
</script>

<div
  class="pointer-events-auto flex max-w-full items-center gap-2 rounded-sm bg-gray-900/50 py-1.5 pr-1.5 pl-3 text-text-dark shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-sm contrast-more:bg-gray-950! contrast-more:ring-white/60!"
>
  <div class="flex min-w-0 flex-col text-xs">
    <span class="font-semibold">{m['map.teleport_coord']()}</span>
    <span class="whitespace-nowrap tabular-nums">{m['map.coord_xy']({ x, y })}</span>
  </div>
  <span class="text-xs" aria-live="polite">{copied ? m['map.teleport_copied']() : ''}</span>
  <Button
    class="!bg-transparent !shadow-none !ring-0 hover:!bg-white/10 focus:!bg-white/15 contrast-more:bg-gray-950!"
    color="custom"
    size="sm"
    icon
    onClick={copy}
    aria-label={m['a11y.copy_coordinates']()}
  >
    <Icon
      class={copied
        ? 'icon-[material-symbols--check-rounded]'
        : 'icon-[material-symbols--content-copy-rounded]'}
    />
  </Button>
  <Button
    class="!bg-transparent !shadow-none !ring-0 hover:!bg-white/10 focus:!bg-white/15 contrast-more:bg-gray-950!"
    color="custom"
    size="sm"
    icon
    onClick={onClear}
    aria-label={m['a11y.clear']()}
  >
    <Icon class="icon-[material-symbols--close-rounded]" />
  </Button>
</div>
