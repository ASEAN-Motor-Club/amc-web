<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Card from './Card.svelte';
  import Button from '../Button/Button.svelte';

  const { Story } = defineMeta({
    title: 'Ui/Card',
    component: Card,
    tags: ['autodocs'],
    argTypes: {
      class: {
        control: { type: 'text' },
      },
      children: {
        control: false,
      },
    },
  });
</script>

<Story name="Default" asChild>
  <Card class="flex flex-col gap-5">
    <h3 class="text-lg font-semibold">Card Title</h3>
    <p class="text-stone-600 dark:text-stone-400">This is a simple card component.</p>
    <div class="flex gap-2">
      <Button color="primary" variant="contained-light" size="md">Button</Button>
    </div>
  </Card>
</Story>
