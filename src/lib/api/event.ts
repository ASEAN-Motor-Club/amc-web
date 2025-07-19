import type { EventInfo } from './types';
import { PUBLIC_API_BASE } from '$env/static/public';

export const getEventInfo = async (
  id: string,
  laps: string,
  signal: AbortSignal,
): Promise<EventInfo> => {
  try {
    const response = await fetch(`${PUBLIC_API_BASE}/api/route_info/${id}/laps/${laps}`, {
      signal: signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as EventInfo;

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return {
        route: { waypoints: [], routeName: '' },
        best_times: [],
      };
    }
    throw error;
  }
};
