<script lang="ts">
  import { onMount } from 'svelte';
  import type Feature from 'ol/Feature';
  import type { MapSelection, MapState, PlayerData } from '$lib/components/Map/Map/types';
  import { createThreeMapScene, type ThreeMapScene } from '$lib/ui/ThreeMap/scene';
  import Button from '$lib/ui/Button/Button.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export interface ThreeMapWrapperProps {
    /** CSS class to apply to the 3D map container */
    class?: ClassValue;
    /** Whether the map is currently detached into a picture-in-picture window */
    pipActive: boolean;
    enterPip: () => void;
    /** POI visibility toggles - not rendered yet (stage 1 renders terrain only) */
    mapState: MapState;
    playerData: PlayerData[];
    pinsData: unknown[];
    /** Point to highlight and lock the map onto, driven by the URL - not wired yet */
    selection?: MapSelection;
    onHover?: (feature: Feature | undefined, pixel: [x: number, y: number]) => void;
    onClick?: (feature: Feature | undefined) => void;
    onRightClick?: (feature: Feature | undefined) => void;
  }

  // The deferred props mirror OlMapWrapper's contract; POI layers and input wiring
  // arrive in later experimental stages. Captured in rest so they stay part of the
  // component's type without being consumed yet.
  const { class: propsClass, pipActive, ..._deferredProps }: ThreeMapWrapperProps = $props();

  // One full wheel notch (100 deltaY), so a button tap scales distance ~1.13x like a
  // wheel tick.
  const ZOOM_BUTTON_DELTA_Y = 100;

  let container: HTMLDivElement;
  let three: ThreeMapScene | undefined;

  onMount(() => {
    three = createThreeMapScene(container);
    return () => {
      three?.dispose();
      three = undefined;
    };
  });

  const zoomIn = () => three?.zoomBy(-ZOOM_BUTTON_DELTA_Y);
  const zoomOut = () => three?.zoomBy(ZOOM_BUTTON_DELTA_Y);
</script>

<div class="relative h-full w-full">
  <div class={twMerge('h-full w-full', clsx(propsClass))} bind:this={container}></div>
  {#if !pipActive}
    <div class="absolute right-4 bottom-4 flex flex-col gap-2">
      <div class="flex flex-col rounded-sm shadow ring !shadow-white/3 !ring-white/5">
        <Button
          class="text-text-dark pointer-events-auto rounded-b-none !bg-gray-900/50 backdrop-blur-sm hover:!bg-gray-900/40 focus:!bg-gray-900/60"
          color="custom"
          size="sm"
          icon
          onClick={zoomIn}
        >
          <Icon class="i-material-symbols:add-2-rounded" />
        </Button>
        <div class="w-full border-b border-b-white/25 bg-gray-900/50"></div>
        <Button
          class="text-text-dark pointer-events-auto rounded-t-none !bg-gray-900/50 backdrop-blur-sm hover:!bg-gray-900/40 focus:!bg-gray-900/60"
          color="custom"
          size="sm"
          icon
          onClick={zoomOut}
        >
          <Icon class="i-material-symbols:remove-rounded" />
        </Button>
      </div>
    </div>
  {/if}
</div>
