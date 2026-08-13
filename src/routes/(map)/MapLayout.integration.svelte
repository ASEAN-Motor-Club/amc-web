<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { createQueryClient } from '$lib/api/queryClient';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Layout from './+layout.svelte';
  import MapPage from './map/+page.svelte';

  const queryClient = createQueryClient();
</script>

<QueryClientProvider client={queryClient}>
  <MsgModal>
    <Layout>
      <MapPage />
    </Layout>
  </MsgModal>
</QueryClientProvider>
