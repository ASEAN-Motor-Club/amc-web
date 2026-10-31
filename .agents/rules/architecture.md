---
description: Build and deploy model — static SvelteKit output, Kit config in the Vite plugin, the generated trees and their commands, and the non-obvious Vite config knobs.
globs:
  - package.json
  - vite.config.ts
  - pnpm-workspace.yaml
---

# Architecture

SvelteKit 3 + Svelte 5 + TypeScript, built with `adapter-static` and `fallback: 'fallback.html'`: pages prerender where they can (`prerender = 'auto'` in `src/routes/+layout.ts`), the rest runs as an SPA off the fallback. **The site must stay statically buildable — never introduce a server runtime, a server `load`, or a `+server.ts`.**

Kit config (adapter, preprocess) is passed to `sveltekit({...})` in `vite.config.ts`; Kit 3 no longer reads `svelte.config.js`, and eslint gets the same config through `@sveltejs/load-config`. `tsconfig.json` extends the generated `$app/tsconfig`.

## Generated trees — never hand-edit, always regenerate

| Tree                           | Command                                         |
| ------------------------------ | ----------------------------------------------- |
| `src/lib/paraglide/`           | `pnpm paraglide:compile`                        |
| `src/lib/api/proto/generated/` | `pnpm proto:generate`                           |
| `wasm/pakop/bin`, `obj`        | `pnpm build:pakop`                              |
| `graphify-out/graph.json`      | CI (`graph.yml`) on push to main; `/graphify .` |

The proto output is gitignored, so a fresh clone must generate before typecheck, build or test.

`graphify-out/graph.json` is the only committed graphify output. The `🕸️ Graphify` workflow rebuilds its code layer on every push to `main` and commits the result. Doc and image nodes come from an LLM pass that CI can't run, so after changing docs or images, run `/graphify . --update` locally and commit `graph.json`.

## Vite knobs that look removable but aren't

- `worker.format: 'es'` — Monaco's workers; Vite still defaults to `iife`.
- `optimizeDeps.exclude: ['monaco-editor']` — prebundling fights the lazy chunk.
- `server.fs.allow: ['wasm']` — lets the pakop shim read its dotnet build output.
- `dotnetWasmAssetPlugin()` must stay first in the plugin list.
- The bundle analyzer's `applyToEnvironment` (client only) and absolute `fileName` into `.svelte-kit/output/client` — without them Kit 3's environment build makes it write a mixed client+server report to `dist/`. adapter-static copies the client output, so the report lands at `build/stats.html` (and ships with a deploy built outside CI); it is skipped when `CI` is set.

Read `vite.config.ts`, `package.json` and `pnpm-workspace.yaml` for anything else; they are the source of truth for plugins, scripts, engines and workspace globs.
