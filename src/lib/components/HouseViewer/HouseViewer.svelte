<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import { untrack } from 'svelte';
  import type { HouseViewerData } from '#lib/api/houseViewer.ts';
  import { m } from '#messages';
  import { createHouseScene, type HouseScene, type HouseSceneProgress } from './scene.ts';

  export interface HouseViewerProps {
    /** The house and its placed buildings. */
    data: HouseViewerData;
    /** Orbit the camera around the house. */
    autoRotate: boolean;
    /** Slice the shell open at head height so the furniture inside shows. */
    cutView: boolean;
    /** The user started orbiting or zooming the camera themselves. */
    onUserControl?: () => void;
    /** CSS class to apply to the component */
    class?: ClassValue;
  }

  const {
    data,
    autoRotate,
    cutView,
    onUserControl,
    class: propsClass,
  }: HouseViewerProps = $props();

  let container: HTMLDivElement | undefined = $state();
  // Raw state, not $state: the proxy would wrap a three.js handle. Reactive so the viewer's
  // props are re-applied when a new scene is built for the next house.
  let houseScene = $state.raw<HouseScene>();
  let progress: HouseSceneProgress | undefined = $state();

  $effect(() => {
    if (!container) return;
    const scene = createHouseScene(container, data, {
      autoRotate: untrack(() => autoRotate),
      cutView: untrack(() => cutView),
      onProgress: (p) => {
        progress = p;
      },
      onUserControl: () => onUserControl?.(),
    });
    houseScene = scene;
    return () => {
      scene.dispose();
      houseScene = undefined;
    };
  });

  $effect(() => {
    houseScene?.setAutoRotate(autoRotate);
  });

  $effect(() => {
    houseScene?.setCutView(cutView);
  });

  const loading = $derived(progress !== undefined && progress.loaded < progress.total);
</script>

<div class={twMerge('relative h-full w-full', clsx(propsClass))}>
  <div
    bind:this={container}
    class="h-full w-full touch-none"
    role="img"
    aria-label={m['house_viewer.canvas_label']({ house: data.housingKey })}
  ></div>
  {#if progress && (loading || progress.failed > 0)}
    <div
      class="pointer-events-none absolute bottom-3 left-3 rounded-md bg-gray-900/60 px-2 py-1 text-xs font-semibold text-text-dark backdrop-blur-sm contrast-more:bg-gray-950!"
      role="status"
    >
      {#if loading}
        {m['house_viewer.loading_models']({ loaded: progress.loaded, total: progress.total })}
      {:else}
        {m['house_viewer.models_failed']({ count: progress.failed })}
      {/if}
    </div>
  {/if}
</div>
