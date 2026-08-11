import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import {
  deliveryJobsQueryOptions,
  deliveryPointQueryOptions,
  type DeliveryPointQueryInput,
} from './delivery';
import { deliveryPointsMap } from '$lib/data/deliveryPoint';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

/** The factories return an options accessor; tests want the resolved options object. */
const pointOptions = (input: DeliveryPointQueryInput) => deliveryPointQueryOptions(() => input)();
const jobsOptions = () => deliveryJobsQueryOptions()();

describe('delivery query options', () => {
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

  it('collapses concurrent requests for the same delivery point into one', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ guid: 'a' }));

    await Promise.all([
      queryClient.fetchQuery(pointOptions({ id: 'a' })),
      queryClient.fetchQuery(pointOptions({ id: 'a' })),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('serves a fresh delivery point from cache instead of refetching', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ guid: 'a' }));

    await queryClient.fetchQuery(pointOptions({ id: 'a' }));
    await queryClient.fetchQuery(pointOptions({ id: 'a' }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('lets a call site override an endpoint default through the options factory', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ guid: 'a' }));

    await queryClient.fetchQuery(pointOptions({ id: 'a', options: { staleTime: 0 } }));
    await queryClient.fetchQuery(pointOptions({ id: 'a', options: { staleTime: 0 } }));

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('leaves the cache key untouched when overrides are supplied', () => {
    expect(pointOptions({ id: 'a', options: { staleTime: 0 } }).queryKey).toEqual(
      pointOptions({ id: 'a' }).queryKey,
    );
  });

  it('keeps delivery points with different ids in separate cache entries', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ guid: 'a' }));

    await queryClient.ensureQueryData(pointOptions({ id: 'a' }));
    await queryClient.ensureQueryData(pointOptions({ id: 'b' }));

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(pointOptions({ id: 'b' }).queryKey)).toBeDefined();
  });

  it('aborts an in-flight delivery point request when the query is cancelled', async () => {
    const signals: (AbortSignal | null | undefined)[] = [];
    const { promise: pendingResponse } = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((_url: string, init: RequestInit) => {
      signals.push(init.signal);
      return pendingResponse;
    });

    const options = pointOptions({ id: 'a' });
    void queryClient.fetchQuery(options).catch(() => undefined);

    await vi.waitFor(() => {
      expect(signals).toHaveLength(1);
    });
    expect(signals[0]?.aborted).toBe(false);

    await queryClient.cancelQueries({ queryKey: options.queryKey });

    expect(signals[0]?.aborted).toBe(true);
  });

  it('normalizes delivery job cargo keys', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse([
        {
          id: 1,
          cargos: ['CargoT::Crate', 'CargoT::Pallet'],
          source_points: [],
          destination_points: [],
        },
      ]),
    );

    const jobs = await queryClient.fetchQuery(jobsOptions());

    expect(jobs[0].cargos).toEqual(['Cargo_TCrate', 'Cargo_TPallet']);
  });

  it('drops job constraint points missing from the current map data', async () => {
    const [knownGuid] = deliveryPointsMap.keys();
    mockFetch.mockResolvedValue(
      jsonResponse([
        { id: 1, cargos: [], source_points: [knownGuid, 'removed'], destination_points: [] },
      ]),
    );

    const jobs = await queryClient.fetchQuery(jobsOptions());

    expect(jobs[0].source_points).toEqual([knownGuid]);
  });

  it('drops a job whose constraint holds only points missing from the current map data', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse([
        { id: 1, cargos: [], source_points: [], destination_points: ['removed'] },
        { id: 2, cargos: [], source_points: [], destination_points: [] },
      ]),
    );

    const jobs = await queryClient.fetchQuery(jobsOptions());

    expect(jobs.map((job) => job.id)).toEqual([2]);
  });
});
