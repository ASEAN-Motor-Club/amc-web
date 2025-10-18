import { reProjectPoint } from '$lib/ui/OlMap/utils';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import WebGLVectorLayer from 'ol/layer/WebGLVector';
import VectorSource from 'ol/source/Vector';
import { PointType } from './types';
import {
  colorAmber100,
  colorAmber300,
  colorAmber400,
  colorCyan300,
  colorCyan500,
  colorCyan600,
  colorYellow300,
  colorYellow500,
  colorYellow600,
} from '$lib/tw-var';
import { deliveryPoints, type DeliveryPoint } from '$lib/data/deliveryPoint';
import { houses } from '$lib/data/house';

export function getStaticPoints() {
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
    style: {
      'circle-radius': 6,
      'circle-fill-color': [
        'match',
        ['get', 'hover'],
        1,
        colorYellow300,
        ['match', ['get', 'selected'], 1, colorYellow600, colorYellow500],
      ],
      'circle-stroke-color': ['match', ['get', 'selected'], 1, 'white', 'black'],
      'circle-stroke-width': 1,
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
    minZoom: 4,
    style: {
      'circle-radius': 5,
      'circle-fill-color': [
        'match',
        ['get', 'hover'],
        1,
        colorAmber100,
        ['match', ['get', 'selected'], 1, colorAmber400, colorAmber300],
      ],
      'circle-stroke-color': ['match', ['get', 'selected'], 1, 'white', 'black'],
      'circle-stroke-width': 1,
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

  const houseLayer = new WebGLVectorLayer({
    source: new VectorSource({
      features: houseFeatures,
    }),
    style: {
      'circle-radius': 6,
      'circle-fill-color': [
        'match',
        ['get', 'hover'],
        1,
        colorCyan300,
        ['match', ['get', 'selected'], 1, colorCyan600, colorCyan500],
      ],
      'circle-stroke-color': ['match', ['get', 'selected'], 1, 'white', 'black'],
      'circle-stroke-width': 1,
      'circle-rotate-with-view': false,
      'circle-displacement': [0, 0],
    },
  });

  return {
    deliveryPointFeatures,
    residentPointFeatures,
    houseFeatures,
    deliveryPointLayer,
    residentPointLayer,
    houseLayer,
  };
}
