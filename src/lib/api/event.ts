import type { EventInfo } from './types';
import { PUBLIC_API_BASE } from '$env/static/public';
import { apiClient } from './_api';

export const getEventInfo = async (
  id: string,
  laps: string | number,
  signal: AbortSignal,
): Promise<EventInfo> => {
  return apiClient(
    `${PUBLIC_API_BASE}/api/route_info/${id}/laps/${laps}`,
    signal,
    {
      route: { waypoints: [], routeName: '' },
      best_times: [],
    },
    'event info',
  );
};
