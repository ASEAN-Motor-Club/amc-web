<script lang="ts">
  import { noop } from 'es-toolkit';
  import { page } from '$app/state';
  import { m } from '#messages';
  import ThreeMapWrapper from '#lib/components/Map/Map/ThreeMapWrapper.svelte';
  import { getDeliveryLine } from '#lib/components/Map/Map/deliveryLine.ts';
  import { PointType, type MapFeature, type MapState } from '#lib/components/Map/Map/types.ts';
  import { deliveryPoints } from '#lib/data/deliveryPoint.ts';
  import type { Vector2 } from '#lib/types/index.ts';
  import { reProjectVec2 } from '#lib/utils/mapProjection.ts';
  import type { MapViewState } from '#lib/ui/ThreeMap/view.ts';
  import { createParityMock, PARITY_ANCHOR_INDEX } from './mockData.ts';

  // Dev-only harness for the map renderer (browser scripts in .agents/skills/visual-diff drive it).
  // Query: r=ortho (default, flat 2D) | three (3D perspective); at=<delivery point index> or x,y =
  // px-space centre, z = zoom; on/off = comma lists of mapState keys; drop=pins; line = delivery
  // point index to preview lines for; sel / selplayer = index to select; drift=1 streams the
  // players east; pick = game "x,y" pointer (or `anchor`); pickmode=1 arms the picker;
  // chrome=0 hides the buttons; seed = mock data seed.
  const params = $derived(page.url.searchParams);
  const view = $derived(params.get('r') === 'three' ? 'perspective' : 'ortho');
  const initialView: MapViewState | undefined = $derived.by(() => {
    if (!params.has('z')) return undefined;
    const zoom = Number(params.get('z'));
    if (params.has('at'))
      return { center: reProjectVec2(named[Number(params.get('at'))].coord), zoom };
    return params.has('x') && params.has('y')
      ? { center: [Number(params.get('x')), Number(params.get('y'))], zoom }
      : undefined;
  });

  const mock = createParityMock(Number(page.url.searchParams.get('seed') ?? 1));
  // drop=pins removes a whole data set, for layer scenes that diff data present vs absent.
  const dropped = $derived(new Set(params.get('drop')?.split(',')));
  const pinsData = $derived(dropped.has('pins') ? [] : mock.pinsData);
  const named = deliveryPoints.filter((p) => p.type !== 'Resident_C');

  const mapState: MapState = $derived.by(() => {
    const state: MapState = {
      delivery: true,
      house: true,
      player: true,
      playerName: true,
      pins: true,
      pinLabels: true,
      teleport: true,
      teleportLabels: true,
      shortcutZone: true,
      shortcutZoneLabels: true,
      areaName: true,
      areaBound: false,
      jobOnly: false,
      houseVacantOnly: false,
      houseSevereOnly: false,
      houseLabels: true,
    };
    for (const key of params.get('on')?.split(',').filter(Boolean) ?? []) {
      if (key in state) state[key as keyof MapState] = true;
    }
    for (const key of params.get('off')?.split(',').filter(Boolean) ?? []) {
      if (key in state) state[key as keyof MapState] = false;
    }
    return state;
  });

  // drift=1 streams the players eastwards (50 m/s), so lock-follow can be probed.
  let driftMeters = $state(0);
  $effect(() => {
    if (params.get('drift') !== '1') return;
    const timer = setInterval(() => (driftMeters += 10), 200);
    return () => clearInterval(timer);
  });
  const playerData = $derived(
    mock.playerData.map((p) => {
      const coord = { ...p.coord, x: p.coord.x + driftMeters * 100 };
      return { ...p, coord, geometry: reProjectVec2(coord) };
    }),
  );

  const lineIndex = $derived(params.has('line') ? Number(params.get('line')) : undefined);
  const deliveryLineData = $derived(
    lineIndex === undefined
      ? undefined
      : getDeliveryLine(named[lineIndex], mock.jobsData, mapState.jobOnly),
  );
  const selection = $derived(
    params.has('sel')
      ? { pointType: PointType.Delivery as const, id: named[Number(params.get('sel'))].guid }
      : params.has('selplayer')
        ? {
            pointType: PointType.Player as const,
            id: mock.playerData[Number(params.get('selplayer'))].guid,
          }
        : undefined,
  );
  const pickPoint: Vector2 | undefined = $derived.by(() => {
    if (params.get('pick') === 'anchor') {
      const { x, y } = named[PARITY_ANCHOR_INDEX].coord;
      return { x: x + 6000, y: y - 4000 };
    }
    const [x, y] = (params.get('pick') ?? '').split(',').map(Number);
    return params.has('pick') ? { x, y } : undefined;
  });
  const chrome = $derived(params.get('chrome') !== '0');
  // Probe hook for browser scripts: where the three.js map is looking right now.
  let threeMap = $state<ThreeMapWrapper | undefined>();
  $effect(() => {
    (window as unknown as { __mapHarness?: unknown }).__mapHarness = {
      getViewState: () => threeMap?.getViewState(),
    };
  });
  // What the pointer is over, for interaction probes (data-hover on the host).
  let hovered = $state('');
  const onHover = (feature: MapFeature | undefined) => {
    hovered = feature ? String(feature.pointType) : '';
  };
  const title = $derived(m['map.head']({ siteName: m.site_name_short() }));
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
</svelte:head>

<div
  class={['parity-host fixed inset-0 z-9999 bg-gray-900', !chrome && 'parity-no-chrome']}
  data-hover={hovered}
>
  {#key `${view}|${params.get('x')}|${params.get('y')}|${params.get('at')}|${params.get('z')}`}
    <ThreeMapWrapper
      bind:this={threeMap}
      {view}
      {mapState}
      {...mock}
      {pinsData}
      {playerData}
      {deliveryLineData}
      {selection}
      {pickPoint}
      pickMode={params.get('pickmode') === '1'}
      {initialView}
      {onHover}
      onToggleMapMode={noop}
    />
  {/key}
</div>

<style>
  .parity-no-chrome :global(button) {
    display: none;
  }
</style>
