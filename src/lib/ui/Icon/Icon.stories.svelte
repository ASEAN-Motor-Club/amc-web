<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Icon from './Icon.svelte';

  const { Story } = defineMeta({
    title: 'Ui/Icon',
    component: Icon,
    tags: ['autodocs'],
    argTypes: {
      icon: {
        control: { type: 'text' },
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
      class: {
        control: {
          type: 'text',
        },
      },
    },
    args: {
      icon: 'search',
    },
  });
</script>

<Story name="Default" />
