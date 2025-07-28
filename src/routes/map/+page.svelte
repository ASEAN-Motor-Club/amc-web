<script lang="ts">
  import OlMap from '$lib/ui/OlMap/OlMap.svelte';
  import VectorLayer from 'ol/layer/Vector';
  import VectorSource from 'ol/source/Vector';
  import Point from 'ol/geom/Point';
  import Feature from 'ol/Feature';
  import { onDestroy, onMount } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import type { MapBrowserEvent } from 'ol';
  import { Fill, Stroke, Style, Text } from 'ol/style';
  import { PointType, type PlayerData } from '$lib/components/Map/types';
  import {
    deliveryPointLayer,
    residentPointLayer,
    houseLayer,
  } from '$lib/components/Map/staticPoints';
  import HoverInfoTooltip, { type HoverInfo } from '$lib/components/Map/HoverInfoTooltip.svelte';
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
  } from '$lib/tw-var';
  import WebGLVectorLayer from 'ol/layer/WebGLVector';
  import {
    deliveryPointsMap,
    demandKeyMapNoResident,
    supplyKeyMap,
    type DeliveryPoint,
  } from '$lib/data/deliveryPoint';
  import { goto } from '$app/navigation';
  import Search, { type SearchPoint } from '$lib/components/Map/Search.svelte';
  import { reProjectPoint } from '$lib/ui/OlMap/utils';
  import { DeliveryLineType, type HouseData } from '$lib/api/types';
  import { getHousingData } from '$lib/api/housing';
  import { LineString } from 'ol/geom';
  import type { DeliveryCargo } from '$lib/data/types';
  import { uniq } from 'lodash-es';
  import { cargoMetadata } from '$lib/data/cargo';
  import LoadClass from '$lib/ui/LoadClass/LoadClass.svelte';
  import { m } from '$lib/paraglide/messages';
  import { page } from '$app/state';
  import { houses } from '$lib/data/house';
  import { matchMouse } from '$lib/utils/media';
  import { getLocationAtPoint } from '$lib/data/area';
  import { getPlayerRealtimePosition } from '$lib/api/player';
  import { pinsSchema, type Pin, type Pins } from '$lib/schema/pin';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { SvelteSet } from 'svelte/reactivity';

  let pinsData = $state<Pins>([]);
  const havePins = $derived(pinsData.length > 0);

  const pinsSource = new VectorSource({
    features: [] as Feature<Point>[],
  });

  const pinsLayer = new WebGLVectorLayer({
    source: pinsSource,
    style: {
      'circle-radius': 5,
      'circle-fill-color': ['match', ['get', 'hover'], 1, colorRed200, colorRed400],
      'circle-stroke-color': 'black',
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
      'circle-fill-color': ['match', ['get', 'hover'], 1, colorEmerald200, colorEmerald400],
      'circle-stroke-color': 'black',
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
      playerNameStyle.getText()?.setText(feature.get('name') as string);
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

  const updateDeliveryLine = (deliveryPoint: DeliveryPoint) => {
    const allDropPointLink: [DeliveryPoint, DeliveryPoint][] = [];

    if (deliveryPoint.parent) {
      allDropPointLink.push([
        deliveryPoint,
        deliveryPointsMap.get(deliveryPoint.parent) as DeliveryPoint,
      ]);
    }

    const connectedDrop: SvelteSet<DeliveryCargo> = new SvelteSet();

    if (deliveryPoint.dropPoint) {
      deliveryPoint.dropPoint.forEach((dropPointGuid) => {
        const dropPoint = deliveryPointsMap.get(dropPointGuid) as DeliveryPoint;
        Object.keys(dropPoint.storage).forEach((cargoType) => {
          connectedDrop.add(cargoType as DeliveryCargo);
        });
        allDropPointLink.push([deliveryPoint, dropPoint]);
      });
    }

    const allSupplyDestinations = uniq(
      deliveryPoint.allSupplyKey
        .map((d) => [cargoMetadata[d], demandKeyMapNoResident.get(d) ?? []] as const)
        .flatMap(([d, dps]) =>
          dps.map((dp) => {
            const point = deliveryPointsMap.get(dp) as DeliveryPoint;
            if (d.minDist || d.maxDist || deliveryPoint.maxDist || point.maxReceiveDist) {
              const dist = Math.hypot(
                point.coord.x - deliveryPoint.coord.x,
                point.coord.y - deliveryPoint.coord.y,
              );
              if (d.minDist) {
                if (dist < d.minDist) {
                  return undefined;
                }
              }
              if (d.maxDist) {
                if (dist > d.maxDist) {
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
              allDropPointLink.push([point, deliveryPointsMap.get(point.parent) as DeliveryPoint]);
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
        .flatMap(([d, dps]) =>
          dps.map((dp) => {
            const point = deliveryPointsMap.get(dp) as DeliveryPoint;
            if (d.minDist || d.maxDist || deliveryPoint.maxReceiveDist || point.maxDist) {
              const dist = Math.hypot(
                point.coord.x - deliveryPoint.coord.x,
                point.coord.y - deliveryPoint.coord.y,
              );
              if (d.minDist) {
                if (dist < d.minDist) {
                  return undefined;
                }
              }
              if (d.maxDist) {
                if (dist > d.maxDist) {
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
              point.dropPoint.forEach((dropPointGuid) => {
                const dropPoint = deliveryPointsMap.get(dropPointGuid) as DeliveryPoint;
                allDropPointLink.push([point, dropPoint]);
              });
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
    name: m['map.delivery_point'](),
    layer: [deliveryPointLayer, residentPointLayer],
    enabled: true,
  });

  const houseLayerData = $state({
    id: layerId.House,
    name: m['map.house'](),
    layer: [houseLayer],
    enabled: true,
  });

  const playerNameLayerData = $state({
    id: layerId.PlayerName,
    name: m['map.player_name'](),
    layer: [playerNameLayer],
    enabled: true,
  });

  const playerLayerData = $state({
    id: layerId.Player,
    name: m['map.player'](),
    layer: [playerPointLayer],
    enabled: true,
  });

  const pinsLayerData = $state({
    id: layerId.Pins,
    name: m['map.pins'](),
    layer: [pinsLayer],
    enabled: true,
  });

  const pinLabelsLayerData = $state({
    id: layerId.PinLabels,
    name: m['map.pin_labels'](),
    layer: [pinLabelsLayer],
    enabled: true,
  });

  const layersData = $state([
    deliveryLayerData,
    houseLayerData,
    playerLayerData,
    playerNameLayerData,
    pinsLayerData,
    pinLabelsLayerData,
  ]);

  let lockPoint: Feature | undefined = undefined;
  let hoverPoint: Feature | undefined = undefined;
  let hoverInfo: HoverInfo | undefined = $state(undefined);

  const handlePointerMoveOrClick = (
    e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>,
  ) => {
    let currentHoverInfo: HoverInfo | undefined = undefined;
    let currentHoverPoint = undefined as Feature | undefined;

    e.map.forEachFeatureAtPixel(
      e.pixel,
      (feature) => {
        const f = feature as Feature;
        f.set('hover', true);
        currentHoverInfo = {
          pointType: f.get('pointType'),
          name: f.get('name'),
          pixelCoord: e.pixel as [number, number],
          location: f.get('location'),
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
      if (hoverPoint !== lockPoint) {
        hoverPoint?.set('hover', false);
      }
      hoverPoint = currentHoverPoint;
    }
    hoverInfo = currentHoverInfo;
  };

  let playerData: PlayerData[] = $state([]);
  let playerStickyFocusGuid: string | undefined = undefined;
  let initialFocus = true;

  const setPlayerPoints = (data: PlayerData[]) => {
    playerPointSource.clear(true);
    playerPointSource.addFeatures(
      data.map(
        (playerData: PlayerData) =>
          new Feature({
            geometry: new Point(playerData.geometry),
            name: playerData.name,
            pointType: PointType.Player,
            location: playerData.location,
            info: playerData,
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
    stopPolling = getPlayerRealtimePosition((data) => {
      const result = Object.entries(data).map(([name, coord]) => ({
        geometry: reProjectPoint([coord.x, coord.y]),
        name,
        coord,
        location: getLocationAtPoint(coord),
        pointType: PointType.Player as const,
        vehicleKey: coord.vehicle_key,
        guid: coord.unique_id,
      }));
      playerData = result;
      setPlayerPoints(result);
    });
  };

  let stopPolling: (() => void) | undefined = undefined;

  onMount(() => {
    const startPolling = () => {
      console.log(document.hidden);
      stopPolling?.();
      if (document.hidden) {
        stopPolling = undefined;
        playerData = [];
        setPlayerPoints([]);
        return;
      }
      getPlayerRealtimePositionCall();
    };

    document.addEventListener('visibilitychange', startPolling);

    if (!document.hidden) {
      getPlayerRealtimePositionCall();
    }
    return () => {
      document.removeEventListener('visibilitychange', startPolling);
      stopPolling?.();
    };
  });

  const handleMapRightClick = () => {
    if (hoverPoint === undefined || hoverPoint.get('pointType') !== PointType.Delivery) {
      deliveryLineSource.clear(true);
      lockPoint?.set('hover', false);
      lockPoint = undefined;
      return;
    } else {
      lockPoint?.set('hover', false);
      if (hoverPoint.get('pointType') === PointType.Delivery) {
        lockPoint = hoverPoint;
        deliveryLineSource.clear(true);
        const deliveryPoint = lockPoint.get('info') as DeliveryPoint;
        updateDeliveryLine(deliveryPoint);
      }
    }
  };

  const handleInfoClick = () => {
    if (!hoverInfo) {
      return;
    }

    if (hoverInfo.pointType === PointType.House) {
      goto(`/housing`);
    } else if (hoverInfo.pointType === PointType.Delivery) {
      goto(`/industries/${hoverInfo.info.guid}`);
    }
  };

  const handlePointerMove = (e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) => {
    const isMouse = matchMouse();
    if (isMouse) {
      handlePointerMoveOrClick(e);
    } else {
      hoverInfo = undefined;
    }
  };

  const handleClick = (e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) => {
    const isMouse = matchMouse();
    if (isMouse) {
      deliveryLineSource.clear(true);
      lockPoint?.set('hover', false);
      lockPoint = undefined;
      e.map.forEachFeatureAtPixel(
        e.pixel,
        (feature) => {
          const f = feature as Feature;
          const type = f.get('pointType') as PointType | undefined;
          if (type === PointType.Delivery) {
            const info = f.get('info') as DeliveryPoint;
            goto(`/industries/${info.guid}`);
          }
          if (type === PointType.House) {
            goto(`/housing`);
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
    layer.enabled = forceTo !== undefined ? forceTo : !layer.enabled;
    if (layer.id === layerId.Player) {
      if (!layer.enabled) {
        playerNameLayer.setVisible(false);
      } else {
        setPlayerPoints(playerData);
        playerNameLayer.setVisible(!!playerNameLayerData?.enabled);
      }
    }
    if (layer.id === layerId.Pins) {
      if (!layer.enabled) {
        pinLabelsLayer.setVisible(false);
      } else {
        setPlayerPoints(playerData);
        pinLabelsLayer.setVisible(!!pinLabelsLayerData?.enabled);
      }
    } else if (layer.id === layerId.Delivery) {
      deliveryLineSource.clear(true);
      lockPoint?.set('hover', false);
      lockPoint = undefined;
    }
    layer.layer.forEach((l) => l.setVisible(layer.enabled));
  };

  let map: OlMap;

  const handleSearchClick = (point: SearchPoint) => {
    switch (point.pointType) {
      case PointType.Delivery:
        onHideShowClick(deliveryLayerData, true);
        break;
      case PointType.House:
        onHideShowClick(houseLayerData, true);
        break;
      case PointType.Player:
        onHideShowClick(playerLayerData, true);
        break;
      case PointType.Pin:
        onHideShowClick(pinsLayerData, true);
        break;
    }
    if (point.pointType === PointType.Player) {
      playerStickyFocusGuid = point.guid;
      initialFocus = true;
    } else {
      playerStickyFocusGuid = undefined;
    }
    map.centerOn(reProjectPoint([point.coord.x, point.coord.y]));
  };

  let houseData: HouseData | undefined = $state(undefined);

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

  onMount(() => {
    const housing = page.url.searchParams.get('housing');
    if (housing) {
      const house = houses.find((h) => h.name === housing);
      if (house) {
        map.centerOn(reProjectPoint([house.coord.x, house.coord.y]), 0);
      }
      return;
    }
    const deliveryGuid = page.url.searchParams.get('delivery');
    if (deliveryGuid) {
      const deliveryPoint = deliveryPointsMap.get(deliveryGuid);
      if (deliveryPoint) {
        map.centerOn(reProjectPoint([deliveryPoint.coord.x, deliveryPoint.coord.y]), 0);
      }
    }
    const playerGuid = page.url.searchParams.get('player');
    if (playerGuid) {
      playerStickyFocusGuid = playerGuid;
    }
    const pins = page.url.searchParams.get('pins');
    if (pins) {
      try {
        const pinsJson = pinsSchema.parse(JSON.parse(pins));
        pinsData = pinsJson.map((p, i) => ({
          ...p,
          pointType: PointType.Pin,
          label: p.label ?? m['map.pin_no']({ index: i + 1 }),
        }));
        pinsSource.addFeatures(
          pinsData.map(
            (p: Pin) =>
              new Feature({
                geometry: new Point(reProjectPoint([p.x, p.y])),
                label: p.label,
                pointType: PointType.Pin,
              }),
          ),
        );
        const focusIndex = page.url.searchParams.get('focus_index');
        if (focusIndex) {
          const focusPin = pinsData[+focusIndex];
          if (focusPin) {
            map.centerOn(reProjectPoint([focusPin.x, focusPin.y]), 0);
          }
        }
      } catch (e) {
        console.error('Invalid pins data:', e);
        showModal({
          title: m['map.pins_invalid.title'](),
          message: m['map.pins_invalid.desc'](),
        });
      }
    }
  });

  onDestroy(() => {
    hoverPoint?.set('hover', false);
    lockPoint?.set('hover', false);
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

<svelte:head>
  <title>{m['map.head']({ siteName: m['site_name_short']() })}</title>
</svelte:head>

<div class="relative h-full w-full bg-[#375d87]">
  <LoadClass class={['!left-[unset] !top-[unset] bottom-4 right-4']}>
    {#snippet children([className])}
      <OlMap
        {layers}
        class="h-full w-full"
        zoomClass={className}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        onRightClick={handleMapRightClick}
        bind:this={map}
        onPointerDrag={handlePointerDrag}
      />
    {/snippet}
  </LoadClass>
  <div
    class="pointer-events-none absolute left-0 top-0 flex h-full w-full flex-col items-start justify-between gap-2 overflow-hidden p-4"
  >
    <Search {pinsData} {playerData} {houseData} onPointClick={handleSearchClick} />
    <Card
      class="!shadow-white/3 media-touch:mr-13 pointer-events-auto mr-10 !bg-neutral-900/50 !p-1.5 !ring-white/5 backdrop-blur-lg"
    >
      <h2 class="text-text-dark mb-1 text-xs">{m['map.point_of_interests']()}</h2>
      <div class="flex flex-wrap gap-2">
        {#each layersDataCheckPins as layer (layer.name)}
          <Button
            class={[
              '!px-2',
              {
                '!text-text !bg-yellow-500': layer.id === layerId.Delivery,
                '!text-text !bg-cyan-500': layer.id === layerId.House,
                '!text-text !bg-emerald-400': layer.id === layerId.Player,
                '!text-text !bg-emerald-300': layer.id === layerId.PlayerName,
                '!text-text !bg-red-400': layer.id === layerId.Pins,
                '!text-text !bg-red-300': layer.id === layerId.PinLabels,
              },
              {
                'opacity-50':
                  !layer.enabled ||
                  (layer.id === layerId.PlayerName && !playerLayerData?.enabled) ||
                  (layer.id === layerId.PinLabels && !pinsLayerData?.enabled),
              },
            ]}
            size="xs"
            disabled={(layer.id === layerId.PlayerName && !playerLayerData?.enabled) ||
              (layer.id === layerId.PinLabels && !pinsLayerData?.enabled)}
            onClick={() => onHideShowClick(layer)}
          >
            {layer.name}
          </Button>
        {/each}
      </div>
    </Card>
  </div>

  <HoverInfoTooltip {hoverInfo} {houseData} onClick={handleInfoClick} />
</div>
