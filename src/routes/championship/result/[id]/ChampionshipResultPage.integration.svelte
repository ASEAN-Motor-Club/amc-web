<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { createQueryClient } from '$lib/api/queryClient';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Page from './+page.svelte';

  const queryClient = createQueryClient();
</script>

<QueryClientProvider client={queryClient}>
  <MsgModal>
    <Page />
  </MsgModal>
</QueryClientProvider>
