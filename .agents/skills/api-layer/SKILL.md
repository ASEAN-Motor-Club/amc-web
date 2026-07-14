---
name: api-layer
description: How to fetch data in the AMC web app — the apiClient helper, visibility-aware polling / EventSource / WebSocket wrappers in src/lib/api/_api.ts, per-domain API modules, and protobuf decoding. Read before adding any network call.
---

# API Layer

All backend communication lives in `src/lib/api/`. Never call `fetch` / `EventSource` / `WebSocket` directly in components — use or extend the helpers in `src/lib/api/_api.ts`.

## Base helpers (`src/lib/api/_api.ts`)

| Helper                                                      | Use for                                                                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apiClient<TData>(url, signal, defaultValue, errorContext)` | One-shot JSON GET with standardized error handling; returns `defaultValue` on abort                            |
| `startVisibilityAwarePolling`                               | Repeated fetches on an interval; pauses when the tab is hidden, resumes + refetches when visible               |
| `startVisibilityAwareEventSource<T>`                        | SSE streams (JSON messages); closes when hidden, reopens when visible                                          |
| `startVisibilityAwareWebSocket`                             | Binary protobuf WebSocket streams (`['protobuf']` subprotocol, `arraybuffer`); reconnects on visibility change |
| `isAbortError(error)`                                       | Detects both DOM `AbortError` and Svelte `StaleReactionError`                                                  |

All stream/polling helpers take an `AbortSignal` and clean up listeners on abort. In components, pass Svelte's `getAbortSignal()` (imported from `svelte`) so streams die with the component.

## Per-domain modules

One file per domain: `player.ts`, `delivery.ts`, `housing.ts`, `championship.ts`, `event.ts`, `radio.ts`, `teams.ts`, `teleport.ts`, `shortcutZone.ts`. Shared response types in `src/lib/api/types.ts`.

Endpoint URLs use the base `` `${PUBLIC_API_BASE}/api/` `` (`PUBLIC_API_BASE` from `$env/static/public`) unless specified otherwise — e.g. `` `${PUBLIC_API_BASE}/api/player_positions/` ``. Default new endpoints to this base.

Follow the existing shape when adding an endpoint: exported function taking a `callback` + `abortSignal` (streams) or `signal` (one-shot), delegating to a `_api.ts` helper.

## Protobuf streams

Binary streams decode with `@bufbuild/protobuf`:

```ts
import { fromBinary } from '@bufbuild/protobuf';
import { PlayerPositionsSchema } from './proto/generated/player_positions_pb';
// inside onMessage:
callback(fromBinary(PlayerPositionsSchema, new Uint8Array(data)));
```

Schemas are generated from `src/lib/api/proto/*.proto` via `pnpm proto:generate` — never edit `proto/generated/`.

## Dev-time proxies

In dev, `/stream`, `/icecast-status`, and `/login/token` are proxied by Vite (see `vite.config.ts`) using `VITE_MAIN_SITE`, `VITE_ICE_CAST`, `VITE_API_BASE` — see [[env-config]].

Related: [[env-config]], [[architecture]]
