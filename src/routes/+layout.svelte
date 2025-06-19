<script lang="ts">
  import '../app.css';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';

  let { children } = $props();
</script>

<MsgModal>
  {@render children()}
</MsgModal>
