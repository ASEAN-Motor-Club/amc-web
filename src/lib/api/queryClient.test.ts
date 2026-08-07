import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import type { QueryClient } from '@tanstack/svelte-query';
import { createQueryClient } from './queryClient';

const DEFAULT_STALE_TIME_MS = 30_000;
const WITHIN_STALE_TIME_MS = DEFAULT_STALE_TIME_MS - 1;
const PAST_STALE_TIME_MS = DEFAULT_STALE_TIME_MS + 1;
const ONCE = 1;
const EXPECTED_ATTEMPTS = 2;
const NO_RETRY_DELAY_MS = 0;

describe('createQueryClient', () => {
  let queryClient: QueryClient;
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    queryClient = createQueryClient();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('serves cached data while it is still within the default stale time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const queryFn = vi.fn().mockResolvedValue('value');
    const options = { queryKey: ['stale-window'], queryFn };

    await queryClient.fetchQuery(options);
    vi.setSystemTime(Date.now() + WITHIN_STALE_TIME_MS);
    await queryClient.fetchQuery(options);

    expect(queryFn).toHaveBeenCalledTimes(ONCE);
  });

  it('refetches once the default stale time has elapsed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const queryFn = vi.fn().mockResolvedValue('value');
    const options = { queryKey: ['stale-window'], queryFn };

    await queryClient.fetchQuery(options);
    vi.setSystemTime(Date.now() + PAST_STALE_TIME_MS);
    await queryClient.fetchQuery(options);

    expect(queryFn).toHaveBeenCalledTimes(EXPECTED_ATTEMPTS);
  });

  it('retries a failing query exactly once before giving up', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(
      queryClient.fetchQuery({ queryKey: ['retry'], queryFn, retryDelay: NO_RETRY_DELAY_MS }),
    ).rejects.toThrow('boom');

    expect(queryFn).toHaveBeenCalledTimes(EXPECTED_ATTEMPTS);
  });

  it('logs a failed query once with its cache key', async () => {
    const error = new Error('boom');
    const queryFn = vi.fn().mockRejectedValue(error);

    await expect(
      queryClient.fetchQuery({
        queryKey: ['teams', 'alpha'],
        queryFn,
        retryDelay: NO_RETRY_DELAY_MS,
      }),
    ).rejects.toThrow(error);

    expect(consoleError).toHaveBeenCalledTimes(ONCE);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('teams/alpha'), error);
  });

  it.each(['AbortError', 'StaleReactionError'])(
    'stays quiet when a query fails with %s',
    async (name) => {
      const error = new Error('cancelled');
      error.name = name;
      const queryFn = vi.fn().mockRejectedValue(error);

      await expect(
        queryClient.fetchQuery({
          queryKey: ['cancelled'],
          queryFn,
          retryDelay: NO_RETRY_DELAY_MS,
        }),
      ).rejects.toThrow(error);

      expect(consoleError).not.toHaveBeenCalled();
    },
  );

  it('keeps every client on its own cache', async () => {
    const otherClient = createQueryClient();
    const options = { queryKey: ['shared'], queryFn: () => Promise.resolve('value') };

    await queryClient.ensureQueryData(options);

    expect(queryClient.getQueryData(options.queryKey)).toBe('value');
    expect(otherClient.getQueryData(options.queryKey)).toBeUndefined();

    otherClient.clear();
  });
});
