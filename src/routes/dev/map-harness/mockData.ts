import type { DeliveryJob, DepotData, HouseData } from '#lib/api/types.ts';
import type { ShortcutZone } from '#lib/api/shortcutZone.ts';
import { PointType, type PlayerData, type TeleportPoint } from '#lib/components/Map/Map/types.ts';
import { deliveryPoints } from '#lib/data/deliveryPoint.ts';
import { houses } from '#lib/data/house.ts';
import type { Pins } from '#lib/schema/pin.ts';
import { reProjectVec2 } from '#lib/utils/mapProjection.ts';

/** Small deterministic PRNG (mulberry32) so every run draws the same map. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Delivery point index the parity scenes centre on: a dense area (houses, deliveries, residents). */
export const PARITY_ANCHOR_INDEX = 1;

export interface ParityMockData {
  jobsData: DeliveryJob[];
  playerData: PlayerData[];
  houseData: HouseData;
  depotData: DepotData;
  pinsData: Pins;
  teleportData: TeleportPoint[];
  shortcutZoneData: ShortcutZone[];
}

const CM = 100;

/**
 * Fixed-seed stand-in for the live API: players, jobs, house owners, pins, teleports and
 * shortcut zones scattered around the real delivery points, so screenshots are reproducible.
 */
export function createParityMock(seed = 1): ParityMockData {
  const rng = createRng(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)];
  const jitter = (range: number) => (rng() - 0.5) * 2 * range;
  const named = deliveryPoints.filter((p) => p.type !== 'Resident_C');
  const anchor = named[PARITY_ANCHOR_INDEX].coord;
  /** Every other feature clusters at the anchor so each parity zoom has something to compare. */
  const near = (i: number) => (i % 2 === 0 ? anchor : pick(named).coord);

  const playerData: PlayerData[] = Array.from({ length: 60 }, (_, i) => {
    const base = near(i);
    const coord = { x: base.x + jitter(250 * CM), y: base.y + jitter(250 * CM), z: base.z };
    return {
      geometry: reProjectVec2(coord),
      name: `Player ${i + 1}`,
      pointType: PointType.Player as const,
      coord,
      vehicleKey: 'None',
      guid: `parity-player-${i}`,
      hidden: false,
    };
  });

  const jobsData: DeliveryJob[] = Array.from({ length: 24 }, (_, i) => {
    const source = pick(named.filter((p) => p.allSupplyKey.length > 0));
    return {
      cargos: [source.allSupplyKey[0]],
      source_points: [source.guid],
      destination_points: [],
      deliveries: [],
      id: i + 1,
      name: `Job ${i + 1}`,
      quantity_requested: 10,
      quantity_fulfilled: 0,
      requested_at: '2025-01-01T00:00:00Z',
      fulfilled_at: null,
      expired_at: '2999-01-01T00:00:00Z',
      bonus_multiplier: 1,
      completion_bonus: 0,
      description: '',
      fulfilled: false,
    };
  });

  const houseData: HouseData = {};
  const depotData: DepotData = {};
  for (const house of houses) {
    if (rng() < 0.5) {
      houseData[house.name] = {
        housingKey: house.name,
        ownerName: `Owner ${Math.floor(rng() * 1000)}`,
        rentLeft: new Date('2999-01-01T00:00:00Z'),
      };
    }
    if (rng() < 0.15) {
      depotData[house.name] = [
        { guid: `depot-${house.name}`, name: 'Depot', storage: 0.05, taxiDispatchLevel: 0 },
      ];
    }
  }

  const pinsData: Pins = Array.from({ length: 5 }, (_, i) => {
    const base = near(i);
    return { x: base.x + jitter(250 * CM), y: base.y + jitter(250 * CM), label: `Pin ${i + 1}` };
  });

  const teleportData: TeleportPoint[] = Array.from({ length: 12 }, (_, i) => {
    const base = near(i);
    return {
      name: `Teleport ${i + 1}`,
      coord: { x: base.x + jitter(250 * CM), y: base.y + jitter(250 * CM), z: base.z },
    };
  });

  const shortcutZoneData: ShortcutZone[] = Array.from({ length: 4 }, (_, i) => {
    const centre = i === 0 ? anchor : pick(named).coord;
    const sides = 4 + (i % 3);
    const radius = (i === 0 ? 700 : 500 + rng() * 1000) * CM;
    const coordinates: [number, number][] = Array.from({ length: sides }, (_, k) => {
      const angle = (k / sides) * Math.PI * 2 + rng() * 0.4;
      const r = radius * (0.7 + rng() * 0.5);
      return [centre.x + Math.cos(angle) * r, centre.y + Math.sin(angle) * r];
    });
    return { id: i + 1, name: `Shortcut ${i + 1}`, description: '', coordinates };
  });

  return { jobsData, playerData, houseData, depotData, pinsData, teleportData, shortcutZoneData };
}
