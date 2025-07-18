<script lang="ts">
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import { setMsgModalContext, type ModalParams } from './context';
  import type { Snippet } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import { m } from '$lib/paraglide/messages';

  type Props = {
    children: Snippet;
  };

  const { children }: Props = $props();

  let modalOpen = $state(false);
  let modalParams = $state<Partial<ModalParams>>({});

  const showModal = (nextModalParams: ModalParams) => {
    modalParams = nextModalParams;
    modalOpen = true;
  };

  const hideModal = () => {
    modalOpen = false;
    modalParams.cancelAction?.();
    modalParams = {};
  };

  const handleConfirm = () => {
    modalParams.confirmAction?.();
    modalOpen = false;
    modalParams = {};
  };

  setMsgModalContext({
    showModal,
    hideModal,
    get isOpen() {
      return modalOpen;
    },
  });
</script>

{@render children()}
<Modal open={modalOpen} onClose={hideModal}>
  <Card class="max-w-120 flex min-w-60 flex-col p-5">
    <h2 class="pb-4.5 text-2xl font-bold tracking-tight">{modalParams.title}</h2>
    <p class="text-text/80 dark:text-text-dark/80 whitespace-pre-line text-sm">
      {modalParams.message}
    </p>
    <div class="-mx-3 -my-3 flex justify-end gap-2 pt-6">
      {#if modalParams.confirmAction}
        <Button onClick={handleConfirm} color="primary" variant="text">
          {modalParams.confirmText || m['action.confirm']()}
        </Button>
      {/if}

      <Button onClick={hideModal} color="secondary" variant="text">
        {modalParams.cancelText || m['action.close']()}
      </Button>
    </div>
  </Card>
</Modal>
