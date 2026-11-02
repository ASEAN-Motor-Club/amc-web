<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { createDeliveryJobsQuery } from '#lib/api/delivery.ts';
  import { createHousingQuery } from '#lib/api/housing.ts';
  import {
    createDepotOwnersQuery,
    createDepotStorageQuery,
    mergeDepotStorage,
  } from '#lib/api/depot.ts';
  import { createInterpolatedPlayerPositionsStream } from '#lib/api/playerInterpolation.svelte.ts';
  import type { DeliveryJob } from '#lib/api/types.ts';
  import Collapsible from '#lib/components/Map/Collapsible/Collapsible.svelte';
  import { ALL_MENU } from '#lib/components/Map/Collapsible/constants.ts';
  import Map from '#lib/components/Map/Map/Map.svelte';
  import { PointType, type PlayerData } from '#lib/components/Map/Map/types.ts';
  import type { CollapsibleType } from '#lib/components/Map/types.ts';
  import { vehicleKeyToString } from '#lib/api/proto/vehicleKeyUtils.ts';
  import { reProjectVec2 } from '#lib/ui/OlMap/utils.ts';
  import { clientSearchParams, clientSearchParamsGet } from '#lib/utils/clientSearchParamsGet.ts';
  import { isSm } from '#lib/utils/media.svelte.ts';
  import { onMount } from 'svelte';
  import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';

  const { children } = $props();

  type OpenCollapsible = [type: CollapsibleType, id: string];

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

  let playerLayerDataEnabled = $state(true);

  const showMap = $derived(!(showFull || (!isSm.current && validOpenCollapsible)));

  const playerPositionsStream = createInterpolatedPlayerPositionsStream(() => ({
    enabled: (showMap && playerLayerDataEnabled) || openCollapsible === 'players',
  }));

  const playerData: PlayerData[] = $derived(
    playerPositionsStream.data?.players.map((item) => {
      const coord = { x: item.x, y: item.y, z: item.z };
      return {
        geometry: reProjectVec2(coord),
        name: item.playerName,
        coord,
        pointType: PointType.Player as const,
        vehicleKey:
          item.vehicleKey.case === 'vehicleKeyEnum'
            ? vehicleKeyToString(item.vehicleKey.value)
            : (item.vehicleKey.value ?? 'None'),
        guid: item.uniqueId,
        hidden: item.hidden,
      };
    }) ?? [],
  );

  /** Hidden players stream as 0,0 stubs — they must never appear on the map. */
  const mapPlayerData: PlayerData[] = $derived(playerData.filter((player) => !player.hidden));

  const playerDataLoading = $derived(playerPositionsStream.isPending);
  /** Map mode drives the sidebar transition speed (faster in 3D). */
  let threeDMode = $state(false);

  const housingQuery = createHousingQuery(() => ({
    options: { enabled: showMap || openCollapsible === 'housing' },
  }));

  const houseData = $derived(housingQuery.data);
  const houseDataLoading = $derived(housingQuery.isPending);

  // The guid -> housing key mapping is fetched once; storage is polled and merged onto it.
  const depotOwnersQuery = createDepotOwnersQuery(() => ({
    options: { enabled: showMap || openCollapsible === 'housing' },
  }));
  const depotStorageQuery = createDepotStorageQuery(() => ({
    options: { enabled: showMap || openCollapsible === 'housing' },
  }));

  const depotData = $derived(mergeDepotStorage(depotOwnersQuery.data, depotStorageQuery.data));

  const jobsQuery = createDeliveryJobsQuery(() => ({
    options: { enabled: showMap || openCollapsible === 'jobs' },
  }));

  const jobsData = $derived(jobsQuery.data ?? []);
  const jobsDataLoading = $derived(jobsQuery.isPending);

  const jobsCache = new SvelteMap<number, DeliveryJob>();

  $effect(() => {
    for (const job of jobsData) {
      jobsCache.set(job.id, job);
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
        <Map
          {jobsData}
          {houseData}
          {depotData}
          playerData={mapPlayerData}
          onPlayerLayerDataEnabledChange={(e) => (playerLayerDataEnabled = e)}
          onThreeDModeChange={(m) => (threeDMode = m)}
        />
      </div>
    </div>
  </div>

  <Collapsible
    {validOpenCollapsible}
    {showFull}
    {threeDMode}
    {openCollapsible}
    {openCollapsibleId}
    {playerData}
    {playerDataLoading}
    {houseData}
    {houseDataLoading}
    {depotData}
    {jobsData}
    {jobsDataLoading}
    {jobsCache}
  />
</div>

{@render children()}
