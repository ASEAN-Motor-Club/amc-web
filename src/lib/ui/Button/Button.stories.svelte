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
        description: 'The color theme of the button',
      },
      variant: {
        control: { type: 'select' },
        description: 'The visual style variant of the button',
      },
      size: {
        control: { type: 'select' },
        description: 'The size of the button',
      },
      type: {
        control: { type: 'select' },
        description: 'The HTML button type attribute',
      },
      onClick: {
        control: false,
        description: 'Event handler for button clicks',
      },
      class: {
        control: {
          type: 'text',
        },
        description: 'CSS class to apply to the button component',
      },
      children: {
        control: false,
        description: 'Content to be rendered inside the button component',
      },
    },
  });
</script>

<Story name="Default">Button</Story>

<Story name="All Colors">
  {#snippet template({ children, ...args })}
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
