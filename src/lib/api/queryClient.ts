import { QueryCache, QueryClient } from '@tanstack/svelte-query';
import { isAbortError } from './_api';

/**
 * Data is considered fresh for this long, so remounting a component or switching back to the
 * tab reuses the cache instead of firing another request.
 */
const DEFAULT_STALE_TIME_MS = 30_000;

const DEFAULT_RETRY_COUNT = 1;

/**
 * Builds the app-wide query cache.
 *
 * Created per root layout instance rather than as a module singleton so a prerender pass never
 * shares cached data between pages.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isAbortError(error)) {
          return;
        }
        console.error(`Error fetching ${query.queryKey.join('/')}:`, error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        retry: DEFAULT_RETRY_COUNT,
      },
    },
  });
