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
  const msg =
    'This is a message modal. It can be used to display important information or ask for user confirmation.';
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

<Story name="MsgModal" asChild>
  <Button onClick={() => (modalOpen = true)}>Open Modal</Button>
  <Modal open={modalOpen} onClose={() => (modalOpen = false)}>
    <Card class="flex max-w-120 flex-col p-5">
      <h2 class="pb-4.5 text-2xl font-bold tracking-tight">Title</h2>
      <p class="text-text/80 dark:text-text-dark/80 pb-6 text-sm whitespace-pre-line">
        {msg}
      </p>
      <div class="-mx-3 -my-3 flex justify-end gap-2">
        <Button onClick={() => (modalOpen = false)} color="primary" variant="text">Confirm</Button>
        <Button onClick={() => (modalOpen = false)} color="secondary" variant="text">Close</Button>
      </div>
    </Card>
  </Modal>
</Story>
