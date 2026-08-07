import { PUBLIC_API_BASE } from '$env/static/public';
import { createQuery, queryOptions, skipToken } from '@tanstack/svelte-query';
import type { EventResult, PersonalStanding, ScheduledEvent, TeamStanding } from './types';
import { apiClient, type QueryOverrides, type QueryParam } from './_api';

export interface EventsQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<ScheduledEvent[]>;
}

export const eventsQueryOptions = (input?: QueryParam<EventsQueryInput>) => () =>
  queryOptions({
    queryKey: ['championship', 'events'],
    queryFn: ({ signal }) =>
      apiClient<ScheduledEvent[]>(`${PUBLIC_API_BASE}/api/scheduled_events/`, signal),
    ...input?.().options,
  });

export const createEventsQuery = (input?: QueryParam<EventsQueryInput>) =>
  createQuery(eventsQueryOptions(input));

export interface EventQueryInput {
  /** Scheduled event id; `undefined` parks the query instead of fetching. */
  id: number | string | undefined;
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<ScheduledEvent>;
}

export const eventQueryOptions = (input: QueryParam<EventQueryInput>) => () => {
  const { id, options } = input();

  return queryOptions({
    queryKey: ['championship', 'event', id],
    queryFn:
      id === undefined
        ? skipToken
        : ({ signal }) =>
            apiClient<ScheduledEvent>(`${PUBLIC_API_BASE}/api/scheduled_events/${id}/`, signal),
    ...options,
  });
};

export const createEventQuery = (input: QueryParam<EventQueryInput>) =>
  createQuery(eventQueryOptions(input));

export interface EventResultsQueryInput {
  /** Scheduled event id; `undefined` parks the query instead of fetching. */
  id: number | string | undefined;
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<EventResult[]>;
}

export const eventResultsQueryOptions = (input: QueryParam<EventResultsQueryInput>) => () => {
  const { id, options } = input();

  return queryOptions({
    queryKey: ['championship', 'event', id, 'results'],
    queryFn:
      id === undefined
        ? skipToken
        : ({ signal }) =>
            apiClient<EventResult[]>(
              `${PUBLIC_API_BASE}/api/scheduled_events/${id}/results/`,
              signal,
            ),
    ...options,
  });
};

export const createEventResultsQuery = (input: QueryParam<EventResultsQueryInput>) =>
  createQuery(eventResultsQueryOptions(input));

export interface TeamStandingsQueryInput {
  /** Championship season number. */
  season: number;
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<TeamStanding[]>;
}

export const teamStandingsQueryOptions = (input: QueryParam<TeamStandingsQueryInput>) => () => {
  const { season, options } = input();

  return queryOptions({
    queryKey: ['championship', 'teamStandings', season],
    queryFn: ({ signal }) =>
      apiClient<TeamStanding[]>(
        `${PUBLIC_API_BASE}/api/championships/${season - 1}/team_standings/`,
        signal,
      ),
    ...options,
  });
};

export const createTeamStandingsQuery = (input: QueryParam<TeamStandingsQueryInput>) =>
  createQuery(teamStandingsQueryOptions(input));

export interface PersonalStandingsQueryInput {
  /** Championship season number. */
  season: number;
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<PersonalStanding[]>;
}

export const personalStandingsQueryOptions =
  (input: QueryParam<PersonalStandingsQueryInput>) => () => {
    const { season, options } = input();

    return queryOptions({
      queryKey: ['championship', 'personalStandings', season],
      queryFn: ({ signal }) =>
        apiClient<PersonalStanding[]>(
          `${PUBLIC_API_BASE}/api/championships/${season - 1}/personal_standings/`,
          signal,
        ),
      ...options,
    });
  };

export const createPersonalStandingsQuery = (input: QueryParam<PersonalStandingsQueryInput>) =>
  createQuery(personalStandingsQueryOptions(input));
