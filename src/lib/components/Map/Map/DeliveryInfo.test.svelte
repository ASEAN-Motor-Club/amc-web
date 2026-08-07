<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import type { QueryClient } from '@tanstack/svelte-query';
  import DeliveryInfo, { type HoverInfo } from './DeliveryInfo.svelte';

  interface Props {
    /** Query cache the rendered `DeliveryInfo` reads from */
    client: QueryClient;
    /** Delivery point the pointer is hovering */
    hoverInfo: HoverInfo;
  }

  const { client, hoverInfo }: Props = $props();
</script>

<QueryClientProvider {client}>
  <DeliveryInfo {hoverInfo} />
</QueryClientProvider>
