import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchTerrainZcm } from './terrain';

const jsonResponse = (data: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
});

describe('fetchTerrainZcm', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('hits the terrain-height endpoint with x/y as query params and returns z_cm', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ z_cm: 1234.5 }));

    const z = await fetchTerrainZcm(-1280000, -320000);

    const [[url]] = mockFetch.mock.calls;
    expect(url).toContain('/api/tracks/terrain-height/?');
    const params = new URLSearchParams((url as string).split('?')[1]);
    expect(params.get('x')).toBe('-1280000');
    expect(params.get('y')).toBe('-320000');
    expect(z).toBe(1234.5);
  });

  it('maps a non-ok response (e.g. 404 out of bounds) to null', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false));

    expect(await fetchTerrainZcm(0, 0)).toBeNull();
  });
});
