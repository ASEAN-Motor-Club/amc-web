import { PUBLIC_API_BASE } from '$env/static/public';
import { createQuery, queryOptions } from '@tanstack/svelte-query';
import { apiClient, type QueryOverrides, type QueryParam } from './_api';

export type TeleportResponse = {
  name: string;
  x: number;
  y: number;
  z: number;
}[];

export interface TeleportsQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<TeleportResponse>;
}

export const teleportsQueryOptions = (input?: QueryParam<TeleportsQueryInput>) => () =>
  queryOptions({
    queryKey: ['teleports'],
    queryFn: ({ signal }) =>
      apiClient<TeleportResponse>(`${PUBLIC_API_BASE}/api/v1/teleports/`, signal),
    ...input?.().options,
  });

export const createTeleportsQuery = (input?: QueryParam<TeleportsQueryInput>) =>
  createQuery(teleportsQueryOptions(input));
