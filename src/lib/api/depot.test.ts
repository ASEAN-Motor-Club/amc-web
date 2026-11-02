import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { DEPOT_SEVERE_STORAGE, depotQueryOptions, hasSevereDepot, isDepotSevere } from './depot.ts';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

const SANHO_KEY = 'Sanho_01';
const GAPA_KEY = 'Gapa_02';

/** Response order is deliberately worst-last so the grouping sort is exercised. */
const depotResponse = [
  {
    guid: 'guid-full',
    name: 'Ryza Motorworks',
    storage: 1,
    taxiDispatchLevel: 0,
    owner: SANHO_KEY,
  },
  {
    guid: 'guid-empty',
    name: 'FreyCo Depot',
    storage: 0.0064,
    taxiDispatchLevel: 2,
    owner: GAPA_KEY,
  },
  {
    guid: 'guid-mid',
    name: 'Kaifeng',
    storage: 0.25,
    taxiDispatchLevel: 0,
    owner: SANHO_KEY,
  },
  {
    guid: 'guid-orphan',
    name: 'Depot',
    storage: 0.5,
    taxiDispatchLevel: 0,
    owner: null,
  },
];

describe('depot query options', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  let queryClient: QueryClient;

  beforeEach(() => {
    global.fetch = mockFetch;
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('requests the depot endpoint with owner mapping enabled', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.fetchQuery(depotQueryOptions()());

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/api/depots/');
    expect(url).toContain('owner=true');
  });

  it('groups depots under their housing key, dropping unmapped depots', async () => {
    mockFetch.mockResolvedValue(jsonResponse(depotResponse));

    const depots = await queryClient.fetchQuery(depotQueryOptions()());

    expect(Object.keys(depots).sort()).toEqual([GAPA_KEY, SANHO_KEY].sort());
    expect(depots[SANHO_KEY].map((depot) => depot.name)).toEqual(['Kaifeng', 'Ryza Motorworks']);
    expect(depots[GAPA_KEY].map((depot) => depot.guid)).toEqual(['guid-empty']);
    expect(depots['guid-orphan']).toBeUndefined();
  });

  it('sorts each house worst storage first and drops the owner field', async () => {
    mockFetch.mockResolvedValue(jsonResponse(depotResponse));

    const depots = await queryClient.fetchQuery(depotQueryOptions()());

    expect(depots[SANHO_KEY].map((depot) => depot.storage)).toEqual([0.25, 1]);
    expect(depots[SANHO_KEY][0]).toEqual({
      guid: 'guid-mid',
      name: 'Kaifeng',
      storage: 0.25,
      taxiDispatchLevel: 0,
    });
  });

  it('yields an empty map for an empty response', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    const depots = await queryClient.fetchQuery(depotQueryOptions()());

    expect(depots).toEqual({});
  });
});

describe('depot severity', () => {
  const depot = (storage: number) => ({ guid: 'g', name: 'Depot', storage, taxiDispatchLevel: 0 });

  it('marks a depot severe below the threshold', () => {
    expect(isDepotSevere(depot(DEPOT_SEVERE_STORAGE - 0.001))).toBe(true);
    expect(isDepotSevere(depot(0.002))).toBe(true);
  });

  it('leaves a depot at or above the threshold alone', () => {
    expect(isDepotSevere(depot(DEPOT_SEVERE_STORAGE))).toBe(false);
    expect(isDepotSevere(depot(1))).toBe(false);
  });

  it('reports a house severe when any of its depots is', () => {
    expect(hasSevereDepot([depot(1), depot(0.01)])).toBe(true);
    expect(hasSevereDepot([depot(1), depot(0.5)])).toBe(false);
    expect(hasSevereDepot([])).toBe(false);
    expect(hasSevereDepot(undefined)).toBe(false);
  });
});
