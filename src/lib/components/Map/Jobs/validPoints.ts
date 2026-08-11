import type { DeliveryJob } from '$lib/api/types';
import { deliveryPoints, type DeliveryPoint } from '$lib/data/deliveryPoint';
import { getMatchJobDestFn, getMatchJobSourceFn } from '$lib/utils/delivery';

export interface JobValidPoints {
  /** Points that stock the job's cargo and clear its pickup allowlist. */
  supply: DeliveryPoint[];
  /** Points that want the job's cargo and clear its dropoff allowlist. */
  demand: DeliveryPoint[];
}

/**
 * A job's `source_points` / `destination_points` are allowlists that still contain points unable
 * to handle the cargo, so the set worth showing a driver is always the filtered one. An empty
 * allowlist constrains nothing and every delivery point handling the cargo qualifies.
 */
export const getJobValidPoints = (job: DeliveryJob): JobValidPoints => {
  const supply: DeliveryPoint[] = [];
  const demand: DeliveryPoint[] = [];

  for (const point of deliveryPoints) {
    if (getMatchJobSourceFn(point)(job)) {
      supply.push(point);
    }
    if (getMatchJobDestFn(point)(job)) {
      demand.push(point);
    }
  }

  return { supply, demand };
};
