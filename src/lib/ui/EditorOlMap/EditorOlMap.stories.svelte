<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EditorOlMap from './EditorOlMap.svelte';
  import type { TrackPoint, SelectedTrackPoint } from './EditorOlMap.svelte';
  import type { Vector2 } from '$lib/types';

  const { Story } = defineMeta({
    title: 'Ui/EditorOlMap',
    component: EditorOlMap,
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
    },
    args: {},
  });
</script>

<script lang="ts">
  let points: TrackPoint[] = $state([
    { coord: { x: -1200000, y: -300000 }, yaw: 0 },
    { coord: { x: -1150000, y: -280000 }, yaw: Math.PI / 4 },
    { coord: { x: -1100000, y: -250000 }, yaw: Math.PI / 2 },
    { coord: { x: -1050000, y: -200000 }, yaw: Math.PI },
    { coord: { x: -1000000, y: -150000 }, yaw: -Math.PI / 2 },
  ]);

  let selectedPoint: SelectedTrackPoint | undefined = $state();

  const handlePointClick = (index: number | undefined) => {
    if (index !== undefined) {
      selectedPoint = {
        ...points[index],
        index,
      };
    } else {
      selectedPoint = undefined;
    }
  };

  const handlePointMove = (newCoord: Vector2) => {
    if (!selectedPoint) return;

    const index = selectedPoint.index;

    points[index] = { ...points[index], coord: newCoord };

    selectedPoint = { ...selectedPoint, coord: newCoord };
  };
</script>

<Story name="Default">
  {#snippet template({ class: propsClass, ...args })}
    <div class="flex h-screen w-full flex-col">
      <div class="border-b bg-gray-100 p-4">
        <h3 class="mb-2 text-lg font-semibold">EditorOlMap with Drag Support</h3>
        <p class="mb-2 text-sm text-gray-600">
          Click on a point to select it, then drag the selected point (highlighted in blue) to move
          it.
        </p>
        <div class="text-xs text-gray-500">
          Selected Point: {selectedPoint
            ? `Index ${selectedPoint.index} at (${Math.round(selectedPoint.coord.x)}, ${Math.round(selectedPoint.coord.y)})`
            : 'None'}
        </div>
      </div>
      <div class="flex-1">
        <EditorOlMap
          {...args}
          class={['h-full w-full', propsClass]}
          {points}
          {selectedPoint}
          onPointClick={handlePointClick}
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
        <h3 class="mb-2 text-lg font-semibold">EditorOlMap with Pre-selected Point</h3>
        <p class="mb-2 text-sm text-gray-600">
          The middle point is pre-selected and ready to drag.
        </p>
      </div>
      <div class="flex-1">
        <EditorOlMap
          {...args}
          class={['h-full w-full', propsClass]}
          points={[
            { coord: { x: -1200000, y: -300000 }, yaw: 0 },
            { coord: { x: -1150000, y: -280000 }, yaw: Math.PI / 4 },
            { coord: { x: -1100000, y: -250000 }, yaw: Math.PI / 2 },
          ]}
          selectedPoint={{
            coord: { x: -1150000, y: -280000 },
            yaw: Math.PI / 4,
            index: 1,
          }}
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

<Story name="Gate Mode">
  {#snippet template({ class: propsClass, ...args })}
    <div class="flex h-screen w-full flex-col">
      <div class="border-b bg-gray-100 p-4">
        <h3 class="text-lg font-semibold">Gate Mode</h3>
        <p class="text-sm text-gray-600">
          Points are displayed as yellow gates perpendicular to their yaw angle. Gate width is
          determined by scaleY (1 = 1 meter).
        </p>
        <div class="mt-2 text-sm">
          Selected Point: {selectedPoint ? `Index ${selectedPoint.index}` : 'None'}
        </div>
      </div>
      <div class="flex-1">
        <EditorOlMap
          {...args}
          class={['h-full w-full', propsClass]}
          points={[
            { coord: { x: -1200000, y: -300000 }, yaw: 0, scaleY: 50 },
            { coord: { x: -1150000, y: -280000 }, yaw: Math.PI / 4, scaleY: 75 },
            { coord: { x: -1100000, y: -250000 }, yaw: Math.PI / 2, scaleY: 100 },
            { coord: { x: -1050000, y: -200000 }, yaw: Math.PI, scaleY: 60 },
            { coord: { x: -1000000, y: -150000 }, yaw: -Math.PI / 2, scaleY: 80 },
          ]}
          {selectedPoint}
          gateMode={true}
          onPointClick={handlePointClick}
          onSelectedPointMove={handlePointMove}
        />
      </div>
    </div>
  {/snippet}
</Story>
