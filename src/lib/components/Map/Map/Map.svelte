<script lang="ts">
  import OlMap from '$lib/ui/OlMap/OlMap.svelte';
  import VectorLayer from 'ol/layer/Vector';
  import VectorSource from 'ol/source/Vector';
  import Point from 'ol/geom/Point';
  import Feature from 'ol/Feature';
  import { onMount, untrack } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import type { MapBrowserEvent } from 'ol';
  import { Fill, Stroke, Style, Text } from 'ol/style';
  import { PointType, type PlayerData } from './types';
  import { getStaticPoints } from './staticPoints';
  import HoverInfoTooltip, { type HoverInfo } from './HoverInfoTooltip.svelte';
  import {
    textXs,
    fontSans,
    colorEmerald200,
    colorEmerald400,
    colorBlue500,
    colorGreen500,
    adjustOpacity,
    colorYellow500,
    colorRed200,
    colorRed400,
    colorRed500,
    colorEmerald500,
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
  import { DeliveryLineType, type HouseData } from '$lib/api/types';
  import { getHousingData } from '$lib/api/housing';
  import { LineString } from 'ol/geom';
  import type { DeliveryCargo } from '$lib/data/types';
  import { uniq } from 'lodash-es';
  import { cargoMetadata } from '$lib/data/cargo';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { isMouse } from '$lib/utils/media.svelte';
  import { getPlayerRealtimePosition } from '$lib/api/player';
  import { pinsSchema, type Pin, type Pins } from '$lib/schema/pin';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
  import * as z from 'zod/mini';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';

  const {
    deliveryPointFeatures,
    residentPointFeatures,
    houseFeatures,
    deliveryPointLayer,
    residentPointLayer,
    houseLayer,
  } = getStaticPoints();

  const DISABLED_DATA_STORAGE_KEY = 'mapDisabledLayer';

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
        'match',
        ['get', 'hover'],
        1,
        colorRed200,
        ['match', ['get', 'selected'], 1, colorRed500, colorRed400],
      ],
      'circle-stroke-color': ['match', ['get', 'selected'], 1, 'white', 'black'],
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  const PinLabelsStyle = new Style({
    text: new Text({
      font: `${textXs} ${fontSans}`,
      offsetY: -14,
      fill: new Fill({
        color: 'black',
      }),
      stroke: new Stroke({
        color: 'white',
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
        'match',
        ['get', 'hover'],
        1,
        colorEmerald200,
        ['match', ['get', 'selected'], 1, colorEmerald500, colorEmerald400],
      ],
      'circle-stroke-color': ['match', ['get', 'selected'], 1, 'white', 'black'],
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  const playerNameStyle = new Style({
    text: new Text({
      font: `${textXs} ${fontSans}`,
      offsetY: -12,
      fill: new Fill({
        color: 'black',
      }),
      stroke: new Stroke({
        color: 'white',
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
        [
          'match',
          ['get', 'type'],
          DeliveryLineType.Demand,
          adjustOpacity(colorBlue500, 0.75),
          adjustOpacity(colorYellow500, 0.75),
        ],
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

  const layerId = {
    Delivery: 0,
    House: 1,
    Player: 2,
    PlayerName: 3,
    Pins: 4,
    PinLabels: 5,
  };

  const deliveryLayerData = $state({
    id: layerId.Delivery,
    name: siteLocale.msg['map.delivery_point'](),
    layer: [deliveryPointLayer, residentPointLayer, deliveryLineLayer],
    enabled: true,
    color: '!bg-yellow-500 hover:!bg-yellow-400',
  });

  const houseLayerData = $state({
    id: layerId.House,
    name: siteLocale.msg['map.house'](),
    layer: [houseLayer],
    enabled: true,
    color: '!bg-cyan-500 hover:!bg-cyan-400',
  });

  const playerNameLayerData = $state({
    id: layerId.PlayerName,
    name: siteLocale.msg['map.player_name'](),
    layer: [playerNameLayer],
    enabled: true,
    color: '!bg-emerald-300 hover:!bg-emerald-200',
  });

  const playerLayerData = $state({
    id: layerId.Player,
    name: siteLocale.msg['map.player'](),
    layer: [playerPointLayer],
    enabled: true,
    color: '!bg-emerald-400 hover:!bg-emerald-300',
  });

  const pinsLayerData = $state({
    id: layerId.Pins,
    name: siteLocale.msg['map.pins'](),
    layer: [pinsLayer],
    enabled: true,
    color: '!bg-red-400 hover:!bg-red-300',
  });

  const pinLabelsLayerData = $state({
    id: layerId.PinLabels,
    name: siteLocale.msg['map.pin_labels'](),
    layer: [pinLabelsLayer],
    enabled: true,
    color: '!bg-red-300 hover:!bg-red-200',
  });

  const layersData = $state([
    deliveryLayerData,
    houseLayerData,
    playerLayerData,
    playerNameLayerData,
    pinsLayerData,
    pinLabelsLayerData,
  ]);

  onMount(() => {
    try {
      const stringArraySchema = z.array(z.enum(layerId));
      const savedLayer = JSON.parse(localStorage.getItem(DISABLED_DATA_STORAGE_KEY) ?? '');
      const result = stringArraySchema.safeParse(savedLayer);
      if (result.success) {
        for (const layer of result.data) {
          const layerData = layersData.find((l) => l.id === layer);
          if (layerData) {
            layerData.enabled = false;
            for (const l of layerData.layer) {
              l.setVisible(false);
            }
            if (layerData.id === layerId.Player) {
              playerNameLayer.setVisible(false);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load layer state:', e);
    }
  });

  $effect(() => {
    if (typeof window !== 'undefined') {
      const disabledLayer = layersData
        .filter(
          (layer) => layer.id !== layerId.Pins && layer.id !== layerId.PinLabels && !layer.enabled,
        )
        .map((layer) => layer.id);
      localStorage.setItem(DISABLED_DATA_STORAGE_KEY, JSON.stringify(disabledLayer));
    }
  });

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
          const deliveryPoint = (currentHoverInfo as unknown as HoverInfo).info as DeliveryPoint;
          updateDeliveryLine(deliveryPoint);
        }
      }
      hoverPoint?.set('hover', false);
      hoverPoint = currentHoverPoint;
    }
    hoverInfo = currentHoverInfo;
  };

  let playerData: PlayerData[] = $state([]);
  let playerStickyFocusGuid: string | undefined = undefined;
  let playerSelectingGuid: string | undefined = undefined;
  let initialFocus = true;

  const setPlayerPoints = (data: PlayerData[]) => {
    playerPointSource.clear(true);
    playerPointSource.addFeatures(
      data.map(
        (playerData: PlayerData) =>
          new Feature({
            geometry: new Point(playerData.geometry),
            pointType: PointType.Player,
            info: playerData,
            selected: playerData.guid === playerSelectingGuid ? 1 : 0,
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
      setPlayerPoints(result);
    });
  };

  let stopPolling: (() => void) | undefined = undefined;

  $effect(() => {
    stopPolling?.();
    if (document.hidden || !playerLayerData.enabled) {
      stopPolling = undefined;
      playerData = [];
      setPlayerPoints([]);
    } else {
      stopPolling = getPlayerRealtimePositionCall();
    }

    return () => {
      stopPolling?.();
      stopPolling = undefined;
    };
  });

  const clearSelection = () => {
    houseFeatures.forEach((house) => {
      house.set('selected', 0);
    });
    deliveryPointFeatures.forEach((d) => {
      d.set('selected', 0);
    });
    residentPointFeatures.forEach((d) => {
      d.set('selected', 0);
    });
    playerSelectingGuid = undefined;
    playerStickyFocusGuid = undefined;
    deliveryLineSource.clear(true);
    lockPoint?.set('selected', false);
    lockPoint = undefined;
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.delete('house');
    newParams.delete('delivery');
    newParams.delete('player');
    goto(`?${newParams.toString()}`);
  };

  let dontFocus = false;

  const handleMapRightClick = () => {
    clearSelection();

    if (hoverPoint && hoverPoint.get('pointType') === PointType.Delivery) {
      const newParams = new SvelteURLSearchParams(clientSearchParams());
      newParams.delete('house');
      newParams.delete('player');
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
      const newParams = new SvelteURLSearchParams(clientSearchParams());
      newParams.delete('house');
      newParams.delete('player');
      newParams.set('menu', `delivery/${hoverInfo.info.guid}`);
      newParams.set('delivery', hoverInfo.info.guid);
      goto(`/map?${newParams.toString()}`);
    } else if (hoverInfo.pointType === PointType.House) {
      const newParams = new SvelteURLSearchParams(clientSearchParams());
      newParams.delete('delivery');
      newParams.delete('player');
      newParams.set('menu', 'housing');
      newParams.set('house', hoverInfo.info.name);
      newParams.set('hf', hoverInfo.info.name);
      goto(`/map?${newParams.toString()}`);
    }
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
            const newParams = new SvelteURLSearchParams(clientSearchParams());
            newParams.delete('house');
            newParams.delete('player');
            newParams.set('menu', `delivery/${info.guid}`);
            newParams.set('delivery', info.guid);
            goto(`/map?${newParams.toString()}`);
            return true;
          }
          if (type === PointType.House) {
            const newParams = new SvelteURLSearchParams(clientSearchParams());
            newParams.delete('delivery');
            newParams.delete('player');
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

  const onHideShowClick = (layer: (typeof layersData)[number], forceTo?: boolean) => {
    layer.enabled = forceTo ?? !layer.enabled;
    if (layer.id === layerId.Player) {
      if (!layer.enabled) {
        playerNameLayer.setVisible(false);
      } else {
        setPlayerPoints(playerData);
        playerNameLayer.setVisible(playerNameLayerData.enabled);
      }
    }
    if (layer.id === layerId.Pins) {
      if (!layer.enabled) {
        pinLabelsLayer.setVisible(false);
      } else {
        setPlayerPoints(playerData);
        pinLabelsLayer.setVisible(pinLabelsLayerData.enabled);
      }
    }
    for (const l of layer.layer) {
      l.setVisible(layer.enabled);
    }
  };

  let map: OlMap;

  const handleSearchClick = (point: SearchPoint) => {
    if (point.pointType === PointType.Pin) {
      onHideShowClick(pinsLayerData, true);
    } else if (point.pointType === PointType.Player) {
      playerStickyFocusGuid = point.guid;
      playerSelectingGuid = point.guid;
      initialFocus = true;
    } else {
      playerStickyFocusGuid = undefined;
      playerSelectingGuid = undefined;
    }
    map.centerOn(reProjectPoint([point.coord.x, point.coord.y]));
  };

  let houseData: HouseData | undefined = $state();

  onMount(() => {
    const abortController = new AbortController();
    getHousingData(abortController.signal).then((data) => {
      houseData = data;
    });

    return () => {
      abortController.abort();
    };
  });

  const { showModal } = getMsgModalContext();

  let init = true;

  $effect(() => {
    houseFeatures.forEach((house) => {
      house.set('selected', 0);
    });
    deliveryPointFeatures.forEach((d) => {
      d.set('selected', 0);
    });
    residentPointFeatures.forEach((d) => {
      d.set('selected', 0);
    });
    playerSelectingGuid = undefined;
    playerStickyFocusGuid = undefined;
    const cacheInit = init;
    init = false;
    const cacheDontFocus = dontFocus;
    dontFocus = false;

    const housing = clientSearchParamsGet('house');
    if (housing) {
      untrack(() => {
        onHideShowClick(houseLayerData, true);
      });
      const house = houseFeatures.find((h) => h.get('info').name === housing);
      if (house) {
        house.set('selected', 1);
        if (!cacheDontFocus) {
          map.centerOn(
            house.getGeometry()?.getCoordinates() as [number, number],
            cacheInit ? 0 : undefined,
          );
        }
      }
      return;
    }

    const deliveryGuid = clientSearchParamsGet('delivery');
    if (deliveryGuid) {
      const deliveryPoint =
        deliveryPointFeatures.find((d) => d.get('info').guid === deliveryGuid) ??
        residentPointFeatures.find((d) => d.get('info').guid === deliveryGuid);
      if (deliveryPoint) {
        untrack(() => {
          onHideShowClick(deliveryLayerData, true);
        });
        lockPoint = deliveryPoint;
        deliveryPoint.set('selected', true);
        deliveryLineSource.clear(true);
        const deliveryPointInfo = lockPoint.get('info') as DeliveryPoint;
        updateDeliveryLine(deliveryPointInfo);
        if (!cacheDontFocus) {
          map.centerOn(
            deliveryPoint.getGeometry()?.getCoordinates() as [number, number],
            cacheInit ? 0 : undefined,
          );
        }
      }
      return;
    }

    const playerGuid = clientSearchParamsGet('player');
    if (playerGuid) {
      untrack(() => {
        onHideShowClick(playerLayerData, true);
      });
      playerStickyFocusGuid = playerGuid;
      playerSelectingGuid = playerGuid;
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
          label: p.label ?? siteLocale.msg['map.pin_no']({ index: i + 1 }),
        }));
        pinsSource.addFeatures(
          data.map(
            (p: Pin, i) =>
              new Feature({
                geometry: new Point(reProjectPoint([p.x, p.y])),
                label: p.label,
                pointType: PointType.Pin,
                selected: focusIndex === i ? 1 : 0,
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
          title: siteLocale.msg['map.pins_invalid.title'](),
          message: siteLocale.msg['map.pins_invalid.desc'](),
        });
      }
    }
  });

  const handlePointerDrag = () => {
    playerStickyFocusGuid = undefined;
  };

  const layersDataCheckPins = $derived(
    havePins
      ? layersData
      : layersData.filter((layer) => layer.id !== layerId.Pins && layer.id !== layerId.PinLabels),
  );
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
  />
  <div
    class="pointer-events-none absolute left-0 top-0 flex h-full w-full flex-col items-start justify-between gap-2 overflow-hidden p-4"
  >
    <Search {pinsData} {playerData} {houseData} onPointClick={handleSearchClick} />
    <Card
      class="!shadow-white/3 media-touch:mr-13 pointer-events-auto mr-10 !bg-neutral-900/50 p-1.5 !ring-white/5 backdrop-blur-lg"
    >
      <h2 class="text-text-dark mb-1 text-xs">
        {siteLocale.msg['map.point_of_interests']()}
      </h2>
      <div class="flex flex-wrap gap-2">
        {#each layersDataCheckPins as layer (layer.name)}
          <Button
            class={[
              '!text-text !px-2',
              layer.color,
              {
                'opacity-50':
                  !layer.enabled ||
                  (layer.id === layerId.PlayerName && !playerLayerData.enabled) ||
                  (layer.id === layerId.PinLabels && !pinsLayerData.enabled),
              },
            ]}
            size="xs"
            disabled={(layer.id === layerId.PlayerName && !playerLayerData.enabled) ||
              (layer.id === layerId.PinLabels && !pinsLayerData.enabled)}
            onClick={() => {
              onHideShowClick(layer);
            }}
          >
            {layer.name}
          </Button>
        {/each}
      </div>
    </Card>
  </div>

  <HoverInfoTooltip {hoverInfo} {houseData} onClick={handleInfoClick} />
</div>
