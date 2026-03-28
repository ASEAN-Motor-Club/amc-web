import { reProjectPoint } from '$lib/ui/OlMap/utils';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import WebGLVectorLayer from 'ol/layer/WebGLVector';
import VectorSource from 'ol/source/Vector';
import { PointType } from './types';
import {
  colorAmber200,
  colorAmber300,
  colorAmber400,
  colorBlue500,
  colorBlue600,
  colorCyan300,
  colorCyan500,
  colorCyan600,
  colorGreen500,
  colorGreen600,
  colorOrange300,
  colorOrange500,
  colorOrange600,
  colorWhite,
  colorYellow300,
  colorYellow500,
  colorYellow600,
  colorYellow950,
  colorAmber950,
  colorCyan950,
} from '$lib/tw-var';
import { deliveryPoints, type DeliveryPoint } from '$lib/data/deliveryPoint';
import { houses } from '$lib/data/house';

export const getDeliveryPointStyle = (jobOnly?: boolean) => ({
  'circle-opacity': jobOnly ? ['match', ['>', ['get', 'jobs'], 0], true, 1, 0] : 1,
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
});

export const getResidentPointStyle = (jobOnly?: boolean) => ({
  'circle-opacity': jobOnly ? ['match', ['>', ['get', 'jobs'], 0], true, 1, 0] : 1,
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
});

export const getHouseStyle = (vacantOnly?: boolean) => ({
  'circle-opacity': vacantOnly ? ['match', ['get', 'vacant'], 1, 1, 0] : 1,
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
});

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
    style: getDeliveryPointStyle(),
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
    style: getResidentPointStyle(),
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
    style: getHouseStyle(),
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
