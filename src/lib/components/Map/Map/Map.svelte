<script lang="ts">
  import OlMap from '$lib/ui/OlMap/OlMap.svelte';
  import VectorLayer from 'ol/layer/Vector';
  import VectorSource from 'ol/source/Vector';
  import Point from 'ol/geom/Point';
  import Feature from 'ol/Feature';
  import { onMount, untrack, getAbortSignal } from 'svelte';
  import { fade } from 'svelte/transition';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import ClickAwayBlock from '$lib/ui/ClickAwayBlock/ClickAwayBlock.svelte';
  import PoiItem from './PoiItem.svelte';
  import type { MapBrowserEvent } from 'ol';
  import { Fill, Stroke, Style, Text } from 'ol/style';
  import { PlayerRoles, PointType, type PlayerData, type TeleportPoint } from './types';
  import {
    getDeliveryPointStyle,
    getHouseStyle,
    getResidentPointStyle,
    getStaticPoints,
  } from './staticPoints';
  import HoverInfoTooltip, { type HoverInfo } from './HoverInfoTooltip.svelte';
  import {
    textXs,
    fontSans,
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
    colorGray950,
    colorTextDark,
    defaultTransitionDurationMs,
    colorViolet200,
    colorViolet400,
    colorViolet950,
  } from '$lib/tw-var';
  import WebGLVectorLayer from 'ol/layer/WebGLVector';
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
  import { LineString, Polygon } from 'ol/geom';
  import type { DeliveryCargo } from '$lib/data/types';
  import { uniq } from 'lodash-es';
  import { cargoMetadata } from '$lib/data/cargo';
  import { m } from '$messages';
  import { isMouse } from '$lib/utils/media.svelte';
  import { pinsSchema, type Pin, type Pins } from '$lib/schema/pin';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { SvelteSet } from 'svelte/reactivity';
  import Collection from 'ol/Collection';
  import * as z from 'zod/mini';
  import { clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import { getMatchJobDestFn, getMatchJobSourceFn } from '$lib/utils/delivery';

  import { getSelectionClearedParams } from '../utils';
  import { hasPoliceRole, hasCriminalRole } from '$lib/utils/parsePlayerRole';
  import Button from '$lib/ui/Button/Button.svelte';

  interface Props {
    jobsData: DeliveryJob[];
    playerData: PlayerData[];
    houseData: HouseData | undefined;
    onPlayerLayerDataEnabledChange?: (enabled: boolean) => void;
  }

  const { jobsData, playerData, houseData, onPlayerLayerDataEnabledChange }: Props = $props();

  const {
    deliveryPointFeatures,
    residentPointFeatures,
    houseFeatures,
    deliveryPointLayer,
    residentPointLayer,
    houseSource,
    houseLayer,
  } = getStaticPoints();

  const MAP_STATE_STORAGE_KEY = 'mapState';

  let pinsData = $state<Pins>([]);
  const havePins = $derived(pinsData.length > 0);

  const pinsSource = new VectorSource({
    features: [] as Feature<Point>[],
  });

  const pinsLayer = new WebGLVectorLayer({
    source: pinsSource,
    style: {
      'circle-radius': 5,
      'circle-fill-color': [
        'case',
        ['==', ['get', 'hover'], 1],
        colorRed200,
        ['==', ['get', 'selected'], 1],
        colorRed500,
        colorRed400,
      ],
      'circle-stroke-color': ['match', ['get', 'selected'], 1, colorWhite, colorRed950],
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  const PinLabelsStyle = new Style({
    text: new Text({
      font: `600 ${textXs} ${fontSans}`,
      offsetY: -14,
      fill: new Fill({
        color: colorTextDark,
      }),

      stroke: new Stroke({
        color: adjustOpacity(colorGray950, 0.4),
        width: 3,
      }),
    }),
  });

  const pinLabelsLayer = new VectorLayer({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderOrder: null as any,
    source: pinsSource,
    style: (feature) => {
      PinLabelsStyle.getText()?.setText(feature.get('label') as string);
      return PinLabelsStyle;
    },
  });

  let teleportData = $state<TeleportPoint[]>([]);
  const haveTeleports = $derived(teleportData.length > 0);

  const houseNameStyle = new Style({
    text: new Text({
      font: `600 0.6rem ${fontSans}`,
      offsetY: -12,
      fill: new Fill({
        color: colorTextDark,
      }),
      stroke: new Stroke({
        color: adjustOpacity(colorGray950, 0.4),
        width: 3,
      }),
    }),
  });

  const houseNameLayer = new VectorLayer({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderOrder: null as any,
    source: houseSource,
    visible: false,
    style: (feature) => {
      houseNameStyle.getText()?.setText(feature.get('label') as string);
      return houseNameStyle;
    },
  });

  const teleportSource = new VectorSource({
    features: [] as Feature<Point>[],
  });

  const teleportLayer = new WebGLVectorLayer({
    source: teleportSource,
    style: {
      'circle-radius': 5,
      'circle-fill-color': ['case', ['==', ['get', 'hover'], 1], colorViolet200, colorViolet400],
      'circle-stroke-color': colorViolet950,
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  const TeleportLabelsStyle = new Style({
    text: new Text({
      font: `600 0.5rem ${fontSans}`,
      offsetY: -12,
      fill: new Fill({
        color: colorTextDark,
      }),
      stroke: new Stroke({
        color: adjustOpacity(colorGray950, 0.4),
        width: 3,
      }),
    }),
  });

  const teleportLabelsLayer = new VectorLayer({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderOrder: null as any,
    source: teleportSource,
    style: (feature) => {
      TeleportLabelsStyle.getText()?.setText(feature.get('label') as string);
      return TeleportLabelsStyle;
    },
  });

  let shortcutZoneData = $state<ShortcutZone[]>([]);
  const haveShortcutZones = $derived(shortcutZoneData.length > 0);

  const shortcutZoneSource = new VectorSource({
    features: [] as Feature<Polygon>[],
  });

  const shortcutZoneStyle = new Style({
    fill: new Fill({ color: adjustOpacity(colorRed500, 0.12) }),
    stroke: new Stroke({
      color: colorRed500,
      width: 2,
      lineDash: [4, 6],
    }),
    text: new Text({
      font: `600 0.5rem ${fontSans}`,
      overflow: true,
      fill: new Fill({ color: colorTextDark }),
      stroke: new Stroke({
        color: adjustOpacity(colorGray950, 0.4),
        width: 3,
      }),
    }),
  });

  const shortcutZoneLayer = new VectorLayer({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderOrder: null as any,
    source: shortcutZoneSource,
    style: (feature) => {
      shortcutZoneStyle.getText()?.setText(feature.get('name') as string);
      return shortcutZoneStyle;
    },
  });

  const playerFeaturesCollection = new Collection<Feature<Point>>();

  const playerPointSource = new VectorSource({
    features: playerFeaturesCollection,
  });

  const playerPointLayer = new WebGLVectorLayer({
    source: playerPointSource,
    style: {
      'circle-radius': 4,
      'circle-fill-color': [
        'case',
        ['==', ['get', 'hover'], 1],
        colorEmerald200,
        ['==', ['get', 'selected'], 1],
        colorEmerald500,
        ['==', ['get', 'role'], PlayerRoles.Police],
        colorBlue500,
        ['==', ['get', 'role'], PlayerRoles.Criminal],
        colorRed500,
        colorEmerald400,
      ],
      'circle-stroke-color': [
        'case',
        ['==', ['get', 'selected'], 1],
        colorWhite,
        ['==', ['get', 'role'], PlayerRoles.Police],
        colorBlue950,
        ['==', ['get', 'role'], PlayerRoles.Criminal],
        colorRed950,
        colorEmerald950,
      ],
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  const playerNameStyle = new Style({
    text: new Text({
      font: `600 ${textXs} ${fontSans}`,
      offsetY: -12,
      fill: new Fill({
        color: colorTextDark,
      }),

      stroke: new Stroke({
        color: adjustOpacity(colorGray950, 0.4),
        width: 3,
      }),
    }),
  });

  const playerNameLayer = new VectorLayer({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderOrder: null as any,
    source: playerPointSource,
    style: (feature) => {
      playerNameStyle.getText()?.setText(feature.get('info').name as string);
      return playerNameStyle;
    },
  });

  const deliveryLineFeaturesCollection = new Collection<Feature<LineString>>();

  const deliveryLineLayer = new WebGLVectorLayer({
    source: new VectorSource({
      features: deliveryLineFeaturesCollection,
    }),
    style: {
      'stroke-width': 2,
      'stroke-color': [
        'match',
        ['get', 'type'],
        DeliveryLineType.Supply,
        adjustOpacity(colorGreen500, 0.75),
        DeliveryLineType.Demand,
        adjustOpacity(colorBlue500, 0.75),
        adjustOpacity(colorYellow500, 0.75),
      ],
      'stroke-line-cap': 'round',
    },
  });

  const getDeliveryPoint = (guid: string) => {
    const point = deliveryPointsMap.get(guid);
    if (!point) {
      throw new Error(`Delivery point not found: ${guid}`);
    }
    return point;
  };

  const updateDeliveryLine = (deliveryPoint: DeliveryPoint) => {
    const matchSourceJob = jobsData.filter(getMatchJobSourceFn(deliveryPoint));
    const matchDestJob = jobsData.filter(getMatchJobDestFn(deliveryPoint));

    if (mapState.jobOnly && matchSourceJob.length === 0 && matchDestJob.length === 0) {
      return;
    }

    const allDropPointLink: [DeliveryPoint, DeliveryPoint][] = [];

    if (deliveryPoint.parent) {
      allDropPointLink.push([deliveryPoint, getDeliveryPoint(deliveryPoint.parent)]);
    }

    const connectedDrop = new SvelteSet<DeliveryCargo>();

    if (deliveryPoint.dropPoint) {
      for (const dropPointGuid of deliveryPoint.dropPoint) {
        const dropPoint = getDeliveryPoint(dropPointGuid);
        for (const cargoType of dropPoint.allDemand) {
          connectedDrop.add(cargoType);
        }
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
              if (!hasDestJob) {
                return undefined;
              }
            }
            if (point.dropPoint) {
              const hasConnectedDrop = point.dropPoint.some((dropPointGuid) =>
                deliveryPointsMap.get(dropPointGuid)?.allDemandKey.includes(d),
              );
              if (hasConnectedDrop) {
                return undefined;
              }
            }
            if (cd.minDist || cd.maxDist || deliveryPoint.maxDist || point.maxReceiveDist) {
              const dist = Math.hypot(
                point.coord.x - deliveryPoint.coord.x,
                point.coord.y - deliveryPoint.coord.y,
              );
              if (cd.minDist) {
                if (dist < cd.minDist) {
                  return undefined;
                }
              }
              if (cd.maxDist) {
                if (dist > cd.maxDist) {
                  return undefined;
                }
              }
              if (deliveryPoint.maxDist) {
                if (dist > deliveryPoint.maxDist) {
                  return undefined;
                }
              }
              if (point.maxReceiveDist) {
                if (dist > point.maxReceiveDist) {
                  return undefined;
                }
              }
            }
            if (point.parent) {
              allDropPointLink.push([point, getDeliveryPoint(point.parent)]);
            }
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
              if (!hasSourceJob) {
                return undefined;
              }
            }
            if (cd.minDist || cd.maxDist || deliveryPoint.maxReceiveDist || point.maxDist) {
              const dist = Math.hypot(
                point.coord.x - deliveryPoint.coord.x,
                point.coord.y - deliveryPoint.coord.y,
              );
              if (cd.minDist) {
                if (dist < cd.minDist) {
                  return undefined;
                }
              }
              if (cd.maxDist) {
                if (dist > cd.maxDist) {
                  return undefined;
                }
              }
              if (deliveryPoint.maxReceiveDist) {
                if (dist > deliveryPoint.maxReceiveDist) {
                  return undefined;
                }
              }
              if (point.maxDist) {
                if (dist > point.maxDist) {
                  return undefined;
                }
              }
            }
            if (point.dropPoint) {
              for (const dropPointGuid of point.dropPoint) {
                const dropPoint = getDeliveryPoint(dropPointGuid);
                allDropPointLink.push([point, dropPoint]);
              }
            }
            return point;
          }),
        )
        .filter((d) => d !== undefined),
    );

    deliveryLineFeaturesCollection.extend([
      ...allDemandDestinations.map((d) => {
        return new Feature({
          geometry: new LineString([
            reProjectPoint([deliveryPoint.coord.x, deliveryPoint.coord.y]),
            reProjectPoint([d.coord.x, d.coord.y]),
          ]),
          type: DeliveryLineType.Demand,
        });
      }),
      ...allSupplyDestinations.map((d) => {
        return new Feature({
          geometry: new LineString([
            reProjectPoint([deliveryPoint.coord.x, deliveryPoint.coord.y]),
            reProjectPoint([d.coord.x, d.coord.y]),
          ]),
          type: DeliveryLineType.Supply,
        });
      }),
      ...allDropPointLink.map(([d1, d2]) => {
        return new Feature({
          geometry: new LineString([
            reProjectPoint([d1.coord.x, d1.coord.y]),
            reProjectPoint([d2.coord.x, d2.coord.y]),
          ]),
          type: DeliveryLineType.Drop,
        });
      }),
    ]);
  };

  const layers = $derived([
    deliveryLineLayer,
    deliveryPointLayer,
    residentPointLayer,
    houseLayer,
    playerPointLayer,
    ...(haveTeleports ? [teleportLayer] : []),
    ...(havePins ? [pinsLayer] : []),
    ...(haveShortcutZones ? [shortcutZoneLayer] : []),
    houseNameLayer,
    playerNameLayer,
    ...(haveTeleports ? [teleportLabelsLayer] : []),
    ...(havePins ? [pinLabelsLayer] : []),
  ]);

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

  onMount(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(MAP_STATE_STORAGE_KEY) ?? '');
      const result = mapStateSchema.safeParse(raw);
      if (result.success) {
        const state = result.data;
        if (state.delivery === false) {
          mapState.delivery = false;
          for (const l of [deliveryPointLayer, residentPointLayer, deliveryLineLayer])
            l.setVisible(false);
        }
        if (state.house === false) {
          mapState.house = false;
          houseLayer.setVisible(false);
        }
        if (state.player === false) {
          mapState.player = false;
          playerPointLayer.setVisible(false);
          playerNameLayer.setVisible(false);
        }
        if (state.playerName === false) {
          mapState.playerName = false;
          if (mapState.player) playerNameLayer.setVisible(false);
        }
        if (state.teleport === false) {
          mapState.teleport = false;
          teleportLayer.setVisible(false);
          teleportLabelsLayer.setVisible(false);
        }
        if (state.teleportLabels === false) {
          mapState.teleportLabels = false;
          if (mapState.teleport) teleportLabelsLayer.setVisible(false);
        }
        if (state.shortcutZone === false) {
          mapState.shortcutZone = false;
          shortcutZoneLayer.setVisible(false);
        }
        mapState.jobOnly = state.jobOnly ?? false;
        mapState.houseVacantOnly = state.houseVacantOnly ?? false;
        if (state.houseLabels === true) {
          mapState.houseLabels = true;
          if (mapState.house) houseNameLayer.setVisible(true);
        }
        mapState.playerCopsOnly = state.playerCopsOnly ?? false;
        mapState.playerCriminalOnly = state.playerCriminalOnly ?? false;
      }
    } catch (e) {
      console.error('Failed to load map state:', e);
    }

    getTeleports(getAbortSignal())
      .then((data) => {
        const points: TeleportPoint[] = data.map((d) => ({
          name: d.name,
          coord: { x: d.x, y: d.y, z: d.z },
        }));
        teleportSource.addFeatures(
          points.map(
            (p) =>
              new Feature({
                geometry: new Point(reProjectPoint([p.coord.x, p.coord.y])),
                pointType: PointType.Teleport,
                info: p,
                label: p.name,
                hover: 0,
              }),
          ),
        );
        teleportData = points;
      })
      .catch((e: unknown) => {
        console.error('Failed to load teleport data:', e);
      });

    getShortcutZones(getAbortSignal())
      .then((data) => {
        shortcutZoneSource.addFeatures(
          data.map(
            (zone) =>
              new Feature({
                geometry: new Polygon([
                  zone.coordinates.map(([x, y]) => reProjectPoint([x, y] as [number, number])),
                ]),
                pointType: PointType.ShortcutZone,
                name: zone.name,
                info: zone,
              }),
          ),
        );
        shortcutZoneData = data;
      })
      .catch((e: unknown) => {
        console.error('Failed to load shortcut zone data:', e);
      });
  });

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

  let selectedPoint: Feature | undefined = undefined;
  let lockPoint: Feature | undefined = undefined;
  let hoverPoint: Feature | undefined = undefined;
  let hoverInfo: HoverInfo | undefined = $state();

  let teleportCopyTimeout: ReturnType<typeof setTimeout> | undefined;
  let copiedTeleportName = $state<string | undefined>(undefined);

  const teleportCopied = $derived(
    hoverInfo?.pointType === PointType.Teleport && hoverInfo.info.name === copiedTeleportName,
  );

  const handleCopyTeleport = () => {
    if (hoverInfo?.pointType !== PointType.Teleport) return;
    const name = hoverInfo.info.name;
    navigator.clipboard.writeText(`/tp ${name}`);
    copiedTeleportName = name;
    clearTimeout(teleportCopyTimeout);
    teleportCopyTimeout = setTimeout(() => (copiedTeleportName = undefined), 2000);
  };

  const handlePointerMoveOrClick = (e: MapBrowserEvent) => {
    let currentHoverInfo: HoverInfo | undefined = undefined;
    let currentHoverPoint = undefined as Feature | undefined;

    e.map.forEachFeatureAtPixel(
      e.pixel,
      (feature) => {
        const f = feature as Feature;
        f.set('hover', true);
        currentHoverInfo = {
          pointType: f.get('pointType'),
          pixelCoord: e.pixel as [number, number],
          info: f.get('info'),
          jobOnly: (f.get('jobOnly') ?? 0) as number,
        };
        currentHoverPoint = f;
        return true;
      },
      {
        layerFilter: (layer) => {
          return (
            layer === deliveryPointLayer ||
            layer === residentPointLayer ||
            layer === houseLayer ||
            layer === teleportLayer ||
            layer === playerPointLayer
          );
        },
        hitTolerance: 10,
      },
    );

    if (currentHoverPoint !== hoverPoint) {
      if (!lockPoint) {
        deliveryLineFeaturesCollection.clear();
        if ((currentHoverInfo as unknown as HoverInfo)?.pointType === PointType.Delivery) {
          const deliveryPoint = currentHoverInfo as unknown as Extract<
            HoverInfo,
            {
              pointType: PointType.Delivery;
            }
          >;
          updateDeliveryLine(deliveryPoint.info);
        }
      }
      hoverPoint?.set('hover', false);
      hoverPoint = currentHoverPoint;
    }
    hoverInfo = currentHoverInfo;
  };

  let playerStickyFocusGuid: string | undefined = undefined;
  let playerSelectingGuid: string | undefined = undefined;
  let initialFocus = true;

  const filteredPlayerData = $derived.by(() => {
    if (!mapState.playerCopsOnly && !mapState.playerCriminalOnly) return playerData;
    return playerData.filter((p) => {
      if (mapState.playerCopsOnly && hasPoliceRole(p.name)) return true;
      if (mapState.playerCriminalOnly && hasCriminalRole(p.name)) return true;
      return false;
    });
  });

  const setPlayerPoints = (data: PlayerData[]) => {
    // Remove excess features from the end
    while (playerFeaturesCollection.getLength() > data.length) {
      playerFeaturesCollection.pop();
    }

    // Update existing and add new features
    for (let i = 0; i < data.length; i++) {
      const pd = data[i];
      const role = hasPoliceRole(pd.name)
        ? PlayerRoles.Police
        : hasCriminalRole(pd.name)
          ? PlayerRoles.Criminal
          : 'none';
      if (i < playerFeaturesCollection.getLength()) {
        const feature = playerFeaturesCollection.item(i);
        feature.getGeometry()?.setCoordinates(pd.geometry);
        feature.set('info', pd);
        feature.set('selected', pd.guid === playerSelectingGuid);
        feature.set('role', role);
      } else {
        playerFeaturesCollection.push(
          new Feature<Point>({
            geometry: new Point(pd.geometry),
            pointType: PointType.Player,
            info: pd,
            selected: pd.guid === playerSelectingGuid,
            role,
          }),
        );
      }
    }

    if (playerStickyFocusGuid) {
      const initialPlayer = data.find((p) => p.guid === playerStickyFocusGuid);
      if (initialPlayer) {
        map.centerOn(
          reProjectPoint([initialPlayer.coord.x, initialPlayer.coord.y]),
          0,
          initialFocus,
        );
        initialFocus = false;
      }
    }
  };

  $effect(() => {
    setPlayerPoints(filteredPlayerData);
  });

  const clearSelection = () => {
    selectedPoint?.set('selected', false);
    selectedPoint = undefined;
    playerSelectingGuid = undefined;
    playerStickyFocusGuid = undefined;
    deliveryLineFeaturesCollection.clear();
    lockPoint?.set('selected', false);
    lockPoint = undefined;
    const newParams = getSelectionClearedParams();
    goto(`?${newParams.toString()}`);
  };

  let dontFocus = false;

  const handleMapRightClick = () => {
    clearSelection();

    if (hoverPoint?.get('pointType') === PointType.Delivery) {
      const newParams = getSelectionClearedParams();
      newParams.set('delivery', hoverPoint.get('info').guid ?? '');
      dontFocus = true;
      goto(`?${newParams.toString()}`, {
        noScroll: true,
        keepFocus: true,
      });
    }
  };

  const handleInfoClick = () => {
    if (!hoverInfo) {
      return;
    }
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
    hoverPoint?.set('hover', false);
    hoverInfo = undefined;
  };

  const handlePointerMove = (e: MapBrowserEvent) => {
    if (isMouse.current) {
      handlePointerMoveOrClick(e);
    } else {
      hoverInfo = undefined;
    }
  };

  const handleClick = (e: MapBrowserEvent) => {
    clearSelection();

    if (isMouse.current) {
      e.map.forEachFeatureAtPixel(
        e.pixel,
        (feature) => {
          const f = feature as Feature;
          const type = f.get('pointType') as PointType | undefined;
          if (type === PointType.Delivery) {
            const info = f.get('info') as DeliveryPoint;
            const newParams = getSelectionClearedParams();
            newParams.set('menu', `deliveries/${info.guid}`);
            newParams.set('delivery', info.guid);
            goto(`/map?${newParams.toString()}`);
            return true;
          }
          if (type === PointType.House) {
            const newParams = getSelectionClearedParams();
            newParams.set('menu', 'housing');
            newParams.set('house', f.get('info').name);
            newParams.set('hf', f.get('info').name);
            goto(`/map?${newParams.toString()}`);
            return true;
          }
          if (type === PointType.Teleport) {
            handleCopyTeleport();
            return true;
          }

          return true;
        },
        {
          layerFilter: (layer) => {
            return (
              layer === deliveryPointLayer ||
              layer === residentPointLayer ||
              layer === houseLayer ||
              layer === teleportLayer
            );
          },
          hitTolerance: 10,
        },
      );
      return;
    }
    handlePointerMoveOrClick(e);
  };

  $effect(() => {
    onPlayerLayerDataEnabledChange?.(mapState.player);
  });

  const togglePlayerName = () => {
    mapState.playerName = !mapState.playerName;
    playerNameLayer.setVisible(mapState.player && mapState.playerName);
  };

  const togglePinLabels = () => {
    mapState.pinLabels = !mapState.pinLabels;
    pinLabelsLayer.setVisible(mapState.pins && mapState.pinLabels);
  };

  const toggleDeliveryLayer = () => {
    mapState.delivery = !mapState.delivery;
    for (const l of [deliveryPointLayer, residentPointLayer, deliveryLineLayer])
      l.setVisible(mapState.delivery);
  };

  const enableDeliveryLayer = () => {
    mapState.delivery = true;
    for (const l of [deliveryPointLayer, residentPointLayer, deliveryLineLayer]) l.setVisible(true);
  };

  const toggleHouseLayer = () => {
    mapState.house = !mapState.house;
    houseLayer.setVisible(mapState.house);
    if (!mapState.house) {
      houseNameLayer.setVisible(false);
    } else {
      houseNameLayer.setVisible(mapState.houseLabels);
    }
  };

  const enableHouseLayer = () => {
    mapState.house = true;
    houseLayer.setVisible(true);
    houseNameLayer.setVisible(mapState.houseLabels);
  };

  const toggleHouseNameLayer = () => {
    mapState.houseLabels = !mapState.houseLabels;
    houseNameLayer.setVisible(mapState.house && mapState.houseLabels);
  };

  const togglePlayerLayer = () => {
    mapState.player = !mapState.player;
    playerPointLayer.setVisible(mapState.player);
    if (!mapState.player) {
      playerNameLayer.setVisible(false);
    } else {
      setPlayerPoints(filteredPlayerData);
      playerNameLayer.setVisible(mapState.playerName);
    }
  };

  const enablePlayerLayer = () => {
    mapState.player = true;
    playerPointLayer.setVisible(true);
    playerNameLayer.setVisible(mapState.playerName);
  };

  const togglePinsLayer = () => {
    mapState.pins = !mapState.pins;
    pinsLayer.setVisible(mapState.pins);
    pinLabelsLayer.setVisible(mapState.pins && mapState.pinLabels);
  };

  const enablePinsLayer = () => {
    mapState.pins = true;
    pinsLayer.setVisible(true);
    pinLabelsLayer.setVisible(mapState.pinLabels);
  };

  const toggleTeleportLayer = () => {
    mapState.teleport = !mapState.teleport;
    teleportLayer.setVisible(mapState.teleport);
    teleportLabelsLayer.setVisible(mapState.teleport && mapState.teleportLabels);
  };

  const toggleTeleportLabels = () => {
    mapState.teleportLabels = !mapState.teleportLabels;
    teleportLabelsLayer.setVisible(mapState.teleport && mapState.teleportLabels);
  };

  const toggleShortcutZoneLayer = () => {
    mapState.shortcutZone = !mapState.shortcutZone;
    shortcutZoneLayer.setVisible(mapState.shortcutZone);
  };

  export const centerOnPoint = (point: [number, number]) => {
    map.centerOn(reProjectPoint(point));
  };

  let map: OlMap;

  const handleSearchClick = (point: SearchPoint) => {
    if (point.pointType === PointType.Pin) {
      enablePinsLayer();
    }
    map.centerOn(reProjectPoint([point.coord.x, point.coord.y]));
  };

  const { showModal } = getMsgModalContext();

  let init = true;

  let selectedHouse: string | undefined = undefined;
  let selectedDelivery: string | undefined = undefined;

  $effect(() => {
    if (lockPoint !== selectedPoint) {
      selectedPoint?.set('selected', false);
      selectedPoint = undefined;
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
      untrack(() => {
        enableHouseLayer();
      });
      const house = houseFeatures.find((h) => h.get('info').name === housing);
      if (house) {
        selectedPoint = house;
        house.set('selected', true);
        if (cachedSelectedHouse !== housing && !cacheDontFocus) {
          map.centerOn(
            house.getGeometry()?.getCoordinates() as [number, number],
            cacheInit ? 0 : undefined,
            cacheInit,
          );
        }
      }
      selectedHouse = housing;
      return;
    }

    const deliveryGuid = clientSearchParamsGet('delivery');
    if (deliveryGuid) {
      const deliveryPoint =
        deliveryPointFeatures.find((d) => d.get('info').guid === deliveryGuid) ??
        residentPointFeatures.find((d) => d.get('info').guid === deliveryGuid);
      if (deliveryPoint) {
        untrack(() => {
          enableDeliveryLayer();
        });
        lockPoint?.set('selected', false);
        selectedPoint = deliveryPoint;
        lockPoint = deliveryPoint;
        deliveryPoint.set('selected', true);
        deliveryLineFeaturesCollection.clear();
        const deliveryPointInfo = deliveryPoint.get('info') as DeliveryPoint;
        updateDeliveryLine(deliveryPointInfo);
        if (cachedSelectedDelivery !== deliveryGuid && !cacheDontFocus) {
          map.centerOn(
            deliveryPoint.getGeometry()?.getCoordinates() as [number, number],
            cacheInit ? 0 : undefined,
            cacheInit,
          );
        }
      }
      selectedDelivery = deliveryGuid;
      return;
    }

    const playerGuid = clientSearchParamsGet('player');
    if (playerGuid) {
      untrack(() => {
        enablePlayerLayer();
      });
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
        pinsSource.addFeatures(
          data.map(
            (p: Pin, i) =>
              new Feature({
                geometry: new Point(reProjectPoint([p.x, p.y])),
                label: p.label,
                pointType: PointType.Pin,
                selected: focusIndex === i,
              }),
          ),
        );

        if (focusIndex < data.length && focusIndex >= 0) {
          const focusPin = data[focusIndex];
          map.centerOn(reProjectPoint([focusPin.x, focusPin.y]), cacheInit ? 0 : undefined);
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

  const handlePointerDrag = () => {
    playerStickyFocusGuid = undefined;
  };

  const handleOnMoveStart = () => {
    hoverPoint?.set('hover', false);
    hoverInfo = undefined;
  };

  $effect(() => {
    for (const d of deliveryPointFeatures) {
      const info = d.get('info') as DeliveryPoint;
      const matchSourceJob = jobsData.some(getMatchJobSourceFn(info));
      const matchDestJob = jobsData.some(getMatchJobDestFn(info));
      d.set('jobs', matchSourceJob ? 1 : matchDestJob ? 2 : 0);
    }
  });

  $effect(() => {
    deliveryPointLayer.setStyle(getDeliveryPointStyle(mapState.jobOnly));
    residentPointLayer.setStyle(getResidentPointStyle(mapState.jobOnly));
  });

  $effect(() => {
    for (const f of houseFeatures) {
      const info = f.get('info') as { name: string };
      const ownerName = houseData?.[info.name]?.ownerName;
      f.set('vacant', !ownerName ? 1 : 0);
      f.set('label', ownerName ?? m['housing.vacant']());
    }
    houseNameLayer.changed();
  });

  $effect(() => {
    houseLayer.setStyle(getHouseStyle(mapState.houseVacantOnly));
    houseNameLayer.setStyle(
      mapState.houseVacantOnly
        ? (feature) => {
            if (!feature.get('vacant')) return [];
            houseNameStyle.getText()?.setText(feature.get('label') as string);
            return houseNameStyle;
          }
        : (feature) => {
            houseNameStyle.getText()?.setText(feature.get('label') as string);
            return houseNameStyle;
          },
    );
  });
</script>

<div class="relative h-full w-full">
  <OlMap
    {layers}
    class="h-full w-full"
    onPointerMove={handlePointerMove}
    onClick={handleClick}
    onRightClick={handleMapRightClick}
    bind:this={map}
    onPointerDrag={handlePointerDrag}
    onMoveStart={handleOnMoveStart}
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
