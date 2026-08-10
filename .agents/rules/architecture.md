---
description: How the app is built — SvelteKit static/SPA hybrid, the Vite plugin pipeline, codegen outputs, WASM, tooling and the commands that drive them.
globs:
  - package.json
  - vite.config.ts
  - svelte.config.js
  - unocss.config.ts
  - buf.gen.yaml
  - pnpm-workspace.yaml
---

# Architecture

SvelteKit + Svelte 5 + TypeScript, statically built for the ASEAN Motor Club community.

## Rendering & deployment

- `@sveltejs/adapter-static` with `fallback: 'fallback.html'`: pages prerender where they can (`export const prerender = 'auto'` in `src/routes/+layout.ts`), everything else runs as an SPA off the fallback.
- Output goes to `build/`. The site must stay statically buildable — no server runtime.

## Vite pipeline

`vite.config.ts` registers, in order: `dotnetWasmAssetPlugin()`, `UnoCSS()`, `sveltekit()`, `paraglideVitePlugin()`, `analyzer()` (vite-bundle-analyzer, off in CI via `env-ci`), `webmanifestPlugin()`. It also sets `worker.format: 'es'` and `optimizeDeps.exclude: ['monaco-editor']` for Monaco's workers, `server.fs.allow: ['wasm']` for the pakop shim, and dev proxies read from `VITE_*`.

Styling is UnoCSS via the Vite plugin with `@unocss/extractor-svelte`; presets (`presetIcons`, `presetWind4`, `presetTypography`) come from the `amc-uno-css-config` GitHub dependency and `unocss.config.ts` adds `transformerDirectives()`, a `cursive` font token, and a blocklist that stops paraglide `m.…` calls being extracted as classes.

## Generated code — never hand-edit

| Output                         | Command                  | Notes                            |
| ------------------------------ | ------------------------ | -------------------------------- |
| `src/lib/paraglide/`           | `pnpm paraglide:compile` | also runs on dev/build           |
| `src/lib/api/proto/generated/` | `pnpm proto:generate`    | buf + `buf.gen.yaml`; gitignored |
| `wasm/pakop/bin`, `obj`        | `pnpm build:pakop`       | needs .NET 10 SDK + `wasm-tools` |

i18n sources are `messages/*.json`; only `en`, `th`, `id` are compiled (`project.inlang/settings.json`). Protobuf runtime is `@bufbuild/protobuf`. The C#/CUE4Parse WASM module at `wasm/pakop/` is a workspace package (`wasm/*` glob) consumed by lazy `await import('pakop')`.

## Tooling

- Node ≥ 22 (`.nvmrc` is `lts/*`), pnpm ≥ 11 with `engineStrict: true` — a mismatch fails install.
- Lint = Prettier check + ESLint (`eslint.config.js`, which also bans `zod`, `date-fns/*` and `react` imports). Types = `svelte-check`. Tests = Vitest, browser project on Playwright Chromium. Hooks = lefthook.
- Storybook 10: `pnpm storybook`, `pnpm build:storybook`.

```bash
pnpm dev            # dev server (dev:host to expose)
pnpm build          # static build → build/   (pnpm preview to serve it)
pnpm format         # write formatting
pnpm lint           # prettier --check + eslint
pnpm check          # svelte-check
pnpm test           # vitest run, both projects
```
