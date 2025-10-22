<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TruncateText from './TruncateText.svelte';

  const { Story } = defineMeta({
    title: 'UI/TruncateText',
    component: TruncateText,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
  });
</script>

<Story
  name="Default"
  args={{
    text: 'This is a sample text that might be too long for the container and should be truncated with ellipsis.',
  }}
>
  {#snippet template(args)}
    <div class="w-48 border border-gray-300 p-2">
      <TruncateText {...args} />
    </div>
  {/snippet}
</Story>

<Story
  name="No Truncation Needed"
  args={{
    text: 'Short text',
  }}
>
  {#snippet template(args)}
    <div class="w-48 border border-gray-300 p-2">
      <TruncateText {...args} />
    </div>
  {/snippet}
</Story>

<Story
  name="Custom Styling"
  args={{
    text: 'This truncated text has custom styling applied through the class prop.',
    class: 'text-blue-600 font-semibold',
  }}
>
  {#snippet template(args)}
    <div class="w-48 border border-gray-300 p-2">
      <TruncateText {...args} />
    </div>
  {/snippet}
</Story>
