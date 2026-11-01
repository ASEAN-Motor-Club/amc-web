import { PUBLIC_API_BASE } from '$app/env/public';
import { createQuery, queryOptions } from '@tanstack/svelte-query';
import type { Team } from './types.ts';
import { apiClient, type QueryOverrides, type QueryParam } from './_api.ts';

export interface TeamsQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<Team[]>;
}

export const teamsQueryOptions = (input?: QueryParam<TeamsQueryInput>) => () =>
  queryOptions({
    queryKey: ['teams'],
    queryFn: ({ signal }) => apiClient<Team[]>(`${PUBLIC_API_BASE}/api/teams/`, signal),
    ...input?.().options,
  });

export const createTeamsQuery = (input?: QueryParam<TeamsQueryInput>) =>
  createQuery(teamsQueryOptions(input));
