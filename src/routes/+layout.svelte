<script lang="ts">
  import '../app.css';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Navbar from '$lib/components/Navbar/Navbar.svelte';

  const { children } = $props();
</script>

<MsgModal>
  <Navbar />
  <main class="h-full min-h-dvh pt-16">
    {@render children()}
  </main>
</MsgModal>
