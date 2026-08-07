import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { housingQueryOptions } from './housing';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

const FROZEN_NOW = new Date('2026-03-01T12:00:00.000Z');
const MILLISECONDS_PER_SECOND = 1000;
const DOWNTOWN_RENT_SECONDS = 3600;
const HARBOR_RENT_SECONDS = 45;

const DOWNTOWN_KEY = 'House_Downtown_01';
const HARBOR_KEY = 'House_Harbor_02';

/** Outer keys deliberately differ from the inner `housingKey` values. */
const housingResponse = {
  'slot-7': {
    rentLeft: '1 hour',
    housingKey: DOWNTOWN_KEY,
    ownerUniqueNetId: 'net-ada',
    ownerCharacterGuid: 'guid-ada',
    ownerName: 'Ada',
    rentLeftTimeSeconds: DOWNTOWN_RENT_SECONDS,
  },
  'slot-3': {
    rentLeft: '45 seconds',
    housingKey: HARBOR_KEY,
    ownerUniqueNetId: 'net-grace',
    ownerCharacterGuid: 'guid-grace',
    ownerName: 'Grace',
    rentLeftTimeSeconds: HARBOR_RENT_SECONDS,
  },
};

describe('housing query options', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
    global.fetch = mockFetch;
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    global.fetch = originalFetch;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('requests the housing endpoint', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await queryClient.fetchQuery(housingQueryOptions()());

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/housing/'),
      expect.anything(),
    );
  });

  it('re-keys houses by housingKey rather than by the response keys', async () => {
    mockFetch.mockResolvedValue(jsonResponse(housingResponse));

    const houses = await queryClient.fetchQuery(housingQueryOptions()());

    expect(Object.keys(houses).sort()).toEqual([DOWNTOWN_KEY, HARBOR_KEY]);
    expect(houses['slot-7']).toBeUndefined();
    expect(houses[DOWNTOWN_KEY].housingKey).toBe(DOWNTOWN_KEY);
    expect(houses[DOWNTOWN_KEY].ownerName).toBe('Ada');
    expect(houses[HARBOR_KEY].ownerName).toBe('Grace');
  });

  it('resolves rentLeft to an absolute date offset from now', async () => {
    mockFetch.mockResolvedValue(jsonResponse(housingResponse));

    const houses = await queryClient.fetchQuery(housingQueryOptions()());

    expect(houses[DOWNTOWN_KEY].rentLeft).toEqual(
      new Date(FROZEN_NOW.getTime() + DOWNTOWN_RENT_SECONDS * MILLISECONDS_PER_SECOND),
    );
    expect(houses[HARBOR_KEY].rentLeft).toEqual(
      new Date(FROZEN_NOW.getTime() + HARBOR_RENT_SECONDS * MILLISECONDS_PER_SECOND),
    );
  });

  it('yields an empty map for an empty response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    const houses = await queryClient.fetchQuery(housingQueryOptions()());

    expect(houses).toEqual({});
  });
});
