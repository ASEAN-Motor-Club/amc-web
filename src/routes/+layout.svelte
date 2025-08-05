<script lang="ts">
  import 'virtual:uno.css';
  import '../app.css';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Navbar from '$lib/components/Navbar/Navbar.svelte';
  import { m as msg } from '$lib/paraglide/messages';

  const { children } = $props();
</script>

<svelte:head>
  <title>{msg['site_name']()}</title>
  <meta name="description" content={msg['home.desc_title']()} />
</svelte:head>

<MsgModal>
  <Navbar />
  <main class="h-full min-h-dvh pt-16">
    {@render children()}
  </main>
</MsgModal>
