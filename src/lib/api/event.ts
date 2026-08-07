import type { EventInfo } from './types';
import { PUBLIC_API_BASE } from '$env/static/public';
import { createQuery, queryOptions } from '@tanstack/svelte-query';
import { apiClient, type QueryOverrides, type QueryParam } from './_api';

export interface EventInfoQueryInput {
  /** Route id the event runs on. */
  id: string;
  /** Lap count the route info is requested for. */
  laps: string | number;
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<EventInfo>;
}

export const eventInfoQueryOptions = (input: QueryParam<EventInfoQueryInput>) => () => {
  const { id, laps, options } = input();

  return queryOptions({
    queryKey: ['eventInfo', id, laps],
    queryFn: ({ signal }) =>
      apiClient<EventInfo>(`${PUBLIC_API_BASE}/api/route_info/${id}/laps/${laps}`, signal),
    ...options,
  });
};

export const createEventInfoQuery = (input: QueryParam<EventInfoQueryInput>) =>
  createQuery(eventInfoQueryOptions(input));
