<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import RadioPlayer from './RadioPlayer.svelte';

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: 'Ui/RadioPlayer',
    component: RadioPlayer,
    tags: ['autodocs'],
    argTypes: {
      streamUrl: {
        control: 'text',
      },
      class: {
        control: {
          type: 'text',
        },
      },
      storageKey: {
        control: {
          type: 'text',
        },
      },
    },
    args: {
      streamUrl: 'https://www.aseanmotorclub.com/stream',
      storageKey: 'defaultRadio',
    },
  });
</script>

<Story name="Default" />
