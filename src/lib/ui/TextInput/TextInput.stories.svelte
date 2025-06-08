<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TextInput from './TextInput.svelte';

  const { Story } = defineMeta({
    title: 'Ui/TextInput',
    component: TextInput,
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: { type: 'select' },
      },
      size: {
        control: { type: 'select' },
      },
      type: {
        control: { type: 'select' },
      },
      onChange: {
        control: false,
      },
      autocomplete: {
        control: { type: 'select' },
      },
    },
    args: {
      value: '',
      name: 'text-input',
      placeholder: 'Enter text',
      autocomplete: 'off',
    },
  });
</script>

<Story name="Default" />
