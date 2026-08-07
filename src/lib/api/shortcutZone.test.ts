import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { shortcutZonesQueryOptions, type ShortcutZone } from './shortcutZone';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

const shortcutZones: ShortcutZone[] = [
  {
    id: 1,
    name: 'Harbour cut',
    description: 'Crossing the container yard skips the hairpin.',
    coordinates: [
      [1000, 2000],
      [1200, 2100],
      [1150, 2400],
    ],
  },
  {
    id: 2,
    name: 'Quarry cut',
    description: 'Gravel bypass around the switchbacks.',
    coordinates: [
      [-500.5, 300.25],
      [-480, 420],
    ],
  },
];

describe('shortcut zones query options', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  let queryClient: QueryClient;

  beforeEach(() => {
    global.fetch = mockFetch;
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('requests the shortcut zones endpoint', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.fetchQuery(shortcutZonesQueryOptions()());

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/shortcut_zones/'),
      expect.anything(),
    );
  });

  it('returns the parsed shortcut zones without transforming them', async () => {
    mockFetch.mockResolvedValue(jsonResponse(shortcutZones));

    await expect(queryClient.fetchQuery(shortcutZonesQueryOptions()())).resolves.toEqual(
      shortcutZones,
    );
  });

  it('serves fresh shortcut zones from cache across separate options factory calls', async () => {
    mockFetch.mockResolvedValue(jsonResponse(shortcutZones));

    await queryClient.ensureQueryData(shortcutZonesQueryOptions()());
    await queryClient.ensureQueryData(shortcutZonesQueryOptions()());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(shortcutZonesQueryOptions()().queryKey)).toEqual(shortcutZones);
  });
});
