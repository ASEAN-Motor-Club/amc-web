import { PUBLIC_API_NEW_BASE } from '$env/static/public';
import type { EventResult, PersonalStanding, ScheduledEvent, TeamStanding } from './types';
import { apiClient } from './_api';

export const getEvents = async (signal: AbortSignal): Promise<ScheduledEvent[]> => {
  return apiClient(`${PUBLIC_API_NEW_BASE}/api/scheduled_events/`, signal, [], 'events');
};

export const getEvent = async (
  id: number | string,
  signal: AbortSignal,
): Promise<ScheduledEvent | undefined> => {
  return apiClient(
    `${PUBLIC_API_NEW_BASE}/api/scheduled_events/${id}/`,
    signal,
    undefined,
    'event',
  );
};

export const getTeamStandings = async (
  season: number,
  signal: AbortSignal,
): Promise<TeamStanding[]> => {
  return apiClient(
    `${PUBLIC_API_NEW_BASE}/championships/${season - 1}/team_standings/`,
    signal,
    [],
    'team standings',
  );
};

export const getPersonalStandings = async (
  season: number,
  signal: AbortSignal,
): Promise<PersonalStanding[]> => {
  return apiClient(
    `${PUBLIC_API_NEW_BASE}/championships/${season - 1}/personal_standings/`,
    signal,
    [],
    'personal standings',
  );
};

export const getEventResult = async (
  id: number | string,
  signal: AbortSignal,
): Promise<EventResult[]> => {
  return apiClient(
    `${PUBLIC_API_NEW_BASE}/scheduled_events/${id}/results/`,
    signal,
    [],
    'event results',
  );
};
