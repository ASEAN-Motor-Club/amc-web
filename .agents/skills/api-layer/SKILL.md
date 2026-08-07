---
name: api-layer
description: How to fetch data in the AMC web app — TanStack Query (`@tanstack/svelte-query`) for every request/poll, the `apiClient` queryFn helper, reactive EventSource / WebSocket stream wrappers in src/lib/api/_stream.svelte.ts, per-domain query-option factories, and protobuf decoding. Read before adding any network call.
---

# API Layer

All backend communication lives in `src/lib/api/`. Never call `fetch` / `EventSource` / `WebSocket` directly in components — use or extend the helpers in `src/lib/api/_api.ts` and `src/lib/api/_stream.svelte.ts`.

Every request and poll goes through **TanStack Query** (`@tanstack/svelte-query`, Svelte 5 runes build). It owns caching, deduplication, retries, abort signals, and visibility-aware polling — do not hand-roll any of those. Push streams stay outside the query cache but copy its shape and reuse its `focusManager`.

## Base helpers

| Helper                                  | Module              | Use for                                                                       |
| --------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `apiClient<TData>(url, signal)`         | `_api.ts`           | JSON GET used as a `queryFn`; throws on HTTP and network errors               |
| `isAbortError(error)`                   | `_api.ts`           | Detects both DOM `AbortError` and Svelte `StaleReactionError`                 |
| `createEventSourceStream<TData>(input)` | `_stream.svelte.ts` | SSE streams of JSON messages                                                  |
| `createWebSocketStream<TData>(input)`   | `_stream.svelte.ts` | Binary protobuf WebSocket streams (`['protobuf']` subprotocol, `arraybuffer`) |

## Streams

Streams are push-based, so they hold no cache — but they present the same surface as a query, and callers read state instead of passing callbacks:

```svelte
const positions = createPlayerPositionsV2Stream(() => ({ enabled: showMap }));

const players = $derived(positions.data?.players ?? []);
const loading = $derived(positions.isPending);
```

`StreamResult<TData>` exposes `data`, `error`, `status` (`'pending' | 'success' | 'error'`) and the matching `isPending` / `isSuccess` / `isError` booleans — TanStack's vocabulary, nothing invented.

- **Visibility comes from TanStack's `focusManager`**, the same one behind `refetchOnWindowFocus`. It owns the `visibilitychange` listener; the stream just subscribes, so there is no bespoke `document.hidden` / `beforeunload` bookkeeping to keep in sync.
- **Lifecycle rides on `$effect`** — no `AbortSignal` argument and no `getAbortSignal()` at the call site. Like `createQuery`, that means stream wrappers may only be called during component initialization.
- **`enabled: false` clears `data`.** A stream has no cache to fall back on, so keeping the last frame would render live data that is silently frozen. Losing focus only closes the transport and keeps the payload.
- Transport failures and decode failures both land in `error` as an `Error`; the next good message clears it.

## Query client

`src/lib/api/queryClient.ts` exports `createQueryClient()`; `src/routes/+layout.svelte` builds one per layout instance and mounts `<QueryClientProvider>` around the app. Defaults: 30 s `staleTime`, one retry, and a shared `QueryCache.onError` that logs failures once with the query key — per-call error logging in components is redundant.

## Per-domain modules

One file per domain: `player.ts`, `delivery.ts`, `housing.ts`, `championship.ts`, `event.ts`, `radio.ts`, `teams.ts`, `teleport.ts`, `shortcutZone.ts`. Shared response types in `src/lib/api/types.ts`.

Endpoint URLs use the base `` `${PUBLIC_API_BASE}/api/` `` (`PUBLIC_API_BASE` from `$env/static/public`) unless specified otherwise — e.g. `` `${PUBLIC_API_BASE}/api/player_positions/` ``. Default new endpoints to this base.

Every endpoint is exported twice:

1. `<thing>QueryOptions(input?)` — takes the input **getter** and returns an **options accessor**
   (`() => queryOptions({ … })`). It owns the query key, the `queryFn` and every endpoint-level
   policy (`refetchInterval`, `staleTime`), and spreads the caller's `options` over those defaults.
