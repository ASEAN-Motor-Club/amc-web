import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { eventInfoQueryOptions } from './event';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

const ROUTE_ID = 'route-7';
const OTHER_ROUTE_ID = 'route-8';
const LAPS = 3;
const OTHER_LAPS = 5;
/** Only used to resolve the pathname; `PUBLIC_API_BASE` already makes the request url absolute. */
const URL_BASE = 'https://example.invalid';
const TRAILING_SEGMENTS = -4;

describe('event info query options', () => {
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

  it('puts the route id and the lap count in their own path segments', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await queryClient.fetchQuery(eventInfoQueryOptions(() => ({ id: ROUTE_ID, laps: LAPS }))());

    const [[url]] = mockFetch.mock.calls;
    expect(url).toContain('/api/route_info/');
    expect(new URL(url, URL_BASE).pathname.split('/').slice(TRAILING_SEGMENTS)).toEqual([
      'route_info',
      ROUTE_ID,
      'laps',
      String(LAPS),
    ]);
  });

  it('keeps different route ids in separate cache entries', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await queryClient.ensureQueryData(
      eventInfoQueryOptions(() => ({ id: ROUTE_ID, laps: LAPS }))(),
    );
    await queryClient.ensureQueryData(
      eventInfoQueryOptions(() => ({ id: OTHER_ROUTE_ID, laps: LAPS }))(),
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData(
        eventInfoQueryOptions(() => ({ id: OTHER_ROUTE_ID, laps: LAPS }))().queryKey,
      ),
    ).toBeDefined();
  });

  it('keeps different lap counts for one route in separate cache entries', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await queryClient.ensureQueryData(
      eventInfoQueryOptions(() => ({ id: ROUTE_ID, laps: LAPS }))(),
    );
    await queryClient.ensureQueryData(
      eventInfoQueryOptions(() => ({ id: ROUTE_ID, laps: OTHER_LAPS }))(),
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [[firstUrl], [secondUrl]] = mockFetch.mock.calls;
    expect(firstUrl).not.toBe(secondUrl);
  });

  it('collapses concurrent requests for the same route and lap count into one', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await Promise.all([
      queryClient.fetchQuery(eventInfoQueryOptions(() => ({ id: ROUTE_ID, laps: LAPS }))()),
      queryClient.fetchQuery(eventInfoQueryOptions(() => ({ id: ROUTE_ID, laps: LAPS }))()),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('requests the same url whether the lap count is a number or its string form', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await queryClient.fetchQuery(eventInfoQueryOptions(() => ({ id: ROUTE_ID, laps: LAPS }))());
    await queryClient.fetchQuery(
      eventInfoQueryOptions(() => ({ id: ROUTE_ID, laps: String(LAPS) }))(),
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [[numericUrl], [stringUrl]] = mockFetch.mock.calls;
    expect(numericUrl).toBe(stringUrl);
  });
});
