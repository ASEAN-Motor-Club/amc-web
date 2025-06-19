<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Slider from './Slider.svelte';

  const { Story } = defineMeta({
    title: 'Ui/Slider',
    component: Slider,
    tags: ['autodocs'],
    argTypes: {
      color: {
        control: { type: 'select' },
      },
      size: {
        control: { type: 'select' },
      },
    },
    args: {
      value: 0,
      min: -180,
      max: 180,
    },
  });
</script>

<Story name="Default">
  {#snippet template({ ...args })}
    <Slider {...args} class="w-50" />
  {/snippet}
</Story>
