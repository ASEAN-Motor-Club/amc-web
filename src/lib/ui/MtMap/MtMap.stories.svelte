<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MtMap from './MtMap.svelte';
  import mapImage from '$lib/assets/map.png';
  import roadImage from '$lib/assets/road.svg';

  const { Story } = defineMeta({
    title: 'Ui/MtMap',
    component: MtMap,
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
      onPointClick: {
        control: false,
      },
      onPointHover: {
        control: false,
      },
      onPointMove: {
        control: false,
      },
    },
    args: {
      zoomFit: true,
      groups: {
        track: {
          trackMode: true,
          points: [
            { position: { x: 0, y: 0 }, scaleY: 10, yaw: 0 },
            { position: { x: 1000, y: 1000 }, scaleY: 10, yaw: Math.PI },
          ],
        },
      },
      mapImage: mapImage,
      roadImage: roadImage,
    },
  });
</script>

<Story name="Default">
  {#snippet template({ class: className, ...args })}
    <MtMap {...args} class={['h-screen w-full', className]} />
  {/snippet}
</Story>
