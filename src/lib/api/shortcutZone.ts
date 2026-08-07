import { PUBLIC_API_BASE } from '$env/static/public';
import { createQuery, queryOptions } from '@tanstack/svelte-query';
import { apiClient, type QueryOverrides, type QueryParam } from './_api';

export interface ShortcutZone {
  id: number;
  name: string;
  description: string;
  coordinates: [x: number, y: number][];
}

export interface ShortcutZonesQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<ShortcutZone[]>;
}

export const shortcutZonesQueryOptions = (input?: QueryParam<ShortcutZonesQueryInput>) => () =>
  queryOptions({
    queryKey: ['shortcutZones'],
    queryFn: ({ signal }) =>
      apiClient<ShortcutZone[]>(`${PUBLIC_API_BASE}/api/shortcut_zones/`, signal),
    ...input?.().options,
  });

export const createShortcutZonesQuery = (input?: QueryParam<ShortcutZonesQueryInput>) =>
  createQuery(shortcutZonesQueryOptions(input));
