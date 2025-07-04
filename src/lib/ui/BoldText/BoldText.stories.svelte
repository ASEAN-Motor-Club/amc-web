<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import BoldText from './BoldText.svelte';

  const { Story } = defineMeta({
    title: 'Ui/BoldText',
    component: BoldText,
    tags: ['autodocs'],
    argTypes: {
      text: { control: 'text' },
      boldPart: { control: 'text' },
      caseInSensitive: { control: 'boolean' },
      class: { control: 'text' },
    },
    args: {
      text: 'Hello, this is a BoldText story!',
      boldPart: 'BoldText',
      caseInSensitive: false,
      class: '',
    },
  });
</script>

<Story name="Default" />

<Story
  name="Lorem ipsum"
  args={{
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur facilisis velit et urna bibendum egestas. Etiam in rutrum urna, nec aliquet tortor. In auctor felis id fringilla lobortis. Fusce venenatis congue ligula sit amet bibendum. Sed accumsan pellentesque sollicitudin. Fusce ut vestibulum leo. Maecenas eu rhoncus erat, ac rutrum mi. Duis sed eros hendrerit, porta est fermentum, facilisis est.',
    boldPart: 'lo',
    caseInSensitive: true,
    class: 'text-red-500',
  }}
/>
