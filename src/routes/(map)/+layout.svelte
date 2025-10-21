<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { startDeliveryJobsPolling } from '$lib/api/delivery';
  import { getHousingData } from '$lib/api/housing';
  import { getPlayerRealtimePosition } from '$lib/api/player';
  import type { DeliveryJob, HouseData } from '$lib/api/types';
  import Collapsible from '$lib/components/Map/Collapsible/Collapsible.svelte';
  import { ALL_MENU } from '$lib/components/Map/Collapsible/constants';
  import Map from '$lib/components/Map/Map/Map.svelte';
  import { PointType, type PlayerData } from '$lib/components/Map/Map/types';
  import type { DeliveryCargo } from '$lib/data/types';
  import { reProjectPoint } from '$lib/ui/OlMap/utils';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import { isSm } from '$lib/utils/media.svelte';
  import { onDestroy, onMount } from 'svelte';
  import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';

  const { children } = $props();

  type OpenCollapsibleType = 'housing' | 'players' | 'jobs' | 'delivery' | '';
  type OpenCollapsible = [OpenCollapsibleType, string];

  const [openCollapsible, openCollapsibleId]: OpenCollapsible = $derived.by(() => {
    switch (page.url.pathname.split('/')[1]) {
      case 'housing':
        return ['housing' as const, ''];
      case 'jobs':
        return ['jobs' as const, page.params.id ?? ''];
      case 'players':
        return ['players' as const, ''];
      case 'delivery':
        return ['delivery' as const, page.params.id ?? ''];
      default: {
        const [menu, id] = (clientSearchParamsGet('menu') ?? '').split('/');
        return [menu as OpenCollapsibleType, id];
      }
    }
  });

  onMount(() => {
    if (!isSm.current && page.url.pathname === '/map' && openCollapsible) {
      const newParams = new SvelteURLSearchParams(clientSearchParams());
      newParams.delete('menu');
      const str = newParams.toString();
      goto(`/${openCollapsible}${openCollapsibleId && `/${openCollapsibleId}`}${str && `?${str}`}`);
    }
  });

  const showFull = $derived.by(() => {
    const path = page.url.pathname.split('/')[1];
    return ALL_MENU.includes(path);
  });

  const validOpenCollapsible = $derived(ALL_MENU.includes(openCollapsible));

  let stopPlayerDataPolling: (() => void) | undefined = undefined;

  let playerData: PlayerData[] = $state([]);
  let playerDataLoading = $state(true);
  let playerLayerDataEnabled = $state(true);

  const getPlayerRealtimePositionCall = () => {
    return getPlayerRealtimePosition((data) => {
      const result = Object.entries(data).map(([name, coord]) => ({
        geometry: reProjectPoint([coord.x, coord.y]),
        name,
        coord,
        pointType: PointType.Player as const,
        vehicleKey: coord.vehicle_key,
        guid: coord.unique_id,
      }));
      playerData = result;
      playerDataLoading = false;
    });
  };

  const showMap = $derived(!(showFull || (!isSm.current && validOpenCollapsible)));

  $effect(() => {
    if ((showMap && playerLayerDataEnabled) || openCollapsible === 'players') {
      if (!stopPlayerDataPolling) {
        stopPlayerDataPolling = getPlayerRealtimePositionCall();
      }
    } else {
      stopPlayerDataPolling?.();
      stopPlayerDataPolling = undefined;
      playerData = [];
    }
  });

  let map: Map | undefined = $state(undefined);

  const handleCenter = (point: [number, number]) => {
    map?.centerOnPoint(point);
  };

  let houseData: HouseData | undefined = $state(undefined);
  let houseDataLoading = $state(true);

  $effect(() => {
    const abortController = new AbortController();

    if (!houseData && (showMap || openCollapsible === 'housing')) {
      getHousingData(abortController.signal)
        .then((data) => {
          houseData = data;
          houseDataLoading = false;
        })
        .catch((error: unknown) => {
          console.error('Error fetching housing data:', error);
        });
    }

    return () => {
      abortController.abort();
    };
  });

  let stopJobsDataPolling: (() => void) | undefined = undefined;

  let jobsData: DeliveryJob[] = $state([]);
  let jobsCache: SvelteMap<number, DeliveryJob> = new SvelteMap<number, DeliveryJob>();
  let jobsDataLoading = $state(true);

  $effect(() => {
    if (showMap || openCollapsible === 'jobs') {
      if (!stopJobsDataPolling) {
        stopJobsDataPolling = startDeliveryJobsPolling((jobs) => {
          jobsData = jobs.map((job) => ({
            ...job,
            cargos: job.cargos.map((cargo) => ({
              ...cargo,
              key: cargo.key.replace('T::', '_T') as DeliveryCargo,
            })),
          }));
          for (const job of jobsData) {
            jobsCache.set(job.id, job);
          }
          jobsDataLoading = false;
        });
      }
    } else {
      stopJobsDataPolling?.();
      stopJobsDataPolling = undefined;
    }
  });

  onDestroy(() => {
    stopPlayerDataPolling?.();
    stopJobsDataPolling?.();
  });
</script>

<div class="relative flex h-full w-full">
  <div class="flex h-full w-full flex-1 overflow-hidden pb-12 sm:pb-0">
    <div
      class={[
        'flex h-full w-full transition-opacity duration-1000 sm:min-w-60',
        showMap ? 'opacity-100' : 'opacity-0',
      ]}
    >
      <div class="contents duration-150">
        <Map
          {jobsData}
          {houseData}
          {playerData}
          onPlayerLayerDataEnabledChange={(e) => (playerLayerDataEnabled = e)}
          bind:this={map}
        />
      </div>
    </div>
  </div>

  <Collapsible
    {validOpenCollapsible}
    {showFull}
    {openCollapsible}
    {openCollapsibleId}
    {playerData}
    {playerDataLoading}
    {houseData}
    {houseDataLoading}
    {jobsData}
    {jobsDataLoading}
    {jobsCache}
    onCenter={handleCenter}
  />
</div>

{@render children()}
