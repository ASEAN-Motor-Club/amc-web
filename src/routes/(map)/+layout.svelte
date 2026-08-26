<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { createDeliveryJobsQuery } from '$lib/api/delivery';
  import { createHousingQuery } from '$lib/api/housing';
  import { createPlayerPositionsV2Stream } from '$lib/api/player';
  import type { DeliveryJob } from '$lib/api/types';
  import Collapsible from '$lib/components/Map/Collapsible/Collapsible.svelte';
  import { ALL_MENU } from '$lib/components/Map/Collapsible/constants';
  import { PointType, type PlayerData } from '$lib/components/Map/Map/types';
  import type { CollapsibleType } from '$lib/components/Map/types';
  import { m } from '$lib/paraglide/messages';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { vehicleKeyToString } from '$lib/api/proto/vehicleKeyUtils';
  import { reProjectVec2 } from '$lib/ui/OlMap/utils';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import { isSm } from '$lib/utils/media.svelte';
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

  let playerLayerDataEnabled = $state(true);

  const showMap = $derived(!(showFull || (!isSm.current && validOpenCollapsible)));

  const playerPositionsStream = createPlayerPositionsV2Stream(() => ({
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
      };
    }) ?? [],
  );

  const playerDataLoading = $derived(playerPositionsStream.isPending);
  /** Map mode drives the sidebar transition speed (faster in 3D). */
  let threeDMode = $state(false);

  const housingQuery = createHousingQuery(() => ({
    options: { enabled: showMap || openCollapsible === 'housing' },
  }));

  const houseData = $derived(housingQuery.data);
  const houseDataLoading = $derived(housingQuery.isPending);

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
              onThreeDModeChange={(m) => (threeDMode = m)}
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
    {threeDMode}
    {openCollapsible}
    {openCollapsibleId}
    {playerData}
    {playerDataLoading}
    {houseData}
    {houseDataLoading}
    {jobsData}
    {jobsDataLoading}
    {jobsCache}
  />
</div>

{@render children()}
