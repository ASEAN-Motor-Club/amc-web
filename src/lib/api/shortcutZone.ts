import { apiClient } from './_api';

export interface ShortcutZone {
  id: number;
  name: string;
  description: string;
  coordinates: number[][];
}

export const getShortcutZones = (signal: AbortSignal): Promise<ShortcutZone[]> =>
  apiClient<ShortcutZone[]>(
    'https://server.aseanmotorclub.com/api/shortcut_zones/',
    signal,
    [],
    'shortcutZones',
  );
