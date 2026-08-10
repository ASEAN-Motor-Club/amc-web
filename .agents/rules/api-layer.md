---
description: Data fetching in src/lib/api — TanStack Query option factories, the apiClient queryFn, reactive SSE/WebSocket stream wrappers, protobuf decoding.
globs:
  - src/lib/api/**
---

# API layer

All backend I/O lives in `src/lib/api/`; components never open a `fetch`/`EventSource`/`WebSocket` against the API. (Plain `fetch` of a static or user-supplied asset is fine.) TanStack Query owns caching, dedup, retries, abort signals and visibility-aware polling — never hand-roll them. Streams stay outside the cache but copy its shape.

Base modules: `_api.ts` (`apiClient<T>(url, signal)`, `isAbortError`, and the `QueryParam<T> = () => T` / `QueryOverrides<T>` types), `_stream.svelte.ts` (`createEventSourceStream`, `createWebSocketStream`), `queryClient.ts` (shared defaults plus one `QueryCache.onError`, so don't log query failures in components).

## Every endpoint is exported twice

```ts
export const teamsQueryOptions = (input?: QueryParam<TeamsQueryInput>) => () =>
  queryOptions({
    queryKey: ['teams'],
    queryFn: ({ signal }) => apiClient<Team[]>(`${PUBLIC_API_BASE}/api/teams/`, signal),
    ...input?.().options,
  });

export const createTeamsQuery = (input?: QueryParam<TeamsQueryInput>) =>
  createQuery(teamsQueryOptions(input));
```

- The factory returns an **accessor**, so the wrapper adds no arrow of its own. Outside a component, resolve it: `teamsQueryOptions()()`.
- The input must be a **getter**. An object literal snapshots `$state` at call time (`state_referenced_locally`) and the query never sees updates. Parameterized endpoints destructure inside the accessor.
- `QueryOverrides` excludes `queryKey`, `queryFn` and `initialData` — the first two are cache identity, the third makes the `queryOptions` overloads ambiguous.
- Spread `...options` last and **inside** the `queryOptions({ … })` call; spreading over a prebuilt object breaks key inference.
- Normalize responses in the `queryFn`, never in components.
- A polling endpoint sets `refetchInterval` **and** a matching `staleTime`, so a remount inside the window reuses the cache.
- Optional inputs use `skipToken` as the `queryFn` so the key stays stable.
- Wrappers inherit `createQuery`'s rule: call only during component initialization.

Endpoints sit on `${PUBLIC_API_BASE}/api/…`; the WebSocket uses that same `https://` base, not `ws://`. Stream-only and URL-only modules exist and are deliberate — match the neighbouring file you are extending.

## Streams

`StreamResult<T>` mirrors a query: `data`, `error`, `status`, `isPending` / `isSuccess` / `isError`.

- Visibility comes from TanStack's `focusManager`; never add `document.hidden` bookkeeping.
- Lifecycle rides on `$effect` — no abort signal, initialization-time calls only.
- `enabled: false` clears `data` and `error`; there is no cache to fall back on. Losing focus only closes the transport.
- Transport and decode failures both surface in `error`; the next good message clears it.

## Protobuf

`.proto` sources live here; `pnpm proto:generate` writes `proto/generated/`, which is gitignored and never hand-edited (generate before typecheck). Decode with `fromBinary(Schema, new Uint8Array(frame))` inside the stream's `decode`. Keep `@bufbuild/protobuf` and `@bufbuild/protoc-gen-es` on the same version. Hand-written helpers live beside the protos, not in `generated/`.
