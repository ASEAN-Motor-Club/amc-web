import { PUBLIC_API_NEW_BASE } from '$env/static/public';
import type { ScheduledEvent } from './types';

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
