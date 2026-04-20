<script lang="ts">
  import OlMap from '$lib/ui/OlMap/OlMap.svelte';
  import { onMount, untrack, getAbortSignal } from 'svelte';
  import { fade } from 'svelte/transition';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import ClickAwayBlock from '$lib/ui/ClickAwayBlock/ClickAwayBlock.svelte';
  import PoiItem from './PoiItem.svelte';
  import { PlayerRoles, PointType, type PlayerData, type TeleportPoint } from './types';
  import {
    addStaticLayers,
    getDeliveryPointPaint,
    getResidentPointPaint,
    getHousePaint,
    SRC_DELIVERY,
    SRC_RESIDENT,
    SRC_HOUSE,
    LYR_DELIVERY,
    LYR_RESIDENT,
    LYR_HOUSE,
    LYR_HOUSE_LABEL,
  } from './staticPoints';
  import HoverInfoTooltip, { type HoverInfo } from './HoverInfoTooltip.svelte';
  import {
    colorEmerald200,
    colorEmerald400,
    colorGreen500,
    colorBlue500,
    adjustOpacity,
    colorYellow500,
    colorRed200,
    colorRed400,
    colorRed500,
    colorEmerald500,
    colorWhite,
    colorRed950,
    colorEmerald950,
    colorBlue950,
    colorViolet200,
    colorViolet400,
    colorViolet950,
    defaultTransitionDurationMs,
  } from '$lib/tw-var';
  import {
    deliveryPointsMap,
    demandKeyMapNoResident,
    supplyKeyMap,
    type DeliveryPoint,
  } from '$lib/data/deliveryPoint';
  import { goto } from '$app/navigation';
  import Search, { type SearchPoint } from './Search.svelte';
  import { reProjectPoint } from '$lib/ui/OlMap/utils';
  import { DeliveryLineType, type DeliveryJob, type HouseData } from '$lib/api/types';
  import { getTeleports } from '$lib/api/teleport';
  import { getShortcutZones, type ShortcutZone } from '$lib/api/shortcutZone';
  import type { DeliveryCargo } from '$lib/data/types';
  import { uniq } from 'lodash-es';
  import { cargoMetadata } from '$lib/data/cargo';
  import { m } from '$messages';
  import { isMouse } from '$lib/utils/media.svelte';
  import { pinsSchema, type Pin, type Pins } from '$lib/schema/pin';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { SvelteSet } from 'svelte/reactivity';
  import * as z from 'zod/mini';
  import { clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import { getMatchJobDestFn, getMatchJobSourceFn } from '$lib/utils/delivery';
  import { getSelectionClearedParams } from '../utils';
  import { hasPoliceRole, hasCriminalRole } from '$lib/utils/parsePlayerRole';
  import Button from '$lib/ui/Button/Button.svelte';
  import type { Map as MaplibreMap, MapMouseEvent, LayerSpecification } from 'maplibre-gl';
  import maplibregl from 'maplibre-gl';

  interface Props {
    jobsData: DeliveryJob[];
    playerData: PlayerData[];
    houseData: HouseData | undefined;
    onPlayerLayerDataEnabledChange?: (enabled: boolean) => void;
  }

  const { jobsData, playerData, houseData, onPlayerLayerDataEnabledChange }: Props = $props();

  // ──────────────────────────────────────────────────────────────────────────
  // Source / layer IDs
  // ──────────────────────────────────────────────────────────────────────────
  const SRC_DELIVERY_LINE = 'delivery-line-source';
  const SRC_PLAYER = 'player-source';
  const SRC_PINS = 'pins-source';
  const SRC_TELEPORT = 'teleport-source';
  const SRC_SHORTCUT = 'shortcut-source';

  const LYR_DELIVERY_LINE = 'delivery-line-layer';
  const LYR_PLAYER = 'player-layer';
  const LYR_PLAYER_NAME = 'player-name-layer';
  const LYR_PINS = 'pins-layer';
  const LYR_PIN_LABEL = 'pin-label-layer';
  const LYR_TELEPORT = 'teleport-layer';
  const LYR_TELEPORT_LABEL = 'teleport-label-layer';
  const LYR_SHORTCUT_FILL = 'shortcut-fill-layer';
  const LYR_SHORTCUT_LINE = 'shortcut-line-layer';
  const LYR_SHORTCUT_LABEL = 'shortcut-label-layer';

  // ──────────────────────────────────────────────────────────────────────────
  // Map state
  // ──────────────────────────────────────────────────────────────────────────
  const MAP_STATE_STORAGE_KEY = 'mapState';

  const mapState = $state({
    delivery: true,
    house: true,
    player: true,
    playerName: true,
    pins: true,
    pinLabels: true,
    teleport: true,
    teleportLabels: false,
    shortcutZone: true,
    jobOnly: false,
    houseVacantOnly: false,
    houseLabels: false,
    playerCopsOnly: false,
    playerCriminalOnly: false,
  });

  let poiOpen = $state(false);

  const mapStateSchema = z.object({
    delivery: z.optional(z.boolean()),
    house: z.optional(z.boolean()),
    player: z.optional(z.boolean()),
    playerName: z.optional(z.boolean()),
    jobOnly: z.optional(z.boolean()),
    houseVacantOnly: z.optional(z.boolean()),
    houseLabels: z.optional(z.boolean()),
    playerCopsOnly: z.optional(z.boolean()),
    playerCriminalOnly: z.optional(z.boolean()),
    teleport: z.optional(z.boolean()),
    teleportLabels: z.optional(z.boolean()),
    shortcutZone: z.optional(z.boolean()),
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Reactive / mutable data
  // ──────────────────────────────────────────────────────────────────────────
  let pinsData = $state<Pins>([]);
  const havePins = $derived(pinsData.length > 0);
  let teleportData = $state<TeleportPoint[]>([]);
  const haveTeleports = $derived(teleportData.length > 0);
  let shortcutZoneData = $state<ShortcutZone[]>([]);
  const haveShortcutZones = $derived(shortcutZoneData.length > 0);

  // MapLibre instance (available after onMapReady)
  let mlMap: MaplibreMap | undefined = $state();

  // Hover / selection tracking
  let hoverInfo: HoverInfo | undefined = $state();
  let hoveredSource: string | null = null;
  let hoveredId: string | number | null = null;
  let selectedSource: string | null = null;
  let selectedId: string | number | null = null;
  let lockSource: string | null = null;
  let lockId: string | number | null = null;

  let playerStickyFocusGuid: string | undefined = undefined;
  let playerSelectingGuid: string | undefined = undefined;
  let initialFocus = true;

  // Teleport copy feedback
  let teleportCopyTimeout: ReturnType<typeof setTimeout> | undefined;
  let copiedTeleportName = $state<string | undefined>(undefined);
  const teleportCopied = $derived(
    hoverInfo?.pointType === PointType.Teleport && hoverInfo.info.name === copiedTeleportName,
  );

  // Delivery line GeoJSON (rebuilt on hover/selection changes)
  const emptyGeoJson = (): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: [],
  });
  let deliveryLineGeoJson = $state<GeoJSON.FeatureCollection>(emptyGeoJson());

  // Handles into static layer feature arrays (set in handleMapReady)
  let staticHandle: ReturnType<typeof addStaticLayers> | undefined;

  // ──────────────────────────────────────────────────────────────────────────
  // Visibility helpers
  // ──────────────────────────────────────────────────────────────────────────
  const vis = (on: boolean): 'visible' | 'none' => (on ? 'visible' : 'none');
  const setVis = (id: string, on: boolean) => mlMap?.setLayoutProperty(id, 'visibility', vis(on));

  // ──────────────────────────────────────────────────────────────────────────
  // Feature state helpers
  // ──────────────────────────────────────────────────────────────────────────
  const clearHover = () => {
    if (hoveredSource !== null && hoveredId !== null)
      mlMap?.setFeatureState({ source: hoveredSource, id: hoveredId }, { hover: false });
    hoveredSource = null;
    hoveredId = null;
  };

  const setHover = (source: string, id: string | number) => {
    clearHover();
    hoveredSource = source;
    hoveredId = id;
    mlMap?.setFeatureState({ source, id }, { hover: true });
  };

  const clearSelection = () => {
    if (selectedSource !== null && selectedId !== null)
      mlMap?.setFeatureState({ source: selectedSource, id: selectedId }, { selected: false });
    selectedSource = null;
    selectedId = null;
    clearLock();
    playerSelectingGuid = undefined;
    playerStickyFocusGuid = undefined;
    clearDeliveryLines();
    const newParams = getSelectionClearedParams();
    goto(`?${newParams.toString()}`);
  };

  const setSelection = (source: string, id: string | number) => {
    if (selectedSource !== null && selectedId !== null)
      mlMap?.setFeatureState({ source: selectedSource, id: selectedId }, { selected: false });
    selectedSource = source;
    selectedId = id;
    mlMap?.setFeatureState({ source, id }, { selected: true });
  };

  const clearLock = () => {
    if (lockSource !== null && lockId !== null)
      mlMap?.setFeatureState({ source: lockSource, id: lockId }, { selected: false });
    lockSource = null;
    lockId = null;
  };

  const setLock = (source: string, id: string | number) => {
    clearLock();
    lockSource = source;
    lockId = id;
    mlMap?.setFeatureState({ source, id }, { selected: true });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Delivery-line helpers
  // ──────────────────────────────────────────────────────────────────────────
  const clearDeliveryLines = () => {
    deliveryLineGeoJson = emptyGeoJson();
  };

  const getDeliveryPoint = (guid: string) => {
    const point = deliveryPointsMap.get(guid);
    if (!point) throw new Error(`Delivery point not found: ${guid}`);
    return point;
  };

  const updateDeliveryLine = (deliveryPoint: DeliveryPoint) => {
    const matchSourceJob = jobsData.filter(getMatchJobSourceFn(deliveryPoint));
    const matchDestJob = jobsData.filter(getMatchJobDestFn(deliveryPoint));

    if (mapState.jobOnly && matchSourceJob.length === 0 && matchDestJob.length === 0) return;

    const allDropPointLink: [DeliveryPoint, DeliveryPoint][] = [];

    if (deliveryPoint.parent) {
      allDropPointLink.push([deliveryPoint, getDeliveryPoint(deliveryPoint.parent)]);
    }

    const connectedDrop = new SvelteSet<DeliveryCargo>();
    if (deliveryPoint.dropPoint) {
      for (const dropPointGuid of deliveryPoint.dropPoint) {
        const dropPoint = getDeliveryPoint(dropPointGuid);
        for (const cargoType of dropPoint.allDemand) connectedDrop.add(cargoType);
        allDropPointLink.push([deliveryPoint, dropPoint]);
      }
    }

    const allSupplyDestinations = uniq(
      deliveryPoint.allSupplyKey
        .map((d) => [d, cargoMetadata[d], demandKeyMapNoResident.get(d) ?? []] as const)
        .flatMap(([d, cd, dps]) =>
          dps.map((dp) => {
            const point = getDeliveryPoint(dp);
            if (mapState.jobOnly) {
              const hasDestJob = matchSourceJob.some(getMatchJobDestFn(point));
              if (!hasDestJob) return undefined;
            }
            if (point.dropPoint) {
              const hasConnectedDrop = point.dropPoint.some((g) =>
                deliveryPointsMap.get(g)?.allDemandKey.includes(d),
              );
              if (hasConnectedDrop) return undefined;
            }
            if (cd.minDist || cd.maxDist || deliveryPoint.maxDist || point.maxReceiveDist) {
              const dist = Math.hypot(
                point.coord.x - deliveryPoint.coord.x,
                point.coord.y - deliveryPoint.coord.y,
              );
              if (cd.minDist && dist < cd.minDist) return undefined;
              if (cd.maxDist && dist > cd.maxDist) return undefined;
              if (deliveryPoint.maxDist && dist > deliveryPoint.maxDist) return undefined;
              if (point.maxReceiveDist && dist > point.maxReceiveDist) return undefined;
            }
            if (point.parent) allDropPointLink.push([point, getDeliveryPoint(point.parent)]);
            return point;
          }),
        )
        .filter((d) => d !== undefined),
    );

    const allDemandDestinations = uniq(
      deliveryPoint.allDemandKey
        .filter((d) => !connectedDrop.has(d))
        .map((d) => [cargoMetadata[d], supplyKeyMap.get(d) ?? []] as const)
        .flatMap(([cd, dps]) =>
          dps.map((dp) => {
            const point = getDeliveryPoint(dp);
            if (mapState.jobOnly) {
              const hasSourceJob = matchDestJob.some(getMatchJobSourceFn(point));
              if (!hasSourceJob) return undefined;
            }
            if (cd.minDist || cd.maxDist || deliveryPoint.maxReceiveDist || point.maxDist) {
              const dist = Math.hypot(
                point.coord.x - deliveryPoint.coord.x,
                point.coord.y - deliveryPoint.coord.y,
              );
              if (cd.minDist && dist < cd.minDist) return undefined;
              if (cd.maxDist && dist > cd.maxDist) return undefined;
              if (deliveryPoint.maxReceiveDist && dist > deliveryPoint.maxReceiveDist)
                return undefined;
              if (point.maxDist && dist > point.maxDist) return undefined;
            }
            if (point.dropPoint) {
              for (const g of point.dropPoint) {
                const dp2 = getDeliveryPoint(g);
                allDropPointLink.push([point, dp2]);
              }
            }
            return point;
          }),
        )
        .filter((d) => d !== undefined),
    );

    const makeLineFeature = (
      a: DeliveryPoint,
      b: DeliveryPoint,
      type: DeliveryLineType,
    ): GeoJSON.Feature => ({
      type: 'Feature',
      id: `${a.guid}-${b.guid}-${type}`,
      geometry: {
        type: 'LineString',
        coordinates: [reProjectPoint([a.coord.x, a.coord.y]), reProjectPoint([b.coord.x, b.coord.y])],
      },
      properties: { type },
    });

    deliveryLineGeoJson = {
      type: 'FeatureCollection',
      features: [
        ...allDemandDestinations.map((d) =>
          makeLineFeature(deliveryPoint, d, DeliveryLineType.Demand),
        ),
        ...allSupplyDestinations.map((d) =>
          makeLineFeature(deliveryPoint, d, DeliveryLineType.Supply),
        ),
        ...allDropPointLink.map(([d1, d2]) => makeLineFeature(d1, d2, DeliveryLineType.Drop)),
      ],
    };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Map ready – add all dynamic sources and layers
  // ──────────────────────────────────────────────────────────────────────────
  const handleMapReady = (map: MaplibreMap) => {
    mlMap = map;

    // --- Static layers (delivery / house) ---
    staticHandle = addStaticLayers(map);

    // --- Delivery lines ---
    map.addSource(SRC_DELIVERY_LINE, { type: 'geojson', data: deliveryLineGeoJson });
    map.addLayer({
      id: LYR_DELIVERY_LINE,
      type: 'line',
      source: SRC_DELIVERY_LINE,
      layout: { 'line-cap': 'round' },
      paint: {
        'line-width': 2,
        'line-color': [
          'match',
          ['get', 'type'],
          DeliveryLineType.Supply,
          adjustOpacity(colorGreen500, 0.75),
          DeliveryLineType.Demand,
          adjustOpacity(colorBlue500, 0.75),
          adjustOpacity(colorYellow500, 0.75),
        ],
      },
    } as LayerSpecification);

    // --- Players ---
    map.addSource(SRC_PLAYER, {
      type: 'geojson',
      data: emptyGeoJson(),
      promoteId: 'guid',
    });
    map.addLayer({
      id: LYR_PLAYER,
      type: 'circle',
      source: SRC_PLAYER,
      paint: {
        'circle-radius': 4,
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          colorEmerald200,
          ['boolean', ['feature-state', 'selected'], false],
          colorEmerald500,
          ['==', ['get', 'role'], PlayerRoles.Police],
          colorBlue500,
          ['==', ['get', 'role'], PlayerRoles.Criminal],
          colorRed500,
          colorEmerald400,
        ],
        'circle-stroke-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          colorWhite,
          ['==', ['get', 'role'], PlayerRoles.Police],
          colorBlue950,
          ['==', ['get', 'role'], PlayerRoles.Criminal],
          colorRed950,
          colorEmerald950,
        ],
        'circle-stroke-width': 1,
      },
    } as LayerSpecification);
    map.addLayer({
      id: LYR_PLAYER_NAME,
      type: 'symbol',
      source: SRC_PLAYER,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-offset': [0, -1.5],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': 'rgba(15,23,42,0.4)',
        'text-halo-width': 2,
      },
    });

    // --- Pins ---
    map.addSource(SRC_PINS, { type: 'geojson', data: emptyGeoJson(), promoteId: 'pinIndex' });
    map.addLayer({
      id: LYR_PINS,
      type: 'circle',
      source: SRC_PINS,
      paint: {
        'circle-radius': 5,
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          colorRed200,
          ['boolean', ['feature-state', 'selected'], false],
          colorRed500,
          colorRed400,
        ],
        'circle-stroke-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          colorWhite,
          colorRed950,
        ],
        'circle-stroke-width': 1,
      },
    } as LayerSpecification);
    map.addLayer({
      id: LYR_PIN_LABEL,
      type: 'symbol',
      source: SRC_PINS,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-offset': [0, -1.5],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': 'rgba(15,23,42,0.4)',
        'text-halo-width': 2,
      },
    });

    // --- Teleports ---
    map.addSource(SRC_TELEPORT, { type: 'geojson', data: emptyGeoJson(), promoteId: 'name' });
    map.addLayer({
      id: LYR_TELEPORT,
      type: 'circle',
      source: SRC_TELEPORT,
      paint: {
        'circle-radius': 5,
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          colorViolet200,
          colorViolet400,
        ],
        'circle-stroke-color': colorViolet950,
        'circle-stroke-width': 1,
      },
    } as LayerSpecification);
    map.addLayer({
      id: LYR_TELEPORT_LABEL,
      type: 'symbol',
      source: SRC_TELEPORT,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 8,
        'text-offset': [0, -1.5],
        'text-allow-overlap': false,
        visibility: 'none',
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': 'rgba(15,23,42,0.4)',
        'text-halo-width': 2,
      },
    });

    // --- Shortcut zones ---
    map.addSource(SRC_SHORTCUT, { type: 'geojson', data: emptyGeoJson() });
    map.addLayer({
      id: LYR_SHORTCUT_FILL,
      type: 'fill',
      source: SRC_SHORTCUT,
      paint: {
        'fill-color': adjustOpacity(colorRed500, 0.12),
      },
    });
    map.addLayer({
      id: LYR_SHORTCUT_LINE,
      type: 'line',
      source: SRC_SHORTCUT,
      paint: {
        'line-color': colorRed500,
        'line-width': 2,
        'line-dasharray': [4, 6],
      },
    });
    map.addLayer({
      id: LYR_SHORTCUT_LABEL,
      type: 'symbol',
      source: SRC_SHORTCUT,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 8,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': 'rgba(15,23,42,0.4)',
        'text-halo-width': 2,
      },
    });

    // ── Load initial state from localStorage ──
    try {
      const raw = JSON.parse(localStorage.getItem(MAP_STATE_STORAGE_KEY) ?? '');
      const result = mapStateSchema.safeParse(raw);
      if (result.success) {
        const s = result.data;
        if (s.delivery === false) {
          mapState.delivery = false;
          setVis(LYR_DELIVERY, false);
          setVis(LYR_RESIDENT, false);
          setVis(LYR_DELIVERY_LINE, false);
        }
        if (s.house === false) {
          mapState.house = false;
          setVis(LYR_HOUSE, false);
        }
        if (s.player === false) {
          mapState.player = false;
          setVis(LYR_PLAYER, false);
          setVis(LYR_PLAYER_NAME, false);
        }
        if (s.playerName === false) {
          mapState.playerName = false;
          if (mapState.player) setVis(LYR_PLAYER_NAME, false);
        }
        if (s.teleport === false) {
          mapState.teleport = false;
          setVis(LYR_TELEPORT, false);
          setVis(LYR_TELEPORT_LABEL, false);
        }
        if (s.teleportLabels === true) {
          mapState.teleportLabels = true;
          if (mapState.teleport) setVis(LYR_TELEPORT_LABEL, true);
        }
        if (s.shortcutZone === false) {
          mapState.shortcutZone = false;
          setVis(LYR_SHORTCUT_FILL, false);
          setVis(LYR_SHORTCUT_LINE, false);
          setVis(LYR_SHORTCUT_LABEL, false);
        }
        mapState.jobOnly = s.jobOnly ?? false;
        mapState.houseVacantOnly = s.houseVacantOnly ?? false;
        if (s.houseLabels === true) {
          mapState.houseLabels = true;
          if (mapState.house) setVis(LYR_HOUSE_LABEL, true);
        }
        mapState.playerCopsOnly = s.playerCopsOnly ?? false;
        mapState.playerCriminalOnly = s.playerCriminalOnly ?? false;
      }
    } catch {
      // ignore parse errors
    }

    // ── Fetch teleports ──
    getTeleports(getAbortSignal())
      .then((data) => {
        const points: TeleportPoint[] = data.map((d) => ({
          name: d.name,
          coord: { x: d.x, y: d.y, z: d.z },
        }));
        const geoJson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: points.map((p) => {
            const [lng, lat] = reProjectPoint([p.coord.x, p.coord.y]);
            return {
              type: 'Feature',
              id: p.name,
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: { pointType: PointType.Teleport, name: p.name },
            } satisfies GeoJSON.Feature;
          }),
        };
        (map.getSource(SRC_TELEPORT) as maplibregl.GeoJSONSource | undefined)?.setData(geoJson);
        teleportData = points;
      })
      .catch((e: unknown) => console.error('Failed to load teleport data:', e));

    // ── Fetch shortcut zones ──
    getShortcutZones(getAbortSignal())
      .then((data) => {
        const geoJson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: data.map((zone, i) => ({
            type: 'Feature',
            id: i,
            geometry: {
              type: 'Polygon',
              coordinates: [zone.coordinates.map(([x, y]) => reProjectPoint([x, y] as [number, number]))],
            },
            properties: { pointType: PointType.ShortcutZone, name: zone.name },
          })),
        };
        (map.getSource(SRC_SHORTCUT) as maplibregl.GeoJSONSource | undefined)?.setData(geoJson);
        shortcutZoneData = data;
      })
      .catch((e: unknown) => console.error('Failed to load shortcut zone data:', e));

    // ── Pointer-move hover ──
    const hoverableLayers = [
      LYR_DELIVERY,
      LYR_RESIDENT,
      LYR_HOUSE,
      LYR_TELEPORT,
      LYR_PLAYER,
    ];

    map.on('mousemove', (e: MapMouseEvent) => {
      if (!isMouse.current) {
        hoverInfo = undefined;
        return;
      }
      handlePointerMoveOrClick(e);
    });

    map.on('movestart', () => {
      clearHover();
      hoverInfo = undefined;
    });

    map.on('drag', () => {
      playerStickyFocusGuid = undefined;
    });

    map.on('contextmenu', (e: MapMouseEvent) => {
      e.preventDefault();
      clearSelection();
      // Allow right-click to "pin" a delivery point
      if (hoverInfo?.pointType === PointType.Delivery) {
        const newParams = getSelectionClearedParams();
        newParams.set('delivery', hoverInfo.info.guid ?? '');
        dontFocus = true;
        goto(`?${newParams.toString()}`, { noScroll: true, keepFocus: true });
      }
    });

    // ── Click ──
    map.on('click', (e: MapMouseEvent) => {
      clearSelection();
      if (isMouse.current) {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [LYR_DELIVERY, LYR_RESIDENT, LYR_HOUSE, LYR_TELEPORT],
        });
        if (features.length > 0) {
          const f = features[0];
          const type = f.properties?.pointType as PointType | undefined;
          if (type === PointType.Delivery) {
            const guid = f.id as string;
            const newParams = getSelectionClearedParams();
            newParams.set('menu', `deliveries/${guid}`);
            newParams.set('delivery', guid);
            goto(`/map?${newParams.toString()}`);
          } else if (type === PointType.House) {
            const name = f.id as string;
            const newParams = getSelectionClearedParams();
            newParams.set('menu', 'housing');
            newParams.set('house', name);
            newParams.set('hf', name);
            goto(`/map?${newParams.toString()}`);
          } else if (type === PointType.Teleport) {
            handleCopyTeleport();
          }
        }
        return;
      }
      handlePointerMoveOrClick(e);
    });

    // Hover cursors
    for (const lyr of hoverableLayers) {
      map.on('mouseenter', lyr, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', lyr, () => {
        map.getCanvas().style.cursor = '';
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Pointer-move / click feature detection
  // ──────────────────────────────────────────────────────────────────────────
  let dontFocus = false;

  const handlePointerMoveOrClick = (e: MapMouseEvent) => {
    if (!mlMap) return;
    const features = mlMap.queryRenderedFeatures(e.point, {
      layers: [LYR_DELIVERY, LYR_RESIDENT, LYR_HOUSE, LYR_TELEPORT, LYR_PLAYER],
    });

    if (features.length === 0) {
      clearHover();
      hoverInfo = undefined;
      return;
    }

    const f = features[0];
    const type = f.properties?.pointType as PointType | undefined;
    const source = f.source;
    const id = f.id;

    if (id === undefined || id === null) return;

    if (hoveredId !== id || hoveredSource !== source) {
      if (!lockId) {
        clearDeliveryLines();
        if (type === PointType.Delivery) {
          const guid = id as string;
          const dp = deliveryPointsMap.get(guid);
          if (dp) updateDeliveryLine(dp);
        }
      }
      setHover(source, id);
    }

    const pixelCoord: [number, number] = [e.point.x, e.point.y];

    if (type === PointType.Delivery) {
      const guid = id as string;
      const dp = deliveryPointsMap.get(guid);
      if (dp) {
        hoverInfo = {
          pointType: PointType.Delivery,
          pixelCoord,
          info: dp,
          jobOnly: 0,
        };
      }
    } else if (type === PointType.House) {
      const name = id as string;
      const house = { name } as { name: string };
      hoverInfo = {
        pointType: PointType.House,
        pixelCoord,
        info: house as import('$lib/data/house').House,
      };
    } else if (type === PointType.Teleport) {
      const tp = teleportData.find((t) => t.name === id);
      if (tp)
        hoverInfo = { pointType: PointType.Teleport, pixelCoord, info: tp };
    } else if (type === PointType.Player) {
      const guid = id as string;
      const pd = playerData.find((p) => p.guid === guid);
      if (pd) hoverInfo = { pointType: PointType.Player, pixelCoord, info: pd };
    } else {
      hoverInfo = undefined;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Teleport copy
  // ──────────────────────────────────────────────────────────────────────────
  const handleCopyTeleport = () => {
    if (hoverInfo?.pointType !== PointType.Teleport) return;
    const name = hoverInfo.info.name;
    navigator.clipboard.writeText(`/tp ${name}`);
    copiedTeleportName = name;
    clearTimeout(teleportCopyTimeout);
    teleportCopyTimeout = setTimeout(() => (copiedTeleportName = undefined), 2000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HoverInfoTooltip click handler
  // ──────────────────────────────────────────────────────────────────────────
  const handleInfoClick = () => {
    if (!hoverInfo) return;
    if (hoverInfo.pointType === PointType.Delivery) {
      const newParams = getSelectionClearedParams();
      newParams.set('delivery', hoverInfo.info.guid);
      goto(`/deliveries/${hoverInfo.info.guid}?${newParams.toString()}`);
    } else if (hoverInfo.pointType === PointType.House) {
      const newParams = getSelectionClearedParams();
      newParams.set('house', hoverInfo.info.name);
      newParams.set('hf', hoverInfo.info.name);
      goto(`/housing?${newParams.toString()}`);
    }
    clearHover();
    hoverInfo = undefined;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Player data updates
  // ──────────────────────────────────────────────────────────────────────────
  const filteredPlayerData = $derived.by(() => {
    if (!mapState.playerCopsOnly && !mapState.playerCriminalOnly) return playerData;
    return playerData.filter((p) => {
      if (mapState.playerCopsOnly && hasPoliceRole(p.name)) return true;
      if (mapState.playerCriminalOnly && hasCriminalRole(p.name)) return true;
      return false;
    });
  });

  $effect(() => {
    if (!mlMap?.loaded()) return;
    const geoJson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: filteredPlayerData.map((pd) => {
        const role = hasPoliceRole(pd.name)
          ? PlayerRoles.Police
          : hasCriminalRole(pd.name)
            ? PlayerRoles.Criminal
            : 'none';
        const [lng, lat] = reProjectPoint([pd.coord.x, pd.coord.y]);
        return {
          type: 'Feature',
          id: pd.guid,
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            pointType: PointType.Player,
            name: pd.name,
            guid: pd.guid,
            role,
          },
        } satisfies GeoJSON.Feature;
      }),
    };
    (mlMap.getSource(SRC_PLAYER) as maplibregl.GeoJSONSource | undefined)?.setData(geoJson);

    if (playerStickyFocusGuid) {
      const initialPlayer = filteredPlayerData.find((p) => p.guid === playerStickyFocusGuid);
      if (initialPlayer) {
        mapComponent?.centerOn(
          reProjectPoint([initialPlayer.coord.x, initialPlayer.coord.y]),
          0,
          initialFocus,
        );
        initialFocus = false;
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Delivery-line GeoJSON reactive sync
  // ──────────────────────────────────────────────────────────────────────────
  $effect(() => {
    if (!mlMap?.loaded()) return;
    (mlMap.getSource(SRC_DELIVERY_LINE) as maplibregl.GeoJSONSource | undefined)?.setData(
      deliveryLineGeoJson,
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jobs-count update
  // ──────────────────────────────────────────────────────────────────────────
  $effect(() => {
    if (!mlMap?.loaded() || !staticHandle) return;
    for (const f of staticHandle.deliveryFeatures) {
      const guid = f.id as string;
      const dp = deliveryPointsMap.get(guid);
      if (!dp) continue;
      const matchSrc = jobsData.some(getMatchJobSourceFn(dp));
      const matchDst = jobsData.some(getMatchJobDestFn(dp));
      mlMap.setFeatureState(
        { source: SRC_DELIVERY, id: guid },
        { jobs: matchSrc ? 1 : matchDst ? 2 : 0 },
      );
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // House data update (vacant / labels)
  // ──────────────────────────────────────────────────────────────────────────
  $effect(() => {
    if (!mlMap?.loaded() || !staticHandle) return;
    for (const f of staticHandle.houseFeatures) {
      const name = f.id as string;
      const ownerName = houseData?.[name]?.ownerName;
      mlMap.setFeatureState(
        { source: SRC_HOUSE, id: name },
        { vacant: !ownerName ? 1 : 0, label: ownerName ?? m['housing.vacant']() },
      );
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // jobOnly style updates
  // ──────────────────────────────────────────────────────────────────────────
  $effect(() => {
    if (!mlMap?.loaded()) return;
    mlMap.setPaintProperty(LYR_DELIVERY, 'circle-opacity', getDeliveryPointPaint(mapState.jobOnly)['circle-opacity']);
    mlMap.setPaintProperty(LYR_RESIDENT, 'circle-opacity', getResidentPointPaint(mapState.jobOnly)['circle-opacity']);
  });

  // houseVacantOnly style update
  $effect(() => {
    if (!mlMap?.loaded()) return;
    mlMap.setPaintProperty(LYR_HOUSE, 'circle-opacity', getHousePaint(mapState.houseVacantOnly)['circle-opacity']);
    setVis(
      LYR_HOUSE_LABEL,
      mapState.house && mapState.houseLabels,
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Persist map state
  // ──────────────────────────────────────────────────────────────────────────
  $effect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        MAP_STATE_STORAGE_KEY,
        JSON.stringify({
          delivery: mapState.delivery,
          house: mapState.house,
          player: mapState.player,
          playerName: mapState.playerName,
          jobOnly: mapState.jobOnly,
          houseVacantOnly: mapState.houseVacantOnly,
          houseLabels: mapState.houseLabels,
          playerCopsOnly: mapState.playerCopsOnly,
          playerCriminalOnly: mapState.playerCriminalOnly,
          teleport: mapState.teleport,
          teleportLabels: mapState.teleportLabels,
          shortcutZone: mapState.shortcutZone,
        }),
      );
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // URL param → selection sync
  // ──────────────────────────────────────────────────────────────────────────
  let init = true;
  let selectedHouse: string | undefined = undefined;
  let selectedDelivery: string | undefined = undefined;

  $effect(() => {
    if (lockId !== selectedId) {
      if (selectedSource && selectedId)
        mlMap?.setFeatureState({ source: selectedSource, id: selectedId }, { selected: false });
      selectedSource = null;
      selectedId = null;
    }

    const oldPlayerSelectingGuid = playerSelectingGuid;
    playerSelectingGuid = undefined;
    playerStickyFocusGuid = undefined;
    const cacheInit = init;
    init = false;
    const cacheDontFocus = dontFocus;
    dontFocus = false;
    const cachedSelectedHouse = selectedHouse;
    const cachedSelectedDelivery = selectedDelivery;
    selectedHouse = undefined;
    selectedDelivery = undefined;

    const housing = clientSearchParamsGet('house');
    if (housing) {
      untrack(() => enableHouseLayer());
      const hf = staticHandle?.houseFeatures.find((h) => h.id === housing);
      if (hf) {
        setSelection(SRC_HOUSE, housing);
        if (cachedSelectedHouse !== housing && !cacheDontFocus) {
          const [lng, lat] = (hf.geometry as GeoJSON.Point).coordinates as [number, number];
          mapComponent?.centerOn([lng, lat], cacheInit ? 0 : undefined, cacheInit);
        }
      }
      selectedHouse = housing;
      return;
    }

    const deliveryGuid = clientSearchParamsGet('delivery');
    if (deliveryGuid) {
      const allDf = [
        ...(staticHandle?.deliveryFeatures ?? []),
        ...(staticHandle?.residentFeatures ?? []),
      ];
      const df = allDf.find((d) => d.id === deliveryGuid);
      if (df) {
        untrack(() => enableDeliveryLayer());
        clearLock();
        const isResident = staticHandle?.residentFeatures.includes(df);
        const dfSource = isResident ? SRC_RESIDENT : SRC_DELIVERY;
        setLock(dfSource, deliveryGuid);
        setSelection(dfSource, deliveryGuid);
        clearDeliveryLines();
        const dp = deliveryPointsMap.get(deliveryGuid);
        if (dp) updateDeliveryLine(dp);
        if (cachedSelectedDelivery !== deliveryGuid && !cacheDontFocus) {
          const [lng, lat] = (df.geometry as GeoJSON.Point).coordinates as [number, number];
          mapComponent?.centerOn([lng, lat], cacheInit ? 0 : undefined, cacheInit);
        }
      }
      selectedDelivery = deliveryGuid;
      return;
    }

    const playerGuid = clientSearchParamsGet('player');
    if (playerGuid) {
      untrack(() => enablePlayerLayer());
      playerSelectingGuid = playerGuid;
      if (oldPlayerSelectingGuid !== playerGuid) {
        playerStickyFocusGuid = playerGuid;
        initialFocus = true;
      }
      return;
    }

    const pins = clientSearchParamsGet('pins');
    if (pins) {
      try {
        const focusIndexParams = clientSearchParamsGet('focus_index');
        const focusIndex = focusIndexParams ? +focusIndexParams : -1;
        const pinsJson = pinsSchema.parse(JSON.parse(pins));
        const data = pinsJson.map((p, i) => ({
          ...p,
          pointType: PointType.Pin,
          label: p.label ?? m['map.pin_no']({ index: i + 1 }),
        }));
        const pinsGeoJson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: data.map((p: Pin & { label: string }, i) => {
            const [lng, lat] = reProjectPoint([p.x, p.y]);
            return {
              type: 'Feature',
              id: i,
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: { label: p.label, pointType: PointType.Pin, pinIndex: i },
            } satisfies GeoJSON.Feature;
          }),
        };
        (mlMap?.getSource(SRC_PINS) as maplibregl.GeoJSONSource | undefined)?.setData(pinsGeoJson);
        if (focusIndex >= 0 && focusIndex < data.length) {
          const fp = data[focusIndex];
          mapComponent?.centerOn(reProjectPoint([fp.x, fp.y]), cacheInit ? 0 : undefined);
        }
        pinsData = data;
      } catch (e) {
        console.error('Invalid pins data:', e);
        showModal({
          title: m['map.pins_invalid.title'](),
          message: m['map.pins_invalid.desc'](),
        });
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POI toggle helpers
  // ──────────────────────────────────────────────────────────────────────────
  const toggleDeliveryLayer = () => {
    mapState.delivery = !mapState.delivery;
    setVis(LYR_DELIVERY, mapState.delivery);
    setVis(LYR_RESIDENT, mapState.delivery);
    setVis(LYR_DELIVERY_LINE, mapState.delivery);
  };
  const enableDeliveryLayer = () => {
    mapState.delivery = true;
    setVis(LYR_DELIVERY, true);
    setVis(LYR_RESIDENT, true);
    setVis(LYR_DELIVERY_LINE, true);
  };
  const toggleHouseLayer = () => {
    mapState.house = !mapState.house;
    setVis(LYR_HOUSE, mapState.house);
    setVis(LYR_HOUSE_LABEL, mapState.house && mapState.houseLabels);
  };
  const enableHouseLayer = () => {
    mapState.house = true;
    setVis(LYR_HOUSE, true);
    setVis(LYR_HOUSE_LABEL, mapState.houseLabels);
  };
  const toggleHouseNameLayer = () => {
    mapState.houseLabels = !mapState.houseLabels;
    setVis(LYR_HOUSE_LABEL, mapState.house && mapState.houseLabels);
  };
  const togglePlayerLayer = () => {
    mapState.player = !mapState.player;
    setVis(LYR_PLAYER, mapState.player);
    setVis(LYR_PLAYER_NAME, mapState.player && mapState.playerName);
  };
  const enablePlayerLayer = () => {
    mapState.player = true;
    setVis(LYR_PLAYER, true);
    setVis(LYR_PLAYER_NAME, mapState.playerName);
  };
  const togglePlayerName = () => {
    mapState.playerName = !mapState.playerName;
    setVis(LYR_PLAYER_NAME, mapState.player && mapState.playerName);
  };
  const togglePinsLayer = () => {
    mapState.pins = !mapState.pins;
    setVis(LYR_PINS, mapState.pins);
    setVis(LYR_PIN_LABEL, mapState.pins && mapState.pinLabels);
  };
  const togglePinLabels = () => {
    mapState.pinLabels = !mapState.pinLabels;
    setVis(LYR_PIN_LABEL, mapState.pins && mapState.pinLabels);
  };
  const toggleTeleportLayer = () => {
    mapState.teleport = !mapState.teleport;
    setVis(LYR_TELEPORT, mapState.teleport);
    setVis(LYR_TELEPORT_LABEL, mapState.teleport && mapState.teleportLabels);
  };
  const toggleTeleportLabels = () => {
    mapState.teleportLabels = !mapState.teleportLabels;
    setVis(LYR_TELEPORT_LABEL, mapState.teleport && mapState.teleportLabels);
  };
  const toggleShortcutZoneLayer = () => {
    mapState.shortcutZone = !mapState.shortcutZone;
    setVis(LYR_SHORTCUT_FILL, mapState.shortcutZone);
    setVis(LYR_SHORTCUT_LINE, mapState.shortcutZone);
    setVis(LYR_SHORTCUT_LABEL, mapState.shortcutZone);
  };

  $effect(() => {
    onPlayerLayerDataEnabledChange?.(mapState.player);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  let mapComponent: OlMap | undefined = $state();

  export const centerOnPoint = (point: [number, number]) => {
    mapComponent?.centerOn(reProjectPoint(point));
  };

  const handleSearchClick = (point: SearchPoint) => {
    if (point.pointType === PointType.Pin) enablePinsLayer();
    mapComponent?.centerOn(reProjectPoint([point.coord.x, point.coord.y]));
  };

  const enablePinsLayer = () => {
    mapState.pins = true;
    setVis(LYR_PINS, true);
    setVis(LYR_PIN_LABEL, mapState.pinLabels);
  };

  const { showModal } = getMsgModalContext();

  onMount(() => {
    // nothing extra needed – map setup happens in handleMapReady
  });
</script>

<div class="relative h-full w-full">
  <OlMap
    class="h-full w-full"
    onMapReady={handleMapReady}
    bind:this={mapComponent}
  />
  <!-- Search overlay (top, overflow-hidden to contain dropdown) -->
  <div
    class="pointer-events-none absolute top-0 right-0 left-0 flex h-full flex-col overflow-hidden p-4 pb-15"
  >
    <Search {pinsData} {playerData} {houseData} onPointClick={handleSearchClick} />
  </div>

  <!-- POI trigger + floating card (bottom-left) -->
  <div class="pointer-events-none absolute bottom-0 left-0 h-full w-full p-4 pt-18">
    <ClickAwayBlock active={poiOpen} onClickAway={() => (poiOpen = false)}>
      <div class="flex h-full w-full flex-col items-start justify-end gap-2">
        {#if poiOpen}
          <div
            class="flex min-h-0 shrink"
            transition:fade={{ duration: defaultTransitionDurationMs }}
          >
            <Card
              class="pointer-events-auto min-h-0 flex-1 overflow-y-auto !bg-gray-900/50 !p-0 !shadow-white/3 !ring-white/5 backdrop-blur-sm"
            >
              <div class="flex flex-col">
                <!-- Delivery -->
                <PoiItem
                  dotClass="border-yellow-950 bg-yellow-500"
                  label={m['map.poi.delivery']()}
                  desc={m['map.poi.delivery_desc']()}
                  enabled={mapState.delivery}
                  onclick={toggleDeliveryLayer}
                />
                <PoiItem
                  dotClass="border-orange-950 bg-orange-400"
                  label={m['map.poi.jobs_only']()}
                  desc={m['map.poi.jobs_only_desc']()}
                  enabled={mapState.jobOnly}
                  onclick={() => (mapState.jobOnly = !mapState.jobOnly)}
                  sub
                />

                <div class="border-t border-gray-100/10"></div>

                <!-- House -->
                <PoiItem
                  dotClass="border-cyan-950 bg-cyan-500"
                  label={m['map.poi.house']()}
                  desc={m['map.poi.house_desc']()}
                  enabled={mapState.house}
                  onclick={toggleHouseLayer}
                />
                <PoiItem
                  dotClass="border-cyan-950 bg-cyan-300"
                  label={m['map.poi.house_vacant_only']()}
                  desc={m['map.poi.house_vacant_only_desc']()}
                  enabled={mapState.houseVacantOnly}
                  onclick={() => (mapState.houseVacantOnly = !mapState.houseVacantOnly)}
                  sub
                />
                <PoiItem
                  dotClass="border-gray-950 bg-white"
                  label={m['map.poi.house_labels']()}
                  desc={m['map.poi.house_labels_desc']()}
                  enabled={mapState.houseLabels}
                  onclick={toggleHouseNameLayer}
                  sub
                />

                <div class="border-t border-gray-100/10"></div>

                <!-- Player -->
                <PoiItem
                  dotClass="border-emerald-950 bg-emerald-400"
                  label={m['map.poi.player']()}
                  desc={m['map.poi.player_desc']()}
                  enabled={mapState.player}
                  onclick={togglePlayerLayer}
                />
                <PoiItem
                  dotClass="border-gray-950 bg-white"
                  label={m['map.poi.player_names']()}
                  desc={m['map.poi.player_names_desc']()}
                  enabled={mapState.playerName}
                  onclick={togglePlayerName}
                  sub
                />
                <PoiItem
                  dotClass="border-blue-950 bg-blue-500"
                  label={m['map.poi.player_police']()}
                  desc={m['map.poi.player_police_desc']()}
                  enabled={mapState.playerCopsOnly}
                  onclick={() => (mapState.playerCopsOnly = !mapState.playerCopsOnly)}
                  sub
                />
                <PoiItem
                  dotClass="border-red-950 bg-red-500"
                  label={m['map.poi.player_criminal']()}
                  desc={m['map.poi.player_criminal_desc']()}
                  enabled={mapState.playerCriminalOnly}
                  onclick={() => (mapState.playerCriminalOnly = !mapState.playerCriminalOnly)}
                  sub
                />

                {#if havePins}
                  <div class="border-t border-gray-100/10"></div>

                  <!-- Pin -->
                  <PoiItem
                    dotClass="border-red-950 bg-red-400"
                    label={m['map.poi.pins']()}
                    desc={m['map.poi.pin_desc']()}
                    enabled={mapState.pins}
                    onclick={togglePinsLayer}
                  />
                  <PoiItem
                    dotClass="border-red-950 bg-red-200"
                    label={m['map.poi.pin_labels']()}
                    desc={m['map.poi.pin_labels_desc']()}
                    enabled={mapState.pinLabels}
                    onclick={togglePinLabels}
                    sub
                  />
                {/if}

                {#if haveTeleports}
                  <div class="border-t border-gray-100/10"></div>

                  <!-- Teleport -->
                  <PoiItem
                    dotClass="border-violet-950 bg-violet-400"
                    label={m['map.poi.teleport']()}
                    desc={m['map.poi.teleport_desc']()}
                    enabled={mapState.teleport}
                    onclick={toggleTeleportLayer}
                  />
                  <PoiItem
                    dotClass="border-gray-950 bg-white"
                    label={m['map.poi.teleport_labels']()}
                    desc={m['map.poi.teleport_labels_desc']()}
                    enabled={mapState.teleportLabels}
                    onclick={toggleTeleportLabels}
                    sub
                  />
                {/if}

                {#if haveShortcutZones}
                  <div class="border-t border-gray-100/10"></div>

                  <!-- Shortcut Zones -->
                  <PoiItem
                    dotClass="border-red-500 bg-red-500/12 border-dashed border-2"
                    label={m['map.poi.shortcut_zone']()}
                    desc={m['map.poi.shortcut_zone_desc']()}
                    enabled={mapState.shortcutZone}
                    onclick={toggleShortcutZoneLayer}
                  />
                {/if}
              </div>
            </Card>
          </div>
        {/if}
        <Button
          class="text-text-dark pointer-events-auto !bg-gray-900/50 shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-sm hover:!bg-gray-900/40 focus:!bg-gray-900/60"
          color="custom"
          onClick={() => (poiOpen = !poiOpen)}
          size="sm"
        >
          {#snippet prependIcon()}
            <Icon class="i-material-symbols:location-on-rounded" />
          {/snippet}
          {m['map.point_of_interests']()}
        </Button>
      </div>
    </ClickAwayBlock>
  </div>

  <HoverInfoTooltip
    {hoverInfo}
    {houseData}
    onClick={handleInfoClick}
    onCopyTeleport={handleCopyTeleport}
    {teleportCopied}
  />
</div>
