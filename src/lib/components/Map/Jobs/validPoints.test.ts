import { describe, expect, it } from 'vitest';
import type { DeliveryJob } from '$lib/api/types';
import { deliveryPoints } from '$lib/data/deliveryPoint';
import { getJobValidPoints } from './validPoints';

const baseJob: DeliveryJob = {
  cargos: [],
  source_points: [],
  destination_points: [],
  deliveries: [],
  id: 1,
  name: 'Test job',
  quantity_requested: 10,
  quantity_fulfilled: 0,
  requested_at: '2026-01-01T00:00:00Z',
  fulfilled_at: null,
  expired_at: '2026-01-02T00:00:00Z',
  bonus_multiplier: 1,
  completion_bonus: 1000,
  description: '',
  fulfilled: false,
};

/** Fixtures come from the bundled map export so the filter is exercised against real point data. */
const [supplier] = deliveryPoints.filter((point) => point.allSupplyKey.length > 0);
const [consumer] = deliveryPoints.filter((point) => point.allDemandKey.length > 0);
const supplyCargo = supplier.allSupplyKey[0];
const demandCargo = consumer.allDemandKey[0];
const [nonSupplier] = deliveryPoints.filter((point) => !point.allSupplyKey.includes(supplyCargo));
const [nonConsumer] = deliveryPoints.filter((point) => !point.allDemandKey.includes(demandCargo));

describe('getJobValidPoints', () => {
  it('takes every point handling the cargo when the job restricts nothing', () => {
    const { supply } = getJobValidPoints({ ...baseJob, cargos: [supplyCargo] });

    // More than one candidate, so the allowlist cases below cannot pass by coincidence.
    expect(supply.length).toBeGreaterThan(1);
    expect(supply.map((point) => point.guid)).toEqual(
      deliveryPoints
        .filter((point) => point.allSupplyKey.includes(supplyCargo))
        .map((point) => point.guid),
    );
  });

  it('narrows pickups to the allowlist, dropping entries that cannot supply the cargo', () => {
    const { supply } = getJobValidPoints({
      ...baseJob,
      cargos: [supplyCargo],
      source_points: [supplier.guid, nonSupplier.guid],
    });

    expect(supply.map((point) => point.guid)).toEqual([supplier.guid]);
  });

  it('narrows dropoffs to the allowlist, dropping entries that cannot take the cargo', () => {
    const { demand } = getJobValidPoints({
      ...baseJob,
      cargos: [demandCargo],
      destination_points: [consumer.guid, nonConsumer.guid],
    });

    expect(getJobValidPoints({ ...baseJob, cargos: [demandCargo] }).demand.length).toBeGreaterThan(
      1,
    );
    expect(demand.map((point) => point.guid)).toEqual([consumer.guid]);
  });
});
