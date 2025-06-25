<script lang="ts">
  import '../app.css';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Navbar from '$lib/components/Navbar/Navbar.svelte';

  let { children } = $props();
</script>

<MsgModal>
  <Navbar />
  <main class="h-full min-h-dvh pt-14 lg:pt-16">
    {@render children()}
  </main>
</MsgModal>
