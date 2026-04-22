<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { startDeliveryJobsPolling } from '$lib/api/delivery';
  import { getHousingData } from '$lib/api/housing';
  import { getPlayerRealtimePositionV2 } from '$lib/api/player';
  import type { DeliveryJob, HouseData } from '$lib/api/types';
  import Collapsible from '$lib/components/Map/Collapsible/Collapsible.svelte';
  import { ALL_MENU } from '$lib/components/Map/Collapsible/constants';
  import { PointType, type PlayerData } from '$lib/components/Map/Map/types';
  import type { CollapsibleType } from '$lib/components/Map/types';
  import type { DeliveryCargo } from '$lib/data/types';
  import { m } from '$lib/paraglide/messages';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { vehicleKeyToString } from '$lib/api/proto/vehicleKeyUtils';
  import { reProjectPoint } from '$lib/ui/OlMap/utils';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import { isSm } from '$lib/utils/media.svelte';
  import { getAbortSignal, onMount } from 'svelte';
  import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
  import type Map from '$lib/components/Map/Map/Map.svelte';

  const { children } = $props();

  type OpenCollapsible = [CollapsibleType, string];

  const [openCollapsible, openCollapsibleId]: OpenCollapsible = $derived.by(() => {
    switch (page.url.pathname.split('/')[1]) {
      case 'housing':
        return ['housing' as const, ''];
      case 'jobs':
        return ['jobs' as const, page.params.id ?? ''];
      case 'players':
        return ['players' as const, ''];
      case 'deliveries':
        return ['deliveries' as const, page.params.id ?? ''];
      default: {
        const [menu, id] = (clientSearchParamsGet('menu') ?? '').split('/');
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return [menu as CollapsibleType, id ?? ''];
      }
    }
  });

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let MapComponent: Promise<typeof import('$lib/components/Map/Map/Map.svelte')> | undefined =
    $state(undefined);

  onMount(() => {
    MapComponent = import('$lib/components/Map/Map/Map.svelte');
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

  let playerData: PlayerData[] = $state.raw([]);
  let playerDataLoading = $state(true);
  let playerLayerDataEnabled = $state(true);

  const showMap = $derived(!(showFull || (!isSm.current && validOpenCollapsible)));

  $effect(() => {
    if ((showMap && playerLayerDataEnabled) || openCollapsible === 'players') {
      getPlayerRealtimePositionV2((data) => {
        const result = data.players.map((item) => ({
          geometry: reProjectPoint([item.x, item.y]),
          name: item.playerName,
          coord: { x: item.x, y: item.y },
          pointType: PointType.Player as const,
          vehicleKey:
            item.vehicleKey.case === 'vehicleKeyEnum'
              ? vehicleKeyToString(item.vehicleKey.value)
              : (item.vehicleKey.value ?? 'None'),
          guid: item.uniqueId,
        }));
        playerData = result;
        playerDataLoading = false;
      }, getAbortSignal());
    } else {
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
    if (!houseData && (showMap || openCollapsible === 'housing')) {
      getHousingData(getAbortSignal())
        .then((data) => {
          houseData = data;
          houseDataLoading = false;
        })
        .catch((error: unknown) => {
          console.error('Error fetching housing data:', error);
        });
    }
  });

  let jobsData: DeliveryJob[] = $state([]);
  let jobsCache: SvelteMap<number, DeliveryJob> = new SvelteMap<number, DeliveryJob>();
  let jobsDataLoading = $state(true);

  $effect(() => {
    if (showMap || openCollapsible === 'jobs') {
      startDeliveryJobsPolling((jobs) => {
        jobsData = jobs.map((job) => ({
          ...job,
          cargos: job.cargos.map((cargo) => cargo.replace('T::', '_T') as DeliveryCargo),
        }));
        for (const job of jobsData) {
          jobsCache.set(job.id, job);
        }
        jobsDataLoading = false;
      }, getAbortSignal());
    }
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
        {#if MapComponent}
          {#await MapComponent}
            <div
              class="flex h-full w-full items-center justify-center bg-[lab(47.888%_-2.821_-32.915)]"
            >
              <Icon
                class="i-material-symbols:progress-activity animate-spin text-2xl text-white/20"
              />
            </div>
          {:then M}
            {@const Map = M.default}
            <Map
              {jobsData}
              {houseData}
              {playerData}
              onPlayerLayerDataEnabledChange={(e) => (playerLayerDataEnabled = e)}
              bind:this={map}
            />
          {:catch _}
            <div
              class="text-text-700 dark:text-text-300 flex h-full w-full items-center justify-center"
            >
              {m['map.load_error']()}
            </div>
          {/await}
        {/if}
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
