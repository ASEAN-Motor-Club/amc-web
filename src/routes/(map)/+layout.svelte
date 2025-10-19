<script lang="ts">
  import { page } from '$app/state';
  import { getPlayerRealtimePosition } from '$lib/api/player';
  import Collapsible from '$lib/components/Map/Collapsible/Collapsible.svelte';
  import { ALL_MENU } from '$lib/components/Map/Collapsible/constants';
  import Map from '$lib/components/Map/Map/Map.svelte';
  import { PointType, type PlayerData } from '$lib/components/Map/Map/types';
  import { reProjectPoint } from '$lib/ui/OlMap/utils';
  import { clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import { isSm } from '$lib/utils/media.svelte';

  const { children } = $props();

  const showFull = $derived.by(() => {
    const path = page.url.pathname.split('/')[1];
    return ALL_MENU.includes(path);
  });

  const menu = $derived((clientSearchParamsGet('menu') ?? '').split('/')[0]);

  const validOpenCollapsible = $derived.by(() => {
    return ALL_MENU.includes(menu);
  });

  let stopPolling: (() => void) | undefined = undefined;

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
    stopPolling?.();
    if (
      (showMap && !document.hidden && playerLayerDataEnabled) ||
      page.url.pathname === '/players' ||
      menu === 'players'
    ) {
      stopPolling = getPlayerRealtimePositionCall();
    } else {
      stopPolling = undefined;
      playerData = [];
    }

    return () => {
      stopPolling?.();
      stopPolling = undefined;
    };
  });

  let map: Map | undefined = $state(undefined);

  const handleCenter = (point: [number, number]) => {
    map?.centerOnPoint(point);
  };
</script>

<div class="relative flex h-full w-full">
  <div class="flex h-full w-full flex-1 overflow-hidden pb-12 sm:pb-0">
    <div
      class={[
        'flex h-full w-full transition-opacity duration-1000 sm:min-w-60',
        showMap ? 'opacity-100' : 'opacity-0',
      ]}
    >
      <Map
        {playerData}
        onPlayerLayerDataEnabledChange={(e) => (playerLayerDataEnabled = e)}
        bind:this={map}
      />
    </div>
  </div>

  <Collapsible {playerData} {playerDataLoading} onCenter={handleCenter} />
</div>

{@render children()}
