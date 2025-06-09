<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Ui/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
      color: {
        control: { type: 'select' },
      },
      variant: {
        control: { type: 'select' },
      },
      size: {
        control: { type: 'select' },
      },
      type: {
        control: { type: 'select' },
      },
      onClick: {
        control: false,
      },
      class: {
        control: {
          type: 'text',
        },
      },
      children: {
        control: false,
      },
    },
  });
</script>

<Story name="Default">Button</Story>

<Story name="All Colors">
  {#snippet template({ children: _, ...args })}
    <div class="flex flex-wrap gap-2">
      <Button {...args} color="primary">Primary</Button>
      <Button {...args} color="secondary">Secondary</Button>
      <Button {...args} color="info">Info</Button>
      <Button {...args} color="success">Success</Button>
      <Button {...args} color="warning">Warning</Button>
      <Button {...args} color="error">Error</Button>
      <Button {...args} color="neutral">Neutral</Button>
    </div>
  {/snippet}
</Story>
