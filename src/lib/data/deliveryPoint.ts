import deliveryPointJson from '$lib/assets/data/out_delivery_point.json';
import type { MtNameRecord, Vector3 } from '$lib/types';
import { uniq } from 'lodash-es';
import type { DeliveryCargo, DeliveryCargoKey, DeliveryPointType } from './types';
import residentName from '$lib/assets/data/resident_name.json';
import { flattenCargoType } from '$lib/utils/delivery';

export interface DeliveryPointJson {
  type: DeliveryPointType;
  name: MtNameRecord;
  coord: Vector3;
  guid: string;
  prod?: ProductionConfig[];
  /** storage number is maxStorage */
  demandStorage: Record<DeliveryCargo, number>;
  supplyStorage: Record<DeliveryCargo, number>;
  /** demand number is paymentMultiplier */
  demand?: Record<DeliveryCargo, number>;
  dropPoint?: string[];
  maxDist?: number;
  maxReceiveDist?: number;
}

export interface ProductionConfig {
  input?: Record<DeliveryCargo, number>;
  output?: Record<DeliveryCargo, number>;
  prodTime: number;
  prodSpeedMul: number;
  foodSupply?: number;
}

export interface DeliveryPoint extends DeliveryPointJson {
  allSupply: DeliveryCargo[];
  allDemand: DeliveryCargo[];
  allSupplyKey: DeliveryCargoKey[];
  allDemandKey: DeliveryCargoKey[];
  parent?: string;
}

const supplyMap = new Map<DeliveryCargo, string[]>();
const demandMap = new Map<DeliveryCargo, string[]>();
const demandMapNoResident = new Map<DeliveryCargo, string[]>();

const supplyKeyMap = new Map<DeliveryCargoKey, string[]>();
const demandKeyMap = new Map<DeliveryCargoKey, string[]>();
const demandKeyMapNoResident = new Map<DeliveryCargoKey, string[]>();

const deliveryPointsMap = new Map<string, DeliveryPoint>();

const deliveryPoints = (deliveryPointJson as unknown as DeliveryPointJson[]).map((dp) => {
  const allSupply = uniq(
    dp.prod?.flatMap((p) => Object.keys(p.output || {})) || [],
  ).sort() as DeliveryCargo[];
  const allDemand = uniq(
    (dp.prod?.flatMap((p) => Object.keys(p.input || {})) || []).concat(
      dp.demand ? Object.keys(dp.demand) : [],
    ),
  ).sort() as DeliveryCargo[];

  for (const supply of allSupply) {
    if (!supplyMap.has(supply)) {
      supplyMap.set(supply, []);
    }
    supplyMap.get(supply)?.push(dp.guid);
  }

  for (const demand of allDemand) {
    if (!demandMap.has(demand)) {
      demandMap.set(demand, []);
    }
    demandMap.get(demand)?.push(dp.guid);
    if (dp.type !== 'Resident_C') {
      if (!demandMapNoResident.has(demand)) {
        demandMapNoResident.set(demand, []);
      }
      demandMapNoResident.get(demand)?.push(dp.guid);
    }
  }

  const allSupplyKey = allSupply.flatMap((s) => flattenCargoType(s));

  const allDemandKey = allDemand.flatMap((s) => flattenCargoType(s));

  for (const supply of allSupplyKey) {
    if (!supplyKeyMap.has(supply)) {
      supplyKeyMap.set(supply, []);
    }
    supplyKeyMap.get(supply)?.push(dp.guid);
  }

  for (const demand of allDemandKey) {
    if (!demandKeyMap.has(demand)) {
      demandKeyMap.set(demand, []);
    }
    demandKeyMap.get(demand)?.push(dp.guid);
    if (dp.type !== 'Resident_C') {
      if (!demandKeyMapNoResident.has(demand)) {
        demandKeyMapNoResident.set(demand, []);
      }
      demandKeyMapNoResident.get(demand)?.push(dp.guid);
    }
  }

  const point = {
    ...dp,
    name: dp.type === 'Resident_C' ? residentName : dp.name,
    allSupply,
    allDemand,
    allSupplyKey,
    allDemandKey,
  };

  deliveryPointsMap.set(dp.guid, point);

  return point;
});

for (const dp of deliveryPoints) {
  if (dp.dropPoint) {
    for (const dropPointGuid of dp.dropPoint) {
      const dropPoint = deliveryPointsMap.get(dropPointGuid);
      if (dropPoint) {
        dropPoint.parent = dp.guid;

        for (const dropPointDemand of dropPoint.allDemand) {
          const demand = demandMap.get(dropPointDemand);
          if (demand) {
            const newDemand = demand.filter((d) => d !== dp.guid);
            demandMap.set(dropPointDemand, newDemand);
          }
        }
      }
    }
  }
}

export {
  supplyMap,
  demandMap,
  deliveryPointsMap,
  deliveryPoints,
  demandMapNoResident,
  supplyKeyMap,
  demandKeyMap,
  demandKeyMapNoResident,
};