2. `create<Thing>Query(input?)` — a thin prefilled wrapper, always exactly
   `createQuery(<thing>QueryOptions(input))`.

Because the factory already returns the accessor, the wrapper adds no closure of its own — there is
no `createQuery(() => …)` arrow anywhere in the layer.

```ts
export interface TeamsQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<Team[]>;
}

export const teamsQueryOptions = (input?: QueryParam<TeamsQueryInput>) => () =>
  queryOptions({
    queryKey: ['teams'],
    queryFn: ({ signal }) => apiClient<Team[]>(`${PUBLIC_API_BASE}/api/teams/`, signal),
    ...input?.().options,
  });

export const createTeamsQuery = (input?: QueryParam<TeamsQueryInput>) =>
  createQuery(teamsQueryOptions(input));
```

A parameterized endpoint destructures inside the accessor, so every read happens per evaluation:

```ts
export const deliveryPointQueryOptions = (input: QueryParam<DeliveryPointQueryInput>) => () => {
  const { id, options } = input();

  return queryOptions({ queryKey: ['delivery', 'point', id], queryFn: …, ...options });
};
```

Factory rules:

- The input is a **getter** (`QueryParam<T>` = `() => T`) holding the endpoint's params plus an
  optional `options` bag. It has to be a getter: an object literal built from local `$state` /
  `$derived` snapshots its values at call time — Svelte warns `state_referenced_locally` — so the
  query would never see later updates.
- `options` is `QueryOverrides<TData>` — every option except `queryKey`, `queryFn` and
  `initialData`. The first two are the endpoint's cache identity; `initialData` is what
  discriminates the two `queryOptions` overloads, so leaving it in makes every factory ambiguous.
- **Spread `...options` inside the `queryOptions({ … })` call**, last. Spreading it over an
  already-built options object does not typecheck: the query-key generic is only assignable in one
  direction, and only the inner position lets `queryOptions` infer the concrete key first.
- Response normalization (renaming, date math, key rewriting) belongs in the `queryFn`, not in components.
- Polling endpoints set `refetchInterval` **and** a matching `staleTime`, so remounting inside the window reuses the cache instead of firing an off-cadence request. TanStack pauses interval refetches while the tab is hidden and refetches on focus, which replaces the old `startVisibilityAwarePolling` helper.
- Optional inputs use `skipToken` as the `queryFn` (see `eventQueryOptions`) so the key stays stable and typing stays honest.
- Wrappers call `createQuery`, so they inherit its rule: only during component initialization.

Components only ever touch the wrapper:

```svelte
const jobsQuery = createDeliveryJobsQuery(() => ({ options: { enabled: showMap } }));
const pointQuery = createDeliveryPointQuery(() => ({ id: guid }));

const jobs = $derived(jobsQuery.data ?? []);
const jobsLoading = $derived(jobsQuery.isPending);
```

Cache operations outside a component (`fetchQuery`, `invalidateQueries`, prefetching, tests) resolve
the accessor once: `teamsQueryOptions()()`, or `deliveryPointQueryOptions(() => ({ id }))()`.

Streams keep the same wrapper shape: `create<Thing>Stream(input?)` in the domain module, delegating
to a `_stream.svelte.ts` helper — see [Streams](#streams).

## Protobuf streams

Binary streams decode with `@bufbuild/protobuf`:

```ts
import { fromBinary } from '@bufbuild/protobuf';
import { PlayerPositionsSchema } from './proto/generated/player_positions_pb';
// inside the stream's `decode`:
decode: (frame) => fromBinary(PlayerPositionsSchema, new Uint8Array(frame)),
```

Schemas are generated from `src/lib/api/proto/*.proto` via `pnpm proto:generate` — never edit `proto/generated/`.

## Dev-time proxies

In dev, `/stream`, `/icecast-status`, and `/login/token` are proxied by Vite (see `vite.config.ts`) using `VITE_MAIN_SITE`, `VITE_ICE_CAST`, `VITE_API_BASE` — see [[env-config]].

Related: [[env-config]], [[architecture]]
