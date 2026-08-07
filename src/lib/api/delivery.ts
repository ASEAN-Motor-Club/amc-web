import { PUBLIC_API_BASE } from '$env/static/public';
import { createQuery, queryOptions } from '@tanstack/svelte-query';
import type { DeliveryCargo } from '$lib/data/types';
import type { DeliveryJob, DeliveryPointInfo } from './types';
import { apiClient, type QueryOverrides, type QueryParam } from './_api';

/**
 * Server-side delivery state refreshes roughly this often, so both the poll cadence and the
 * freshness window are derived from it — a remount inside the window reuses the cache.
 */
const DELIVERY_POLL_INTERVAL_MS = 10_000;

export interface DeliveryPointsQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<DeliveryPointInfo[]>;
}

export const deliveryPointsQueryOptions = (input?: QueryParam<DeliveryPointsQueryInput>) => () =>
  queryOptions({
    queryKey: ['delivery', 'points'],
    queryFn: ({ signal }) =>
      apiClient<DeliveryPointInfo[]>(`${PUBLIC_API_BASE}/api/deliverypoints/`, signal),
    refetchInterval: DELIVERY_POLL_INTERVAL_MS,
    staleTime: DELIVERY_POLL_INTERVAL_MS,
    ...input?.().options,
  });

export const createDeliveryPointsQuery = (input?: QueryParam<DeliveryPointsQueryInput>) =>
  createQuery(deliveryPointsQueryOptions(input));

export interface DeliveryPointQueryInput {
  /** Guid of the delivery point to read. */
  id: string;
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<DeliveryPointInfo>;
}

export const deliveryPointQueryOptions = (input: QueryParam<DeliveryPointQueryInput>) => () => {
  const { id, options } = input();

  return queryOptions({
    queryKey: ['delivery', 'point', id],
    queryFn: ({ signal }) =>
      apiClient<DeliveryPointInfo>(`${PUBLIC_API_BASE}/api/deliverypoints/${id}/`, signal),
    refetchInterval: DELIVERY_POLL_INTERVAL_MS,
    staleTime: DELIVERY_POLL_INTERVAL_MS,
    ...options,
  });
};

export const createDeliveryPointQuery = (input: QueryParam<DeliveryPointQueryInput>) =>
  createQuery(deliveryPointQueryOptions(input));

export interface DeliveryJobsQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<DeliveryJob[]>;
}

export const deliveryJobsQueryOptions = (input?: QueryParam<DeliveryJobsQueryInput>) => () =>
  queryOptions({
    queryKey: ['delivery', 'jobs'],
    queryFn: async ({ signal }) => {
      const jobs = await apiClient<DeliveryJob[]>(
        `${PUBLIC_API_BASE}/api/webui/deliveryjobs/`,
        signal,
      );
      return jobs.map((job) => ({
        ...job,
        cargos: job.cargos.map((cargo) => cargo.replace('T::', '_T') as DeliveryCargo),
      }));
    },
    refetchInterval: DELIVERY_POLL_INTERVAL_MS,
    staleTime: DELIVERY_POLL_INTERVAL_MS,
    ...input?.().options,
  });

export const createDeliveryJobsQuery = (input?: QueryParam<DeliveryJobsQueryInput>) =>
  createQuery(deliveryJobsQueryOptions(input));
