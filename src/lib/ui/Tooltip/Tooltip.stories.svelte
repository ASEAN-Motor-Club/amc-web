<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Tooltip from './Tooltip.svelte';

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: 'Ui/Tooltip',
    component: Tooltip,
    tags: ['autodocs'],
    argTypes: {
      position: {
        control: { type: 'select' },
        options: ['top', 'bottom', 'left', 'right'],
      },
      portal: {
        control: 'boolean',
      },
      offset: {
        control: { type: 'number', min: 0, max: 50, step: 2 },
      },
      disabled: {
        control: 'boolean',
      },
      anchor: {
        control: false,
      },
      children: {
        control: false,
      },
    },
    args: {
      class:
        'max-w-xs whitespace-nowrap break-words rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-100 shadow-lg dark:bg-neutral-200 dark:text-neutral-900',
    },
  });

  let buttonElement: HTMLElement;
</script>

<Story name="Default">
  {#snippet template({ children: _children, anchor: _anchor, ...args })}
    <div class="flex min-h-40 items-center justify-center">
      <div bind:this={buttonElement}>Hover me for tooltip</div>
      <Tooltip anchor={buttonElement} {...args}>This is a helpful tooltip message!</Tooltip>
    </div>
  {/snippet}
</Story>
