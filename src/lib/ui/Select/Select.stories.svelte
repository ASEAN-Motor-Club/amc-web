<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Select from './Select.svelte';
  import SelectOption from './SelectOption.svelte';

  const { Story } = defineMeta({
    title: 'Ui/Select',
    component: Select,
    tags: ['autodocs'],
    argTypes: {
      value: {
        control: 'select',
        options: ['primary', 'secondary', 'info', 'success', 'warning', 'error', 'neutral'],
        description: 'The value of the select input',
      },
    },
    args: {
      placeholder: 'Select an option',
    },
  });
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <Select {...args}>
      <SelectOption id="primary" value="Primary" />
      <SelectOption id="secondary" value="Secondary" />
      <SelectOption id="info" value="Info" />
      <SelectOption id="success" value="Success" />
      <SelectOption id="warning" value="Warning" />
      <SelectOption id="error" value="Error" />
      <SelectOption id="neutral" value="Neutral" />
    </Select>
  {/snippet}
</Story>
