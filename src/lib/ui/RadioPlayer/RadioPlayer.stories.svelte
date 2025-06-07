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
        description: 'The URL of the radio stream to play.',
      },
      class: {
        control: {
          type: 'text',
        },
        description: 'CSS class to apply to the player component',
      },
    },
    args: {
      streamUrl: 'https://www.aseanmotorclub.com/stream',
    },
  });
</script>

<Story name="Default" />
