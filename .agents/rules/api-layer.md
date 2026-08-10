---
description: Data fetching in src/lib/api — TanStack Query option factories, apiClient, reactive SSE/WebSocket stream wrappers, protobuf decoding.
globs:
  - src/lib/api/**
---

# API layer

All backend I/O lives in `src/lib/api/`. Components never open a `fetch`/`EventSource`/`WebSocket` against the API — extend the helpers instead. (Plain `fetch` of a static or user-supplied asset is fine: `TrackEditor/Editor/SelectTrack.svelte`, `routes/pak/`.)

TanStack Query (`@tanstack/svelte-query`, runes build) owns caching, dedup, retries, abort signals and visibility-aware polling. Push streams stay outside the cache but copy its shape and reuse its `focusManager`.

## Base modules

- `_api.ts` — `apiClient<T>(url, signal)` (JSON GET for use as a `queryFn`; throws on HTTP and network errors), `isAbortError(e)` (DOM `AbortError` + Svelte `StaleReactionError`), and the types `QueryParam<T> = () => T` and `QueryOverrides<T>` (all query options except `queryKey`, `queryFn`, `initialData`).
- `_stream.svelte.ts` — `createEventSourceStream<T>` (SSE JSON) and `createWebSocketStream<T>` (binary, `protobuf` subprotocol, `arraybuffer`), returning `StreamResult<T>`.
- `queryClient.ts` — `createQueryClient()`: 30 s `staleTime`, 1 retry, one `QueryCache.onError` that logs the query key and swallows abort errors. Built once in `src/routes/+layout.svelte` under `<QueryClientProvider>`; per-call error logging in components is redundant.

## Endpoint modules

One file per domain — `championship`, `delivery`, `event`, `housing`, `shortcutZone`, `teams`, `teleport` — with shared response types in `types.ts`. Each endpoint is exported twice:

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

- `<thing>QueryOptions(input?)` takes a **getter** and returns an **options accessor**; it owns the key, the `queryFn` and endpoint policy. `create<Thing>Query` is exactly `createQuery(<thing>QueryOptions(input))` — there is no `createQuery(() => …)` arrow in the layer.
- The input must be a getter: an object literal snapshots `$state` at call time (`state_referenced_locally`) and the query would never see updates. Parameterized endpoints destructure **inside** the accessor.
- Spread `...options` last, **inside** the `queryOptions({ … })` call — spreading over a prebuilt object breaks key inference.
- Bases: `${PUBLIC_API_BASE}/api/…`, some with a `v1`/`webui` segment. `player.ts` opens its WebSocket on the same `https://` base — do not rewrite it to `ws://`.
- Normalize responses in the `queryFn`, never in components.
- Polling endpoints (only `delivery.ts` today) set `refetchInterval` **and** a matching `staleTime`. TanStack pauses interval refetches while hidden and refetches on focus.
- Optional inputs use `skipToken` as the `queryFn` so the key stays stable (`championship.ts`).
- Wrappers inherit `createQuery`'s rule: call only during component initialization. Outside a component, resolve the accessor: `teamsQueryOptions()()`.

Two modules deliberately break the pair: `player.ts` is stream-only (`createPlayerCountStream`, `createPlayerPositionsStream`, `createPlayerPositionsV2Stream`), and `radio.ts` only builds the stream URL from `PUBLIC_RADIO_STREAM_URL`.

## Streams

```svelte
const positions = createPlayerPositionsV2Stream(() => ({ enabled: showMap }));
const players = $derived(positions.data?.players ?? []);
```

`StreamResult<T>` exposes `data`, `error`, `status` and `isPending`/`isSuccess`/`isError`.

- Visibility comes from TanStack's `focusManager` — no bespoke `document.hidden` bookkeeping.
- Lifecycle rides on `$effect`, so no `AbortSignal` argument and initialization-time calls only.
- `enabled: false` clears both `data` and `error`; there is no cache to fall back on. Losing focus only closes the transport.
- Transport and decode failures both land in `error`; the next good message clears it.

## Protobuf

`.proto` sources in `src/lib/api/proto/`, output in `proto/generated/` via `pnpm proto:generate` (buf, `buf.gen.yaml`, local `protoc-gen-es`). The generated `*_pb.ts` files are **gitignored** — a fresh clone must generate before typecheck, build or tests. `proto/vehicleKeyUtils.ts` sits beside them and is hand-written.

```ts
decode: (frame) => fromBinary(PlayerPositionsSchema, new Uint8Array(frame)),
```

Keep `@bufbuild/protobuf` and `@bufbuild/protoc-gen-es` on the same version.
