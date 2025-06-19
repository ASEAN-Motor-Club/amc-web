<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import InputGroup from './InputGroup.svelte';
  import TextInput from '../TextInput/TextInput.svelte';
  import Slider from '../Slider/Slider.svelte';

  const { Story } = defineMeta({
    title: 'Ui/InputGroup',
    component: InputGroup,
    tags: ['autodocs'],
    args: {
      label: 'Amount',
    },
  });
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <InputGroup {...args}>
      <TextInput value={0} name="example" />
    </InputGroup>
  {/snippet}
</Story>

<Story name="Multiple" args={{ focusIndex: 1 }}>
  {#snippet template({ children: _, ...args })}
    <InputGroup {...args}>
      <Slider value={0} min={0} max={100} name="example" />
      <TextInput value={0} name="example" />
      <TextInput value={0} name="example" />
      <TextInput value={0} name="example" />
      <TextInput value={0} name="example" />
      <TextInput value={0} name="example" />
      <TextInput value={0} name="example" />
    </InputGroup>
  {/snippet}
</Story>
