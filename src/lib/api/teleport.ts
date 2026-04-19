import { PUBLIC_API_BASE } from '$env/static/public';
import { apiClient } from './_api';

type TeleportResponse = {
  name: string;
  x: number;
  y: number;
  z: number;
}[];

export const getTeleports = (signal: AbortSignal): Promise<TeleportResponse> =>
  apiClient<TeleportResponse>(`${PUBLIC_API_BASE}/api/v1/teleports/`, signal, [], 'teleports');
