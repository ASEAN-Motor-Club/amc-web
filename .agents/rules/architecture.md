---
description: Build and deploy model — static SvelteKit output, the generated trees and their commands, and the non-obvious Vite config knobs.
globs:
  - package.json
  - vite.config.ts
  - svelte.config.js
  - pnpm-workspace.yaml
---

# Architecture

SvelteKit + Svelte 5 + TypeScript, built with `adapter-static` and `fallback: 'fallback.html'`: pages prerender where they can (`prerender = 'auto'` in `src/routes/+layout.ts`), the rest runs as an SPA off the fallback. **The site must stay statically buildable — never introduce a server runtime, a server `load`, or a `+server.ts`.**

## Generated trees — never hand-edit, always regenerate

| Tree                           | Command                  |
| ------------------------------ | ------------------------ |
| `src/lib/paraglide/`           | `pnpm paraglide:compile` |
| `src/lib/api/proto/generated/` | `pnpm proto:generate`    |
| `wasm/pakop/bin`, `obj`        | `pnpm build:pakop`       |

The proto output is gitignored, so a fresh clone must generate before typecheck, build or test.

## Vite knobs that look removable but aren't

- `worker.format: 'es'` — Monaco's workers; Vite still defaults to `iife`.
- `optimizeDeps.exclude: ['monaco-editor']` — prebundling fights the lazy chunk.
- `server.fs.allow: ['wasm']` — lets the pakop shim read its dotnet build output.
- `dotnetWasmAssetPlugin()` must stay first in the plugin list.

Read `vite.config.ts`, `package.json` and `pnpm-workspace.yaml` for anything else; they are the source of truth for plugins, scripts, engines and workspace globs.
