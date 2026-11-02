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

/** Storage moves whenever cargo is delivered, so the endpoint is polled at this cadence. */
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

/**
 * Depots grouped by housing key (the same key `HouseData` uses), worst storage first.
 *
 * Polled rather than fetched once: storage drops as cargo is delivered. The `owner` mapping comes
 * along on every tick — TanStack Query keeps the previous list rendered while a poll is in flight,
 * so the extra field costs nothing beyond the payload it was already fetching.
 *
 * Depots whose building has no housing key are dropped - nothing can attach them to a house.
 */
export const depotQueryOptions = (input?: QueryParam<DepotQueryInput>) => () =>
  queryOptions({
    queryKey: ['depots'],
    queryFn: async ({ signal }): Promise<DepotData> => {
      const data = await apiClient<GetDepotDataResponse>(
        `${PUBLIC_API_BASE}/api/depots/?owner=true`,
        signal,
      );

      const grouped = data.reduce<DepotData>((acc, item) => {
        if (!item.owner) return acc;
        const depot: Depot = {
          guid: item.guid,
          name: item.name,
          storage: item.storage,
          taxiDispatchLevel: item.taxiDispatchLevel,
        };
        (acc[item.owner] ??= []).push(depot);
        return acc;
      }, {});

      for (const depots of Object.values(grouped)) {
        depots.sort((a, b) => a.storage - b.storage);
      }

      return grouped;
    },
    refetchInterval: DEPOT_POLL_INTERVAL_MS,
    staleTime: DEPOT_POLL_INTERVAL_MS,
    ...input?.().options,
  });

export const createDepotQuery = (input?: QueryParam<DepotQueryInput>) =>
  createQuery(depotQueryOptions(input));
