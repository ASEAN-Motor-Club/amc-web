<script lang="ts">
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
    colorGray950,
    colorTextDark,
    colorViolet200,
    colorViolet400,
    colorViolet950,
    colorAmber200,
    colorAmber300,
    colorAmber400,
    colorBlue600,
    colorGreen600,
    colorOrange300,
    colorOrange500,
    colorOrange600,
    colorYellow300,
    colorYellow600,
    colorYellow950,
    colorAmber950,
    colorCyan300,
    colorCyan600,
    colorCyan500,
    colorCyan950,
  } from '$lib/tw-var';
  import OlMap from '$lib/ui/OlMap/OlMap.svelte';
  import { Collection, Feature, MapEvent, type MapBrowserEvent } from 'ol';
  import { LineString, Point, Polygon } from 'ol/geom';
  import VectorLayer from 'ol/layer/Vector';
  import WebGLVectorLayer from 'ol/layer/WebGLVector';
  import VectorSource from 'ol/source/Vector';
  import { Fill, Stroke, Style, Text } from 'ol/style';
  import { PointType, type MapState, type PlayerData, type TeleportPoint } from './types';
  import { DeliveryLineType, type DeliveryJob, type HouseData } from '$lib/api/types';
  import type { ShortcutZone } from '$lib/api/shortcutZone';
  import { deliveryPoints, type DeliveryPoint } from '$lib/data/deliveryPoint';
  import { getMatchJobDestFn, getMatchJobSourceFn } from '$lib/utils/delivery';
  import { m } from '$messages';
  import type { Vector2 } from '$lib/types';
  import { reProjectPoint } from '$lib/ui/OlMap/utils';
  import type { Pins } from '$lib/schema/pin';
  import { houses } from '$lib/data/house';
  import type { Pixel } from 'ol/pixel';

  interface Props {
    pipActive: boolean;
    enterPip: () => void;
    mapState: MapState;
    jobsData: DeliveryJob[];
    playerData: PlayerData[];
    houseData: HouseData | undefined;
    pinsData: Pins;
    teleportData: TeleportPoint[];
    shortcutZoneData: ShortcutZone[];
    deliveryLineData?: {
      point: Vector2;
      demand: DeliveryPoint[];
      supply: DeliveryPoint[];
      dropPoint: [DeliveryPoint, DeliveryPoint][];
    };
    onHover?: (feature: Feature | undefined, pixel: [number, number]) => void;
    onClick?: (feature: Feature) => void;
    onRightClick?: (feature: Feature) => void;
  }

  const {
    pipActive,
    enterPip,
    mapState,
    jobsData,
    playerData,
    houseData,
    pinsData,
    teleportData,
    shortcutZoneData,
    deliveryLineData,
    onHover,
    onClick,
    onRightClick,
  }: Props = $props();

  let map: OlMap;

  export const getMap = () => {
    return map.getMap();
  };

  const havePins = $derived(pinsData.length > 0);
  const haveTeleports = $derived(teleportData.length > 0);
  const haveShortcutZones = $derived(shortcutZoneData.length > 0);

  const [deliPoint, residentPoint] = deliveryPoints.reduce(
    (acc, point) => {
      if (point.type === 'Resident_C') {
        acc[1].push(point);
      } else {
        acc[0].push(point);
      }
      return acc;
    },
    [[] as DeliveryPoint[], [] as DeliveryPoint[]],
  );

  const deliveryPointFeatures = deliPoint.map(
    (point) =>
      new Feature({
        geometry: new Point(reProjectPoint([point.coord.x, point.coord.y])),
        pointType: PointType.Delivery,
        info: point,
      }),
  );

  const deliveryPointLayer = new WebGLVectorLayer({
    source: new VectorSource({
      features: deliveryPointFeatures,
    }),
    variables: {
      jobOnly: false,
    },
    style: {
      'circle-opacity': [
        'case',
        ['var', 'jobOnly'],
        ['match', ['>', ['get', 'jobs'], 0], true, 1, 0],
        1,
      ],
      'circle-radius': 6,
      'circle-fill-color': [
        'case',
        ['==', ['get', 'hover'], 1],
        ['match', ['get', 'jobs'], 1, colorOrange300, colorYellow300],
        ['==', ['get', 'selected'], 1],
        ['case', ['>', ['get', 'jobs'], 0], colorOrange600, colorYellow600],
        ['case', ['>', ['get', 'jobs'], 0], colorOrange500, colorYellow500],
      ],
      'circle-stroke-color': [
        'match',
        ['get', 'jobs'],
        1,
        ['match', ['get', 'selected'], 1, colorGreen500, colorGreen600],
        2,
        ['match', ['get', 'selected'], 1, colorBlue500, colorBlue600],
        ['match', ['get', 'selected'], 1, colorWhite, colorYellow950],
      ],
      'circle-stroke-width': ['case', ['>', ['get', 'jobs'], 0], 2, 1],
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  const residentPointFeatures = residentPoint.map(
    (point) =>
      new Feature({
        geometry: new Point(reProjectPoint([point.coord.x, point.coord.y])),
        pointType: PointType.Delivery,
        info: point,
      }),
  );

  const residentPointLayer = new WebGLVectorLayer({
    source: new VectorSource({
      features: residentPointFeatures,
    }),
    minZoom: 5,
    variables: {
      jobOnly: false,
    },
    style: {
      'circle-opacity': [
        'case',
        ['var', 'jobOnly'],
        ['match', ['>', ['get', 'jobs'], 0], true, 1, 0],
        1,
      ],
      'circle-radius': 5,
      'circle-fill-color': [
        'case',
        ['==', ['get', 'hover'], 1],
        ['match', ['get', 'jobs'], 1, colorOrange300, colorAmber200],
        ['==', ['get', 'selected'], 1],
        ['case', ['>', ['get', 'jobs'], 0], colorOrange600, colorAmber400],
        ['case', ['>', ['get', 'jobs'], 0], colorOrange500, colorAmber300],
      ],
      'circle-stroke-color': [
        'match',
        ['get', 'jobs'],
        1,
        ['match', ['get', 'selected'], 1, colorGreen500, colorGreen600],
        2,
        ['match', ['get', 'selected'], 1, colorBlue500, colorBlue600],
        ['match', ['get', 'selected'], 1, colorWhite, colorAmber950],
      ],
      'circle-stroke-width': ['case', ['>', ['get', 'jobs'], 0], 2, 1],
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  const houseFeatures = houses.map(
    (point) =>
      new Feature({
        geometry: new Point(reProjectPoint([point.coord.x, point.coord.y])),
        pointType: PointType.House,
        info: point,
      }),
  );

  const houseSource = new VectorSource({
    features: houseFeatures,
  });

  const houseLayer = new WebGLVectorLayer({
    source: houseSource,
    variables: {
      houseVacantOnly: false,
    },
    style: {
      'circle-opacity': [
        'case',
        ['var', 'houseVacantOnly'],
        ['match', ['>', ['get', 'jobs'], 0], true, 1, 0],
        1,
      ],
      'circle-radius': 6,
      'circle-fill-color': [
        'case',
        ['==', ['get', 'hover'], 1],
        colorCyan300,
        ['==', ['get', 'selected'], 1],
        colorCyan600,
        colorCyan500,
      ],
      'circle-stroke-color': ['match', ['get', 'selected'], 1, colorWhite, colorCyan950],
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

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
      if (mapState.houseVacantOnly && !feature.get('vacant')) return [];
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
    visible: false,
    style: (feature) => {
      TeleportLabelsStyle.getText()?.setText(feature.get('label') as string);
      return TeleportLabelsStyle;
    },
  });

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
      shortcutZoneStyle
        .getText()
        ?.setText(mapState.shortcutZoneLabels ? (feature.get('name') as string) : '');
      return shortcutZoneStyle;
    },
  });

  const playerCollection = new Collection<Feature<Point>>();

  const playerPointSource = new VectorSource({
    features: playerCollection,
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
        // ['==', ['get', 'role'], PlayerRoles.Police],
        // colorBlue500,
        // ['==', ['get', 'role'], PlayerRoles.Criminal],
        // colorRed500,
        colorEmerald400,
      ],
      'circle-stroke-color': [
        'case',
        ['==', ['get', 'selected'], 1],
        colorWhite,
        // ['==', ['get', 'role'], PlayerRoles.Police],
        // colorBlue950,
        // ['==', ['get', 'role'], PlayerRoles.Criminal],
        // colorRed950,
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

  $effect(() => {
    if (deliveryLineData) {
      const {
        point: { x, y },
        demand,
        supply,
        dropPoint,
      } = deliveryLineData;

      deliveryLineFeaturesCollection.extend([
        ...demand.map((d) => {
          return new Feature({
            geometry: new LineString([
              reProjectPoint([x, y]),
              reProjectPoint([d.coord.x, d.coord.y]),
            ]),
            type: DeliveryLineType.Demand,
          });
        }),
        ...supply.map((d) => {
          return new Feature({
            geometry: new LineString([
              reProjectPoint([x, y]),
              reProjectPoint([d.coord.x, d.coord.y]),
            ]),
            type: DeliveryLineType.Supply,
          });
        }),
        ...dropPoint.map(([d1, d2]) => {
          return new Feature({
            geometry: new LineString([
              reProjectPoint([d1.coord.x, d1.coord.y]),
              reProjectPoint([d2.coord.x, d2.coord.y]),
            ]),
            type: DeliveryLineType.Drop,
          });
        }),
      ]);
    }

    return () => {
      deliveryLineFeaturesCollection.clear();
    };
  });

  $effect(() => {
    deliveryPointLayer.setVisible(mapState.delivery);
    residentPointLayer.setVisible(mapState.delivery);
    deliveryLineLayer.setVisible(mapState.delivery);
  });

  $effect(() => {
    houseLayer.setVisible(mapState.house);
  });

  $effect(() => {
    playerPointLayer.setVisible(mapState.player);
    playerNameLayer.setVisible(mapState.player);
  });

  $effect(() => {
    playerNameLayer.setVisible(mapState.player && mapState.playerName);
  });

  $effect(() => {
    teleportLayer.setVisible(mapState.teleport);
    teleportLabelsLayer.setVisible(mapState.teleport);
  });

  $effect(() => {
    teleportLabelsLayer.setVisible(mapState.teleport && mapState.teleportLabels);
  });

  $effect(() => {
    shortcutZoneLayer.setVisible(mapState.shortcutZone);
  });

  $effect(() => {
    houseNameLayer.setVisible(mapState.house && mapState.houseLabels);
  });

  $effect(() => {
    for (const d of deliveryPointFeatures) {
      const info = d.get('info') as DeliveryPoint;
      const matchSourceJob = jobsData.some(getMatchJobSourceFn(info));
      const matchDestJob = jobsData.some(getMatchJobDestFn(info));
      d.set('jobs', matchSourceJob ? 1 : matchDestJob ? 2 : 0);
    }
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
    void mapState.jobOnly;
    deliveryPointLayer.updateStyleVariables({
      jobOnly: mapState.jobOnly,
    });
    residentPointLayer.updateStyleVariables({
      jobOnly: mapState.jobOnly,
    });
  });

  $effect(() => {
    houseLayer.updateStyleVariables({
      houseVacantOnly: mapState.houseVacantOnly,
    });
    houseNameLayer.changed();
  });

  $effect(() => {
    void mapState.shortcutZoneLabels;
    shortcutZoneLayer.changed();
  });

  $effect(() => {
    // Remove excess features from the end
    while (playerCollection.getLength() > playerData.length) {
      playerCollection.pop();
    }

    // Update existing and add new features
    for (let i = 0; i < playerData.length; i++) {
      const pd = playerData[i];
      if (i < playerCollection.getLength()) {
        const feature = playerCollection.item(i);
        feature.getGeometry()?.setCoordinates(pd.geometry);
        feature.set('info', pd);
      } else {
        playerCollection.push(
          new Feature<Point>({
            geometry: new Point(pd.geometry),
            pointType: PointType.Player,
            info: pd,
          }),
        );
      }
    }
  });

  $effect(() => {
    teleportSource.addFeatures(
      teleportData.map(
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
  });

  $effect(() => {
    shortcutZoneSource.addFeatures(
      shortcutZoneData.map(
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
  });

  let lastPixel: Pixel | undefined;
  let hoverFeature = $state<Feature | undefined>();

  const handlePointerMove = (e: MapBrowserEvent) => {
    hoverFeature?.set('hover', false);
    hoverFeature = undefined;

    lastPixel = e.pixel;
    e.map.forEachFeatureAtPixel(
      e.pixel,
      (feature) => {
        onHover?.(feature as Feature, e.pixel as [number, number]);
        hoverFeature = feature as Feature;
        hoverFeature.set('hover', true);
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
        hitTolerance: 50,
      },
    );
    // false positive
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!hoverFeature) {
      onHover?.(undefined, [-1,-1]);
    }
  };

  const handleMoveStart = () => {
    hoverFeature?.set('hover', false);
    hoverFeature = undefined;
  };

  const handleMoveEnd = (e: MapEvent) => {
    if (lastPixel) {
      e.map.forEachFeatureAtPixel(
        lastPixel,
        (feature) => {
          onHover?.(feature as Feature, lastPixel as [number, number]);
          hoverFeature = feature as Feature;
          hoverFeature.set('hover', true);
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
          hitTolerance: 50,
        },
      );
      if (!hoverFeature) {
        onHover?.(undefined, [-1,-1]);
      }
    }
  };

  const handleClick = () => {
    if (hoverFeature) {
      onClick?.(hoverFeature);
    }
  };

  const handleRightClick = () => {
    if (hoverFeature) {
      onRightClick?.(hoverFeature);
    }
  };
</script>

<OlMap
  {layers}
  class="h-full w-full"
  onPointerMove={handlePointerMove}
  onClick={handleClick}
  onRightClick={handleRightClick}
  onMoveStart={handleMoveStart}
  onMoveEnd={handleMoveEnd}
  {pipActive}
  onEnterPip={enterPip}
  bind:this={map}
/>
