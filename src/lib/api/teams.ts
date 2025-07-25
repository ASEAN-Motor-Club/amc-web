import { PUBLIC_API_NEW_BASE } from '$env/static/public';
import type { Team } from './types';

export const getTeams = async (signal: AbortSignal): Promise<Team[]> => {
  try {
    const response = await fetch(`${PUBLIC_API_NEW_BASE}/api/teams/`, {
      signal: signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as Team[];

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
