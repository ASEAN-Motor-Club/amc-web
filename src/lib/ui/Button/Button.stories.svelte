<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';
  import { fn } from 'storybook/test';
  import type { ComponentProps } from 'svelte';

  const { Story } = defineMeta({
    title: 'Ui/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
      color: {
        control: { type: 'select' },
        options: ['primary', 'secondary', 'info', 'success', 'warning', 'error', 'neutral'],
        description: 'The color theme of the button',
        defaultValue: 'neutral',
        table: {
          type: { summary: 'Color' },
          defaultValue: { summary: 'neutral' },
        },
      },
      variant: {
        control: { type: 'select' },
        options: ['text', 'contained', 'contained-light', 'outlined'],
        description: 'The visual style variant of the button',
        defaultValue: 'contained',
        table: {
          type: { summary: 'text | contained | contained-light | outlined' },
          defaultValue: { summary: 'contained' },
        },
      },
      size: {
        control: { type: 'select' },
        options: ['small', 'medium', 'large'],
        description: 'The size of the button',
        defaultValue: 'medium',
        table: {
          type: { summary: 'small | medium | large' },
          defaultValue: { summary: 'medium' },
        },
      },
      type: {
        control: { type: 'select' },
        options: ['button', 'submit', 'reset'],
        description: 'The HTML button type attribute',
        defaultValue: 'button',
        table: {
          type: { summary: 'button | submit | reset' },
          defaultValue: { summary: 'button' },
        },
      },
      onClick: {
        action: 'clicked',
        description: 'Event handler for button clicks',
        table: {},
      },
      children: {
        control: false,
        description: 'The content to display inside the button',
        table: {
          type: { summary: 'Snippet' },
        },
      },
    },
    args: {
      onClick: fn(),
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
