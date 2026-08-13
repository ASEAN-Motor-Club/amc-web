<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { createQueryClient } from '$lib/api/queryClient';
  import Page from './+page.svelte';

  const queryClient = createQueryClient();
</script>

<QueryClientProvider client={queryClient}>
  <Page />
</QueryClientProvider>
