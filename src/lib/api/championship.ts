import { PUBLIC_API_NEW_BASE } from '$env/static/public';
import type { EventResult, PersonalStanding, ScheduledEvent, TeamStanding } from './types';

export const getEvents = async (signal: AbortSignal): Promise<ScheduledEvent[]> => {
  try {
    const response = await fetch(`${PUBLIC_API_NEW_BASE}/api/scheduled_events/`, {
      signal: signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ScheduledEvent[];

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return [];
    }
    console.error('Error fetching teams:', error);
    throw error;
  }
};

export const getEvent = async (
  id: number | string,
  signal: AbortSignal,
): Promise<ScheduledEvent | undefined> => {
  try {
    const response = await fetch(`${PUBLIC_API_NEW_BASE}/api/scheduled_events/${id}/`, {
      signal: signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ScheduledEvent;

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return undefined;
    }
    console.error('Error fetching teams:', error);
    throw error;
  }
};

export const getTeamStandings = async (
  season: number,
  signal: AbortSignal,
): Promise<TeamStanding[]> => {
  try {
    const response = await fetch(
      `${PUBLIC_API_NEW_BASE}/championships/${season - 1}/team_standings/`,
      {
        signal: signal,
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as TeamStanding[];

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return [];
    }
    console.error('Error fetching teams:', error);
    throw error;
  }
};

export const getPersonalStandings = async (
  season: number,
  signal: AbortSignal,
): Promise<PersonalStanding[]> => {
  try {
    const response = await fetch(
      `${PUBLIC_API_NEW_BASE}/championships/${season - 1}/personal_standings/`,
      {
        signal: signal,
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as PersonalStanding[];

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return [];
    }
    console.error('Error fetching teams:', error);
    throw error;
  }
};

export const getEventResult = async (
  id: number | string,
  signal: AbortSignal,
): Promise<EventResult[]> => {
  try {
    const response = await fetch(`${PUBLIC_API_NEW_BASE}/scheduled_events/${id}/results/`, {
      signal: signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as EventResult[];

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return [];
    }
    console.error('Error fetching teams:', error);
    throw error;
  }
};
