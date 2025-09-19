import { reProjectPoint } from '$lib/ui/OlMap/utils';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import WebGLVectorLayer from 'ol/layer/WebGLVector';
import VectorSource from 'ol/source/Vector';
import { PointType } from './types';
import {
  colorAmber100,
  colorAmber300,
  colorCyan300,
  colorCyan500,
  colorYellow300,
  colorYellow500,
} from '$lib/tw-var';
import { deliveryPoints, type DeliveryPoint } from '$lib/data/deliveryPoint';
import { houses } from '$lib/data/house';

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

export const deliveryPointLayer = new WebGLVectorLayer({
  source: new VectorSource({
    features: deliPoint.map(
      (point) =>
        new Feature({
          geometry: new Point(reProjectPoint([point.coord.x, point.coord.y])),
          pointType: PointType.Delivery,
          info: point,
        }),
    ),
  }),
  style: {
    'circle-radius': 6,
    'circle-fill-color': ['match', ['get', 'hover'], 1, colorYellow300, colorYellow500],
    'circle-stroke-color': 'black',
    'circle-stroke-width': 1,
    'circle-rotate-with-view': false,
    'circle-displacement': [0, 0],
  },
});

export const residentPointLayer = new WebGLVectorLayer({
  source: new VectorSource({
    features: residentPoint.map(
      (point) =>
        new Feature({
          geometry: new Point(reProjectPoint([point.coord.x, point.coord.y])),
          pointType: PointType.Delivery,
          info: point,
        }),
    ),
  }),
  minZoom: 4,
  style: {
    'circle-radius': 5,
    'circle-fill-color': ['match', ['get', 'hover'], 1, colorAmber100, colorAmber300],
    'circle-stroke-color': 'black',
    'circle-stroke-width': 1,
    'circle-rotate-with-view': false,
    'circle-displacement': [0, 0],
  },
});

export const houseLayer = new WebGLVectorLayer({
  source: new VectorSource({
    features: houses.map(
      (point) =>
        new Feature({
          geometry: new Point(reProjectPoint([point.coord.x, point.coord.y])),
          pointType: PointType.House,
          info: point,
        }),
    ),
  }),
  style: {
    'circle-radius': 6,
    'circle-fill-color': ['match', ['get', 'hover'], 1, colorCyan300, colorCyan500],
    'circle-stroke-color': 'black',
    'circle-stroke-width': 1,
    'circle-rotate-with-view': false,
    'circle-displacement': [0, 0],
  },
});
