import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { teleportsQueryOptions, type TeleportResponse } from './teleport';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

const teleports: TeleportResponse = [
  { name: 'Airport', x: 12_500.5, y: -3200.25, z: 180 },
  { name: 'Docks', x: -8400, y: 6100.75, z: 0 },
];

describe('teleports query options', () => {
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

  it('requests the teleports endpoint', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await queryClient.fetchQuery(teleportsQueryOptions()());

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/teleports/'),
      expect.anything(),
    );
  });

  it('returns the parsed teleports without transforming them', async () => {
    mockFetch.mockResolvedValue(jsonResponse(teleports));

    await expect(queryClient.fetchQuery(teleportsQueryOptions()())).resolves.toEqual(teleports);
  });

  it('serves fresh teleports from cache across separate options factory calls', async () => {
    mockFetch.mockResolvedValue(jsonResponse(teleports));

    await queryClient.ensureQueryData(teleportsQueryOptions()());
    await queryClient.ensureQueryData(teleportsQueryOptions()());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(teleportsQueryOptions()().queryKey)).toEqual(teleports);
  });
});
