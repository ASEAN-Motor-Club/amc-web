<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import OlMap from './OlMap.svelte';

  const { Story } = defineMeta({
    title: 'Ui/OlMap',
    component: OlMap,
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

<Story name="Default">
  {#snippet template({ class: propsClass, ...args })}
    <OlMap {...args} class={['h-screen w-full', propsClass]} />
  {/snippet}
</Story>
