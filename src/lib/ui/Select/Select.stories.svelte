<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Select from './Select.svelte';
  import SelectOption from './SelectOption.svelte';

  const { Story } = defineMeta({
    title: 'Ui/Select',
    component: Select,
    tags: ['autodocs'],
    argTypes: {
      "value": {
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
      <SelectOption id="primary" value="Primary">Primary</SelectOption>
      <SelectOption id="secondary" value="Secondary">Secondary</SelectOption>
      <SelectOption id="info" value="Info">Info</SelectOption>
      <SelectOption id="success" value="Success">Success</SelectOption>
      <SelectOption id="warning" value="Warning">Warning</SelectOption>
      <SelectOption id="error" value="Error">Error</SelectOption>
      <SelectOption id="neutral" value="Neutral">Neutral</SelectOption>
    </Select>
  {/snippet}
</Story>
