import type { DeliveryJob } from '$lib/api/types';
import { cargoMetadata, type CargoMetadata } from '$lib/data/cargo';
import {
  deliveryPointsMap,
  demandKeyMapNoResident,
  supplyKeyMap,
  type DeliveryPoint,
} from '$lib/data/deliveryPoint';
import type { Vector2 } from '$lib/types';
import { getMatchJobDestFn, getMatchJobSourceFn } from '$lib/utils/delivery';
import { uniq } from 'es-toolkit';

/** An ordered pair of points, drawn as one line running from the first to the second. */
export type DeliveryLink = [from: DeliveryPoint, to: DeliveryPoint];

export interface DeliveryLineData {
  /** Coordinates of the point the lines were built for, where every demand and supply line ends. */
  point: Vector2;
  /** Points supplying this one; every line runs from them to {@link DeliveryLineData.point}. */
  demand: DeliveryPoint[];
  /** Points this one supplies; every line runs from {@link DeliveryLineData.point} to them. */
  supply: DeliveryPoint[];
  /** Always drop point to parent, the direction the cargo travels. */
  dropPoint: DeliveryLink[];
}

const getDeliveryPoint = (guid: string) => {
  const point = deliveryPointsMap.get(guid);
  if (!point) {
    throw new Error(`Delivery point not found: ${guid}`);
  }
  return point;
};

/** Cargo only moves when its own range and both ends' distance limits allow the trip. */
const isInDeliveryRange = (
  cargo: CargoMetadata,
  source: DeliveryPoint,
  destination: DeliveryPoint,
) => {
  if (!cargo.minDist && !cargo.maxDist && !source.maxDist && !destination.maxReceiveDist) {
    return true;
  }

  const dist = Math.hypot(
    destination.coord.x - source.coord.x,
    destination.coord.y - source.coord.y,
  );

  if (cargo.minDist && dist < cargo.minDist) {
    return false;
  }
  if (cargo.maxDist && dist > cargo.maxDist) {
    return false;
  }
  if (source.maxDist && dist > source.maxDist) {
    return false;
  }
  if (destination.maxReceiveDist && dist > destination.maxReceiveDist) {
    return false;
  }
  return true;
};

/**
 * Builds every line to draw around one delivery point: what it ships out, what comes in, and how
 * drop points hang off either end.
 *
 * @param deliveryPoint The point to build the lines for
 * @param jobsData Delivery jobs currently on offer, used to resolve `jobOnly`
 * @param jobOnly Keep only the connections an active job covers
 * @returns The lines, or `undefined` when `jobOnly` filters the point out entirely
 */
export const getDeliveryLine = (
  deliveryPoint: DeliveryPoint,
  jobsData: DeliveryJob[],
  jobOnly: boolean,
): DeliveryLineData | undefined => {
  const matchSourceJob = jobsData.filter(getMatchJobSourceFn(deliveryPoint));
  const matchDestJob = jobsData.filter(getMatchJobDestFn(deliveryPoint));

  if (jobOnly && matchSourceJob.length === 0 && matchDestJob.length === 0) {
    return;
  }

  // Cargo is dropped off at the drop point and reaches the parent from there, so a drop link
  // always runs drop point -> parent, whichever end of it is selected.
  const allDropPointLink: DeliveryLink[] = [];

  if (deliveryPoint.parent) {
    allDropPointLink.push([deliveryPoint, getDeliveryPoint(deliveryPoint.parent)]);
  }

  const dropPoints = deliveryPoint.dropPoint?.map(getDeliveryPoint) ?? [];

  for (const dropPoint of dropPoints) {
    allDropPointLink.push([dropPoint, deliveryPoint]);
  }

  const allSupplyDestinations = uniq(
    deliveryPoint.allSupplyKey
      .map((d) => [d, cargoMetadata[d], demandKeyMapNoResident.get(d) ?? []] as const)
      .flatMap(([d, cd, dps]) =>
        dps.map((dp) => {
          const point = getDeliveryPoint(dp);
          if (jobOnly) {
            const hasDestJob = matchSourceJob.some(getMatchJobDestFn(point));
            if (!hasDestJob) {
              return undefined;
            }
          }
          // Cargo a drop point takes is delivered there instead, and that drop point is already
          // in this list in its own right, so the parent would only duplicate the line.
          if (point.dropPoint) {
            const hasConnectedDrop = point.dropPoint.some((dropPointGuid) =>
              deliveryPointsMap.get(dropPointGuid)?.allDemandKey.includes(d),
            );
            if (hasConnectedDrop) {
              return undefined;
            }
          }
          if (!isInDeliveryRange(cd, deliveryPoint, point)) {
            return undefined;
          }
          if (point.parent) {
            allDropPointLink.push([point, getDeliveryPoint(point.parent)]);
          }
          return point;
        }),
      )
      .filter((d) => d !== undefined),
  );

  const allDemandSources = uniq(
    deliveryPoint.allDemandKey
      // Cargo one of the drop points takes is delivered there rather than here, and the drop
      // point draws that traffic itself, so this point shows no line for it.
      .filter((d) => !dropPoints.some((dropPoint) => dropPoint.allDemandKey.includes(d)))
      .map((d) => [cargoMetadata[d], supplyKeyMap.get(d) ?? []] as const)
      .flatMap(([cd, dps]) =>
        dps.map((dp) => {
          const point = getDeliveryPoint(dp);
          if (jobOnly) {
            const hasSourceJob = matchDestJob.some(getMatchJobSourceFn(point));
            if (!hasSourceJob) {
              return undefined;
            }
          }
          if (!isInDeliveryRange(cd, point, deliveryPoint)) {
            return undefined;
          }
          if (point.dropPoint) {
            for (const dropPointGuid of point.dropPoint) {
              allDropPointLink.push([getDeliveryPoint(dropPointGuid), point]);
            }
          }
          return point;
        }),
      )
      .filter((d) => d !== undefined),
  );

  return {
    point: {
      x: deliveryPoint.coord.x,
      y: deliveryPoint.coord.y,
    },
    demand: allDemandSources,
    supply: allSupplyDestinations,
    dropPoint: allDropPointLink,
  };
};
