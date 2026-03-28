<script lang="ts">
  import OlMap from '$lib/ui/OlMap/OlMap.svelte';
  import VectorLayer from 'ol/layer/Vector';
  import VectorSource from 'ol/source/Vector';
  import Point from 'ol/geom/Point';
  import Feature from 'ol/Feature';
  import { onMount, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import ClickAwayBlock from '$lib/ui/ClickAwayBlock/ClickAwayBlock.svelte';
  import PoiItem from './PoiItem.svelte';
  import type { MapBrowserEvent } from 'ol';
  import { Fill, Stroke, Style, Text } from 'ol/style';
  import { PlayerRoles, PointType, type PlayerData } from './types';
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
  import { LineString } from 'ol/geom';
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
  import { censored } from '$lib/censored.svelte';
  import { getSelectionClearedParams } from '../utils';
  import { hasPoliceRole, hasCriminalRole } from '$lib/utils/parsePlayerRole';

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

  const playerPointSource = new VectorSource({
    features: [] as Feature<Point>[],
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

  const deliveryLineSource = new VectorSource({
    features: [] as Feature<LineString>[],
  });

  const deliveryLineLayer = new WebGLVectorLayer({
    source: deliveryLineSource,
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

    deliveryLineSource.addFeatures([
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
    playerNameLayer,
    ...(havePins ? [pinsLayer, pinLabelsLayer] : []),
  ]);

  const mapState = $state({
    delivery: true,
    house: true,
    player: true,
    playerName: true,
    pins: true,
    pinLabels: true,
    jobOnly: false,
    houseVacantOnly: false,
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
    playerCopsOnly: z.optional(z.boolean()),
    playerCriminalOnly: z.optional(z.boolean()),
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
        mapState.jobOnly = state.jobOnly ?? false;
        mapState.houseVacantOnly = state.houseVacantOnly ?? false;
        mapState.playerCopsOnly = state.playerCopsOnly ?? false;
        mapState.playerCriminalOnly = state.playerCriminalOnly ?? false;
      }
    } catch (e) {
      console.error('Failed to load map state:', e);
    }
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
          playerCopsOnly: mapState.playerCopsOnly,
          playerCriminalOnly: mapState.playerCriminalOnly,
        }),
      );
    }
  });

  let selectedPoint: Feature | undefined = undefined;
  let lockPoint: Feature | undefined = undefined;
  let hoverPoint: Feature | undefined = undefined;
  let hoverInfo: HoverInfo | undefined = $state();

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
            layer !== playerNameLayer &&
            layer !== deliveryLineLayer &&
            layer !== pinLabelsLayer &&
            layer !== pinsLayer
          );
        },
        hitTolerance: 10,
      },
    );

    if (currentHoverPoint !== hoverPoint) {
      if (!lockPoint) {
        deliveryLineSource.clear(true);
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
    playerPointSource.clear(true);
    playerPointSource.addFeatures(
      data.map(
        (playerData: PlayerData) =>
          new Feature({
            geometry: new Point(playerData.geometry),
            pointType: PointType.Player,
            info: playerData,
            selected: playerData.guid === playerSelectingGuid,
            role: hasPoliceRole(playerData.name)
              ? PlayerRoles.Police
              : hasCriminalRole(playerData.name)
                ? PlayerRoles.Criminal
                : 'none',
          }),
      ),
    );
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
    deliveryLineSource.clear(true);
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

          return true;
        },
        {
          layerFilter: (layer) => {
            return (
              layer === deliveryPointLayer || layer === residentPointLayer || layer === houseLayer
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
  };

  const enableHouseLayer = () => {
    mapState.house = true;
    houseLayer.setVisible(true);
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
        deliveryLineSource.clear(true);
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
      f.set('vacant', !houseData?.[info.name]?.ownerName ? 1 : 0);
    }
  });

  $effect(() => {
    houseLayer.setStyle(getHouseStyle(mapState.houseVacantOnly));
  });
</script>

<div class="relative h-full w-full">
  <OlMap
    {layers}
    class="h-full w-full"
    zoomClass="!left-[unset] !top-[unset] bottom-4 right-4"
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
  <div class="pointer-events-none absolute bottom-0 left-0 w-full p-4">
    <ClickAwayBlock active={poiOpen} onClickAway={() => (poiOpen = false)}>
      <div class="relative">
        {#if poiOpen}
          <div
            class="absolute bottom-full left-0 mb-2 w-max max-w-full"
            transition:fade={{ duration: defaultTransitionDurationMs }}
          >
            <Card
              class="pointer-events-auto overflow-hidden !bg-gray-900/50 !p-0 !shadow-white/3 !ring-white/5 backdrop-blur-sm"
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
                  label={censored.c ? m['map.poi.jobs_only_c']() : m['map.poi.jobs_only']()}
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
              </div>
            </Card>
          </div>
        {/if}

        <Card
          class="pointer-events-auto w-max overflow-hidden !bg-gray-900/50 !p-0 !shadow-white/3 !ring-white/5 backdrop-blur-sm hover:!bg-gray-900/40 active:!bg-gray-900/60"
        >
          <button
            class="text-text-dark flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
            onclick={() => (poiOpen = !poiOpen)}
          >
            <Icon class="i-material-symbols:location-on-rounded" size="xs" />
            {m['map.point_of_interests']()}
          </button>
        </Card>
      </div>
    </ClickAwayBlock>
  </div>

  <HoverInfoTooltip {hoverInfo} {houseData} onClick={handleInfoClick} />
</div>
