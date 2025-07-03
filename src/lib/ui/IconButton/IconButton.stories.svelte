<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import IconButton from './IconButton.svelte';

  const { Story } = defineMeta({
    title: 'Ui/IconButton',
    component: IconButton,
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
      weight: {
        control: { type: 'select' },
      },
      opticalSize: {
        control: { type: 'select' },
      },
      grade: {
        control: { type: 'select' },
      },
      onClick: {
        control: false,
      },
      icon: {
        control: {
          type: 'text',
        },
      },
    },
  });
</script>

<Story name="Default" args={{ icon: 'favorite' }} />

<Story name="All Colors">
  {#snippet template({ ...args })}
    <div class="flex flex-wrap gap-2">
      <IconButton {...args} color="primary" icon="home" />
      <IconButton {...args} color="secondary" icon="search" />
      <IconButton {...args} color="info" icon="select_all" />
      <IconButton {...args} color="success" icon="clear_all" />
      <IconButton {...args} color="warning" icon="favorite" />
      <IconButton {...args} color="error" icon="apps_outage" />
      <IconButton {...args} color="neutral" icon="arrow_back" />
    </div>
  {/snippet}
</Story>
