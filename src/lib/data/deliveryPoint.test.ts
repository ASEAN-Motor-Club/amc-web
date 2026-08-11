import { describe, expect, it } from 'vitest';
import type { DeliveryCargo, DeliveryCargoKey } from './types';
import {
  demandMap,
  demandKeyMap,
  demandMapNoResident,
  demandKeyMapNoResident,
  deliveryPoints,
  deliveryPointsMap,
  residentName,
  supplyMap,
  supplyKeyMap,
} from './deliveryPoint';

describe('deliveryPoints', () => {
  it('is non-empty and keyed uniquely by guid', () => {
    expect(deliveryPoints.length).toBeGreaterThan(0);
    expect(deliveryPointsMap.size).toBe(deliveryPoints.length);
    const guids = new Set(deliveryPoints.map((dp) => dp.guid));
    expect(guids.size).toBe(deliveryPoints.length);
  });

  it('maps every point by its guid', () => {
    for (const dp of deliveryPoints) {
      expect(deliveryPointsMap.get(dp.guid)).toBe(dp);
    }
  });

  it('gives every point a name with an English entry', () => {
    for (const dp of deliveryPoints) {
      expect(dp.name.en, dp.guid).toBeTruthy();
    }
  });

  it('fills resident points with the shared resident name', () => {
    expect(residentName.en).toBeTruthy();
    for (const dp of deliveryPoints) {
      if (dp.type === 'Resident_C') {
        expect(dp.name, dp.guid).toBe(residentName);
      } else {
        expect(dp.name, dp.guid).not.toBe(residentName);
      }
    }
  });

  it('keeps allSupply and allDemand sorted and unique', () => {
    for (const dp of deliveryPoints) {
      expect([...dp.allSupply].sort()).toEqual(dp.allSupply);
      expect([...dp.allDemand].sort()).toEqual(dp.allDemand);
      expect(new Set(dp.allSupply).size).toBe(dp.allSupply.length);
      expect(new Set(dp.allDemand).size).toBe(dp.allDemand.length);
    }
  });

  it('wires drop points to a point that lists them', () => {
    // A drop point can be shared: the map only keeps the last parent assigned, so
    // assert the parent is one of the points whose dropPoint list includes it.
    const parentsByDropPoint = new Map<string, string[]>();
    for (const dp of deliveryPoints) {
      for (const dropPointGuid of dp.dropPoint ?? []) {
        const parents = parentsByDropPoint.get(dropPointGuid) ?? [];
        parents.push(dp.guid);
        parentsByDropPoint.set(dropPointGuid, parents);
      }
    }
    for (const [dropPointGuid, parents] of parentsByDropPoint) {
      const dropPoint = deliveryPointsMap.get(dropPointGuid);
      expect(dropPoint, dropPointGuid).toBeDefined();
      expect(parents, dropPointGuid).toContain(dropPoint?.parent);
    }
  });
});

describe('cargo maps', () => {
  it('lists every supplier of a cargo in supplyMap', () => {
    for (const dp of deliveryPoints) {
      for (const cargo of dp.allSupply) {
        expect(supplyMap.get(cargo) ?? [], `${dp.guid} supplies ${cargo}`).toContain(dp.guid);
      }
    }
  });

  it('lists every demander of a cargo in demandMap, minus delegated drop-point demand', () => {
    // A point whose drop point also demands a cargo is removed from that cargo's
    // demand list: the drop point handles the demand instead.
    const demandDelegated = (dp: (typeof deliveryPoints)[number], cargo: string): boolean =>
      (dp.dropPoint ?? []).some((dropPointGuid) => {
        const dropPoint = deliveryPointsMap.get(dropPointGuid);
        return dropPoint ? dropPoint.allDemand.includes(cargo as DeliveryCargo) : false;
      });

    for (const dp of deliveryPoints) {
      for (const cargo of dp.allDemand) {
        const expected = !demandDelegated(dp, cargo);
        expect(
          (demandMap.get(cargo) ?? []).includes(dp.guid),
          `${dp.guid} ${expected ? 'should' : 'should not'} demand ${cargo}`,
        ).toBe(expected);
      }
    }
  });

  it('excludes resident points from the no-resident demand maps', () => {
    for (const [cargo, guids] of demandMapNoResident) {
      for (const guid of guids) {
        expect(deliveryPointsMap.get(guid)?.type, `${cargo} ${guid}`).not.toBe('Resident_C');
      }
    }
    for (const [cargo, guids] of demandKeyMapNoResident) {
      for (const guid of guids) {
        expect(deliveryPointsMap.get(guid)?.type, `${cargo} ${guid}`).not.toBe('Resident_C');
      }
    }
  });

  it('covers every flattened cargo key in the key maps', () => {
    for (const dp of deliveryPoints) {
      for (const key of dp.allSupplyKey) {
        expect(supplyKeyMap.get(key) ?? [], `${dp.guid} supplies key ${key}`).toContain(dp.guid);
      }
      for (const key of dp.allDemandKey) {
        expect(demandKeyMap.get(key) ?? [], `${dp.guid} demands key ${key}`).toContain(dp.guid);
      }
    }
  });

  it('flattens every cargo type into its underlying keys', () => {
    const typeKeys = (Object.keys(supplyKeyMap) as unknown[]).filter((k) =>
      (k as DeliveryCargo).startsWith('_T'),
    );
    expect(typeKeys).toHaveLength(0);
    // Cargo types never leak into the key maps — only concrete keys do.
    for (const key of supplyKeyMap.keys() as IterableIterator<DeliveryCargoKey>) {
      expect(key.startsWith('_T')).toBe(false);
    }
  });
});
