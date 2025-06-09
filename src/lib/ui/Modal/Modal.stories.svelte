<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Modal from './Modal.svelte';
  import Card from '../Card/Card.svelte';
  import Button from '../Button/Button.svelte';

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: 'Ui/Modal',
    component: Modal,
    tags: ['autodocs'],
    argTypes: {
      open: {
        control: false,
      },
      children: {
        control: false,
      },
      onClose: {
        control: false,
      },
    },
  });

  let modalOpen = $state(false);
</script>

<Story name="Default">
  {#snippet template({ children: _children, open: _open, onClose: _onClose, ...args })}
    <Button onClick={() => (modalOpen = true)}>Open Modal</Button>
    <Modal open={modalOpen} onClose={() => (modalOpen = false)} {...args}>
      <Card class="flex flex-col gap-5">
        <h2 class="text-lg font-bold">Modal Title</h2>
        <p>This is the content of the modal.</p>
        <Button color="secondary" onClick={() => (modalOpen = false)}>Close</Button>
      </Card>
    </Modal>
  {/snippet}
</Story>
