import { apiClient } from './_api';
import { PUBLIC_API_BASE } from '$env/static/public';

export interface ShortcutZone {
  id: number;
  name: string;
  description: string;
  coordinates: [number, number][];
}

export const getShortcutZones = (signal: AbortSignal): Promise<ShortcutZone[]> =>
  apiClient<ShortcutZone[]>(`${PUBLIC_API_BASE}/api/shortcut_zones/`, signal, [], 'shortcutZones');
