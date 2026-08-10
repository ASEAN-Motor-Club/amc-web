---
description: Directory shape — what each top-level tree is for, the ui vs components split, and where new files go.
---

# Project structure

| Path                  | Holds                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| `src/lib/ui/`         | Reusable, domain-agnostic components — one dir per component              |
| `src/lib/components/` | Feature components, one dir per domain                                    |
| `src/lib/api/`        | Everything that talks to the backend, incl. `proto/`                      |
| `src/lib/data/`       | Static game data                                                          |
| `src/lib/schema/`     | zod schemas                                                               |
| `src/lib/utils/`      | Shared helpers                                                            |
| `src/lib/types/`      | Shared TypeScript types                                                   |
| `src/lib/assets/`     | Images, videos, lottie JSON, data blobs                                   |
| `src/lib/paraglide/`  | Generated i18n runtime — never edit                                       |
| `src/routes/`         | One dir per page; `(map)/` is a layout group sharing the map and its data |
| `messages/`           | Paraglide message sources, one JSON per locale                            |
| `wasm/pakop/`         | C#/.NET WASM project and its committed JS shim                            |
| `vite-plugins/`       | Repo-local Vite plugins                                                   |
| `static/`             | Served as-is at the site root                                             |

Loose files in `src/lib/` (`tw-var.ts`, `date.ts`, `realtimeDate.svelte.ts`, …) are single-purpose modules imported as `$lib/<name>`.

## Where new files go

- UI component → `src/lib/ui/<Name>/<Name>.svelte`, plus `<Name>.stories.svelte` and a `context.ts` if it composes with children.
- Feature code → `src/lib/components/<Domain>/`.
- Shared helper → `src/lib/utils/<name>.ts` with a colocated test.
- Anything domain-specific stays out of `src/lib/ui/` — that split is the reason the UI kit is reusable.

Tests are colocated, never in a separate tree.
