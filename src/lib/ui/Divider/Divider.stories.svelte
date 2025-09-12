<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Divider from './Divider.svelte';

  const { Story } = defineMeta({
    title: 'Ui/Divider',
    component: Divider,
    tags: ['autodocs'],
    argTypes: {
      spacing: {
        control: { type: 'select' },
        options: ['sm', 'md', 'lg', false],
      },
      vertical: {
        control: { type: 'boolean' },
      },
      class: {
        control: { type: 'text' },
      },
    },
    args: {
      spacing: 'md',
      vertical: false,
    },
  });
</script>

<Story name="Default">
  <div class="space-y-4">
    <p>Content above the divider</p>
    <Divider />
    <p>Content below the divider</p>
  </div>
</Story>

<Story name="Small Spacing" args={{ spacing: 'sm' }}>
  <div class="space-y-4">
    <p>Content above</p>
    <Divider spacing="sm" />
    <p>Content below</p>
  </div>
</Story>

<Story name="Large Spacing" args={{ spacing: 'lg' }}>
  <div class="space-y-4">
    <p>Content above</p>
    <Divider spacing="lg" />
    <p>Content below</p>
  </div>
</Story>

<Story name="No Spacing" args={{ spacing: false }}>
  <div class="space-y-4">
    <p>Content above</p>
    <Divider spacing={false} />
    <p>Content below</p>
  </div>
</Story>

<Story name="Vertical" args={{ vertical: true }}>
  <div class="flex h-20 items-center space-x-4">
    <p>Content left</p>
    <Divider vertical />
    <p>Content right</p>
  </div>
</Story>

<Story name="Custom Styled" args={{ class: 'border-2 border-red-500/70' }}>
  <div class="space-y-4">
    <p>Content above</p>
    <Divider class="border-2 border-red-500/70" />
    <p>Content below</p>
  </div>
</Story>
