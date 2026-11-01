<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { createQueryClient } from '#lib/api/queryClient.ts';
  import { setChampionshipContext } from '#lib/components/Championship/context.ts';
  import { noop } from 'es-toolkit';
  import Page from './+page.svelte';

  const queryClient = createQueryClient();

  setChampionshipContext({
    events: [],
    openEvent: noop,
  });
</script>

<QueryClientProvider client={queryClient}>
  <Page />
</QueryClientProvider>
