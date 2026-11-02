import { PUBLIC_API_BASE } from '$app/env/public';
import { createQuery, queryOptions } from '@tanstack/svelte-query';
import type { Depot, DepotData } from '#lib/api/types.ts';
import { apiClient, type QueryOverrides, type QueryParam } from './_api.ts';

/** A house depot counts as severe below this fraction of storage left (10%). */
export const DEPOT_SEVERE_STORAGE = 0.1;

/** True when the depot is nearly out of stock - the map outlines these houses in red. */
export const isDepotSevere = (depot: Depot) => depot.storage < DEPOT_SEVERE_STORAGE;

/** Storage left as a 0-100 percentage with one decimal (0.2, 8.5, 100). */
export const depotStorageLeftPercent = (depot: Depot) => Math.round(depot.storage * 1000) / 10;

/** True when any depot attached to the house is nearly out of stock. */
export const hasSevereDepot = (depots: Depot[] | undefined) =>
  !!depots?.some((depot) => isDepotSevere(depot));

/**
 * Storage moves whenever cargo is delivered, so it is polled. The owner mapping does not: depots
 * are not built or destroyed inside a session, so that half is fetched once and kept.
 */
const DEPOT_POLL_INTERVAL_MS = 30_000;

/** Depots carry their building guid; `owner` is the housing key only with `?owner=true`. */
interface DepotApiItem {
  guid: string;
  name: string;
  storage: number;
  taxiDispatchLevel: number;
  /** Housing key - present only on the `?owner=true` response. */
  owner?: string | null;
}

type GetDepotDataResponse = DepotApiItem[];

export interface DepotQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<DepotData>;
}

export interface DepotStorageQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<GetDepotDataResponse>;
}

const toDepot = (item: DepotApiItem): Depot => ({
  guid: item.guid,
  name: item.name,
  storage: item.storage,
  taxiDispatchLevel: item.taxiDispatchLevel,
});

/**
 * Housing key -> depots, worst storage first. Fetched once per session: the guid -> housing key
 * assignment is stable, so only the polling query below carries the live storage.
 * Depots whose building has no housing key are dropped - nothing can attach them to a house.
 */
export const depotOwnersQueryOptions = (input?: QueryParam<DepotQueryInput>) => () =>
  queryOptions({
    queryKey: ['depots', 'owners'],
    queryFn: async ({ signal }): Promise<DepotData> => {
      const data = await apiClient<GetDepotDataResponse>(
        `${PUBLIC_API_BASE}/api/depots/?owner=true`,
        signal,
      );

      const grouped = data.reduce<DepotData>((acc, item) => {
        if (!item.owner) return acc;
        (acc[item.owner] ??= []).push(toDepot(item));
        return acc;
      }, {});

      for (const depots of Object.values(grouped)) {
        depots.sort((a, b) => a.storage - b.storage);
      }

      return grouped;
    },
    staleTime: Number.POSITIVE_INFINITY,
    ...input?.().options,
  });

/** Live storage for every depot, polled. Keyless on purpose - the owner mapping is not needed. */
export const depotStorageQueryOptions = (input?: QueryParam<DepotStorageQueryInput>) => () =>
  queryOptions({
    queryKey: ['depots', 'storage'],
    queryFn: ({ signal }) =>
      apiClient<GetDepotDataResponse>(`${PUBLIC_API_BASE}/api/depots/`, signal),
    refetchInterval: DEPOT_POLL_INTERVAL_MS,
    staleTime: DEPOT_POLL_INTERVAL_MS,
    ...input?.().options,
  });

/**
 * Swap the polled storage onto the owner mapping, matching by building guid.
 *
 * A depot the poll has not reported (first load, or a failed poll) keeps its last known storage
 * rather than vanishing, and each house is re-sorted worst storage first.
 */
export const mergeDepotStorage = (
  owned: DepotData | undefined,
  polled: GetDepotDataResponse | undefined,
): DepotData | undefined => {
  if (!owned || !polled) return owned;

  const storageByGuid = new Map(polled.map((item) => [item.guid, item.storage]));

  return Object.entries(owned).reduce<DepotData>((acc, [housingKey, depots]) => {
    acc[housingKey] = depots
      .map((depot) => {
        const storage = storageByGuid.get(depot.guid);
        return storage === undefined ? depot : { ...depot, storage };
      })
      .sort((a, b) => a.storage - b.storage);
    return acc;
  }, {});
};

export const createDepotOwnersQuery = (input?: QueryParam<DepotQueryInput>) =>
  createQuery(depotOwnersQueryOptions(input));

export const createDepotStorageQuery = (input?: QueryParam<DepotStorageQueryInput>) =>
  createQuery(depotStorageQueryOptions(input));
