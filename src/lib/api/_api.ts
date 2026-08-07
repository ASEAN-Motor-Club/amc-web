import { isError } from 'es-toolkit';
import type { CreateQueryOptions } from '@tanstack/svelte-query';

/**
 * Getter for a query wrapper's input object.
 *
 * A getter, not the object itself: an object literal built from local `$state` / `$derived`
 * snapshots its values at call time (Svelte warns `state_referenced_locally`), so the query would
 * never see later updates. Only a `$state` proxy or an object of getters survives the hand-off,
 * and one getter around the whole input is cheaper than a getter per field.
 */
export type QueryParam<T> = () => T;

/**
 * Call-site overrides an endpoint's options factory spreads over its own defaults — `enabled`,
 * `select`, `placeholderData`, and so on.
 *
 * Three keys are withheld:
 * - `queryKey` and `queryFn` define the endpoint's cache identity, so letting a caller swap them
 *   would silently split or poison the shared cache entry.
 * - `initialData` seeds the cache with endpoint-shaped data and is what discriminates the two
 *   `queryOptions` overloads; leaving it in makes every factory ambiguous.
 *
 * The spread has to happen *inside* the factory's `queryOptions(...)` call. Spreading these over an
 * already-built options object fails to typecheck, because the query-key generic is only assignable
 * in one direction.
 */
export type QueryOverrides<TData = unknown> = Omit<
  Partial<CreateQueryOptions<TData>>,
  'queryKey' | 'queryFn' | 'initialData'
>;

/**
 * Generic JSON GET used as the `queryFn` of every TanStack Query in `src/lib/api`.
 *
 * Errors are thrown rather than swallowed: TanStack Query owns retries, error state and
 * abort handling, and the shared `QueryCache` logs failures once with the query key.
 *
 * @param url - The URL to fetch
 * @param signal - AbortSignal handed to the query function by TanStack Query
 * @returns Promise with the parsed JSON data
 */
export const apiClient = async <TData>(url: string, signal: AbortSignal): Promise<TData> => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return (await response.json()) as TData;
};

export const isAbortError = (error: unknown): boolean => {
  return isError(error) && (error.name === 'StaleReactionError' || error.name === 'AbortError');
};
