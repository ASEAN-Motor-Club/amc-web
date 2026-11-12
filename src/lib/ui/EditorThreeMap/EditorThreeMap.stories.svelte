<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EditorThreeMap from './EditorThreeMap.svelte';
  import type { Waypoint } from '#lib/schema/track.ts';
  import type { Vector2 } from '#lib/types/index.ts';
  import { fromEulerWp } from '#lib/components/TrackEditor/utils/index.ts';

  const { Story } = defineMeta({
    title: 'Ui/EditorThreeMap',
    component: EditorThreeMap,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
    },
    argTypes: {
      class: {
        control: {
          type: 'text',
        },
      },
      view: {
        control: { type: 'inline-radio' },
        options: ['ortho', 'perspective'],
      },
    },
    args: {
      view: 'ortho',
    },
  });

  /** A waypoint at a game-plane position, facing `yawDeg`, whose gate is `scaleY` metres wide. */
  const waypoint = (x: number, y: number, yawDeg: number, scaleY = 1): Waypoint =>
    fromEulerWp({
      translation: { x, y, z: 0 },
      rotation: { x: 0, y: 0, z: yawDeg },
      scale3D: { x: 1, y: scaleY, z: 1 },
    });

  const track = (): Waypoint[] => [
    waypoint(-1200000, -300000, 0, 50),
    waypoint(-1150000, -280000, 45, 75),
    waypoint(-1100000, -250000, 90, 100),
    waypoint(-1050000, -200000, 180, 60),
    waypoint(-1000000, -150000, -90, 80),
  ];
</script>

<script lang="ts">
  let waypoints: Waypoint[] = $state(track());
  let selectedIndex: number | undefined = $state();
  let map: EditorThreeMap | undefined = $state();

  const selectedWaypoint = $derived(
    selectedIndex === undefined
      ? undefined
      : { index: selectedIndex, waypoint: waypoints[selectedIndex] },
  );

  const handlePointMove = (newCoord: Vector2) => {
    if (selectedIndex === undefined) return;
    const moved = waypoints[selectedIndex];
    waypoints[selectedIndex] = {
      ...moved,
      translation: { ...moved.translation, x: newCoord.x, y: newCoord.y },
    };
  };
</script>

<Story name="Default">
  {#snippet template({ class: propsClass, ...args })}
    <div class="flex h-screen w-full flex-col">
      <div class="border-b bg-gray-100 p-4">
        <h3 class="mb-2 text-lg font-semibold">EditorThreeMap with Drag Support</h3>
        <p class="mb-2 text-sm text-gray-600">
          Click a point to select it, then drag the selected point (highlighted in amber) to move
          it. The move commits when you release.
        </p>
        <div class="text-xs text-gray-500">
          Selected Point: {selectedWaypoint
            ? `Index ${selectedWaypoint.index} at (${Math.round(selectedWaypoint.waypoint.translation.x)}, ${Math.round(selectedWaypoint.waypoint.translation.y)})`
            : 'None'}
        </div>
        <button class="mt-2 rounded-md border px-2 py-1 text-xs" onclick={() => map?.zoomFit()}>
          Recenter
        </button>
      </div>
      <div class="flex-1">
        <EditorThreeMap
          {...args}
          bind:this={map}
          class={['h-full w-full', propsClass]}
          {waypoints}
          {selectedWaypoint}
          showNum
          onPointClick={(index) => (selectedIndex = index)}
          onSelectedPointMove={handlePointMove}
        />
      </div>
    </div>
  {/snippet}
</Story>

<Story name="With Selected Point">
  {#snippet template({ class: propsClass, ...args })}
    <div class="flex h-screen w-full flex-col">
      <div class="border-b bg-gray-100 p-4">
        <h3 class="mb-2 text-lg font-semibold">EditorThreeMap with Pre-selected Point</h3>
        <p class="text-sm text-gray-600">The middle point is pre-selected and ready to drag.</p>
      </div>
      <div class="flex-1">
        <EditorThreeMap
          {...args}
          class={['h-full w-full', propsClass]}
          waypoints={track().slice(0, 3)}
          selectedWaypoint={{ index: 1, waypoint: track()[1] }}
          onPointClick={(index) => {
            console.log('Point clicked:', index);
          }}
          onSelectedPointMove={(newCoord) => {
            console.log('Point moved:', newCoord);
          }}
        />
      </div>
    </div>
  {/snippet}
</Story>

<Story name="Gate Mode" args={{ view: 'ortho' }}>
  {#snippet template({ class: propsClass, ...args })}
    <div class="flex h-screen w-full flex-col">
      <div class="border-b bg-gray-100 p-4">
        <h3 class="text-lg font-semibold">Gate Mode</h3>
        <p class="text-sm text-gray-600">
          Points are displayed as yellow gates perpendicular to their yaw angle. Gate width is
          determined by scaleY (1 = 1 meter). The 3D view always draws gates.
        </p>
        <div class="mt-2 text-sm">
          Selected Point: {selectedIndex === undefined ? 'None' : `Index ${selectedIndex}`}
        </div>
      </div>
      <div class="flex-1">
        <EditorThreeMap
          {...args}
          class={['h-full w-full', propsClass]}
          {waypoints}
          {selectedWaypoint}
          gateMode
          onPointClick={(index) => (selectedIndex = index)}
          onSelectedPointMove={handlePointMove}
        />
      </div>
    </div>
  {/snippet}
</Story>
