<script lang="ts">
  import { m } from '#messages';
  import Button from '#lib/ui/Button/Button.svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import type { Vector2 } from '#lib/types/index.ts';
  import Tooltip from '#lib/ui/Tooltip/Tooltip.svelte';
  import { fade } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';
  import { defaultTransitionDurationMs } from '#lib/tw-var.ts';

  const transitionDuration = () => (prefersReducedMotion.current ? 0 : defaultTransitionDurationMs);

  interface Props {
    /** Game coordinate of the pointer, or null while the pointer is still unplaced */
    coord: Vector2 | null;
    /** Drops the pointer, leaving the picker armed */
    onClear: () => void;
  }

  const { coord, onClear }: Props = $props();

  const x = $derived(coord ? Math.round(coord.x) : 0);
  const y = $derived(coord ? Math.round(coord.y) : 0);

  let copied = $state(false);
  let copyAnchor = $state<HTMLElement>();
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  const copy = () => {
    navigator.clipboard.writeText(`${x}, ${y}`);
    copied = true;
    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => (copied = false), 2000);
  };
</script>

<!-- One readout with two states: the hint before a pointer is placed, the coordinate after. -->
<div
  class="pointer-events-auto flex max-w-full items-center gap-3 rounded-md bg-gray-900/50 py-1.5 pl-3 text-text-dark shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-sm contrast-more:bg-gray-950! contrast-more:ring-white/60! {coord
    ? 'pr-1.5'
    : 'pr-3'}"
  role="status"
  data-pick-readout
  in:fade|global={{ duration: transitionDuration() }}
  out:fade|global={{ duration: transitionDuration() }}
>
  {#if coord}
    <div class="flex min-w-0 flex-col text-xs">
      <span class="font-semibold">{m['map.teleport_coord']()}</span>
      <span class="whitespace-nowrap tabular-nums">{m['map.coord_xy']({ x, y })}</span>
    </div>
    <div class="flex items-center gap-0.5">
      <span class="inline-flex" bind:this={copyAnchor}>
        <span class="sr-only" aria-live="polite">{copied ? m['map.teleport_copied']() : ''}</span>
        {#if copyAnchor}
          <Tooltip
            anchor={copyAnchor}
            open={copied}
            class="rounded-md bg-gray-950/90 px-2 py-1 text-xs whitespace-nowrap text-text-dark shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-xs contrast-more:ring-white/60!"
            >{m['map.teleport_copied']()}</Tooltip
          >
        {/if}
        <Button
          class="!bg-transparent !shadow-none !ring-0 hover:!bg-white/10 focus-visible:!bg-white/15 contrast-more:bg-gray-950!"
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
      </span>
      <Button
        class="!bg-transparent !shadow-none !ring-0 hover:!bg-white/10 focus-visible:!bg-white/15 contrast-more:bg-gray-950!"
        color="custom"
        size="sm"
        icon
        onClick={onClear}
        aria-label={m['a11y.clear']()}
      >
        <Icon class="icon-[material-symbols--close-rounded]" />
      </Button>
    </div>
  {:else}
    <span class="text-xs whitespace-nowrap">{m['map.pick_hint']()}</span>
  {/if}
</div>
