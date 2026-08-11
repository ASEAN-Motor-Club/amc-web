<script lang="ts">
  import Modal from './Modal.svelte';

  export interface Props {
    open: boolean;
    onClose?: () => void;
  }

  let { open, onClose }: Props = $props();
</script>

<Modal {open} {onClose}>
  <div>Content</div>
</Modal>
