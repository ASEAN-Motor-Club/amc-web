<script lang="ts">
  import OlMap from '$lib/ui/OlMap/OlMap.svelte';
  import VectorLayer from 'ol/layer/Vector';
  import VectorSource from 'ol/source/Vector';
  import Point from 'ol/geom/Point';
  import Feature from 'ol/Feature';
  import { onMount } from 'svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import type { MapBrowserEvent } from 'ol';
  import { Fill, Stroke, Style, Text } from 'ol/style';
  import { PointType } from '$lib/components/Map/types';
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
  } from '$lib/tw-var';
  import WebGLVectorLayer from 'ol/layer/WebGLVector';
  import {
    deliveryPointsMap,
    demandKeyMapNoResident,
    supplyKeyMap,
    type DeliveryPoint,
  } from '$lib/data/deliveryPoint';
  import { goto } from '$app/navigation';
  import { Map } from 'ol';
  import PlayerFetchWorker from '$lib/components/Map/playerFetchWorker.ts?worker';
  import type { PlayerData } from '$lib/components/Map/playerFetchWorker';
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

    const connectedDrop: Set<DeliveryCargo> = new Set();

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

  const layers = [
    deliveryLineLayer,
    deliveryPointLayer,
    residentPointLayer,
    houseLayer,
    playerPointLayer,
    playerNameLayer,
  ];

  const layerId = {
    Delivery: 0,
    House: 1,
    Player: 2,
    PlayerName: 3,
  };

  const layersData = $state([
    {
      id: layerId.Delivery,
      name: m['map.delivery_point'](),
      layer: [deliveryPointLayer, residentPointLayer],
      enabled: true,
    },
    {
      id: layerId.House,
      name: m['map.house'](),
      layer: [houseLayer],
      enabled: true,
    },
    {
      id: layerId.Player,
      name: m['map.player'](),
      layer: [playerPointLayer],
      enabled: true,
    },
    {
      id: layerId.PlayerName,
      name: m['map.player_name'](),
      layer: [playerNameLayer],
      enabled: true,
    },
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
          return layer !== playerNameLayer && layer !== deliveryLineLayer;
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

  const playerNameLayerData = $derived(layersData.find((layer) => layer.id === layerId.PlayerName));

  const playerLayerData = $derived(layersData.find((layer) => layer.id === layerId.Player));

  let playerData: PlayerData[] = $state([]);

  const setPlayerPoints = (data: PlayerData[]) => {
    playerPointSource.clear(true);
    playerPointSource.addFeatures(
      data.map(
        ({ geometry, name, location }: PlayerData) =>
          new Feature({
            geometry: new Point(geometry),
            name,
            pointType: PointType.Player,
            location,
          }),
      ),
    );
  };

  onMount(() => {
    const worker = new PlayerFetchWorker();
    worker.postMessage('start');

    worker.onmessage = (e) => {
      playerData = e.data;
      if (!playerLayerData?.enabled) return;

      setPlayerPoints(e.data);
    };

    return () => {
      worker.postMessage('stop');
      worker.terminate();
    };
  });

  const handleMapRightClick = (e: MouseEvent, map: Map) => {
    const pixel = map.getEventPixel(e);
    map.forEachFeatureAtPixel(
      pixel,
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

  const onPointerMove = (e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) => {
    const isMouse = matchMedia('(hover) and (pointer: fine)').matches;
    if (isMouse) {
      handlePointerMoveOrClick(e);
    } else {
      hoverInfo = undefined;
    }
  };

  const onClick = (e: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>) => {
    const isMouse = matchMedia('(hover) and (pointer: fine)').matches;
    if (isMouse) {
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
    }
    handlePointerMoveOrClick(e);
  };

  const onHideShowClick = (layer: (typeof layersData)[number]) => {
    layer.enabled = !layer.enabled;
    if (layer.id === layerId.Player) {
      if (!layer.enabled) {
        playerNameLayer.setVisible(false);
      } else {
        setPlayerPoints(playerData);
        playerNameLayer.setVisible(!!playerNameLayerData?.enabled);
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
</script>

<div class="relative h-full w-full bg-[#375d87]">
  <LoadClass class={['!left-[unset] !top-[unset] bottom-4 right-4']}>
    {#snippet children([className])}
      <OlMap
        {layers}
        class="h-full w-full"
        zoomClass={className}
        {onPointerMove}
        {onClick}
        onRightClick={handleMapRightClick}
        bind:this={map}
      />
    {/snippet}
  </LoadClass>
  <div
    class="pointer-events-none absolute left-0 top-0 flex h-full w-full flex-col items-start justify-between gap-2 overflow-hidden p-4"
  >
    <Search {playerData} {houseData} onPointClick={handleSearchClick} />
    <Card
      class="!shadow-white/3 media-touch:mr-13 pointer-events-auto mr-10 !bg-neutral-900/50 !p-1.5 !ring-white/5 backdrop-blur-lg"
    >
      <h2 class="text-text-dark mb-1 text-xs">{m['map.point_of_interests']()}</h2>
      <div class="flex flex-wrap gap-2">
        {#each layersData as layer (layer.name)}
          <Button
            class={[
              '!px-2',
              {
                '!text-text !bg-yellow-500': layer.id === layerId.Delivery,
                '!text-text !bg-cyan-500': layer.id === layerId.House,
                '!text-text !bg-emerald-400': layer.id === layerId.Player,
                '!text-text !bg-emerald-300': layer.id === layerId.PlayerName,
              },
              {
                'opacity-50':
                  !layer.enabled || (layer.id === layerId.PlayerName && !playerLayerData?.enabled),
              },
            ]}
            size="xs"
            disabled={layer.id === layerId.PlayerName && !playerLayerData?.enabled}
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
