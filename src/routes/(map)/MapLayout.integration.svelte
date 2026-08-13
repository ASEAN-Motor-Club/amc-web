<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { createQueryClient } from '$lib/api/queryClient';
  import MsgModal from '$lib/components/MsgModal/MsgModal.svelte';
  import Layout from './+layout.svelte';
  import MapPage from './map/+page.svelte';
  import HousingPage from './housing/+page.svelte';
  import PlayersPage from './players/+page.svelte';
  import JobsPage from './jobs/+page.svelte';
  import JobsIdPage from './jobs/[id]/+page.svelte';
  import DeliveriesPage from './deliveries/+page.svelte';
  import DeliveriesIdPage from './deliveries/[id]/+page.svelte';

  interface Props {
    /** Which (map) subpage to slot into the layout, matching the mocked route path. */
    pageName?:
      'map' | 'housing' | 'players' | 'jobs' | 'jobs/[id]' | 'deliveries' | 'deliveries/[id]';
  }

  const { pageName = 'map' }: Props = $props();

  const queryClient = createQueryClient();
</script>

<QueryClientProvider client={queryClient}>
  <MsgModal>
    <Layout>
      {#if pageName === 'housing'}
        <HousingPage />
      {:else if pageName === 'players'}
        <PlayersPage />
      {:else if pageName === 'jobs'}
        <JobsPage />
      {:else if pageName === 'jobs/[id]'}
        <JobsIdPage />
      {:else if pageName === 'deliveries'}
        <DeliveriesPage />
      {:else if pageName === 'deliveries/[id]'}
        <DeliveriesIdPage />
      {:else}
        <MapPage />
      {/if}
    </Layout>
  </MsgModal>
</QueryClientProvider>
