---
name: architecture
description: High-level architecture of the AMC web app — SvelteKit static/SPA hybrid, Vite plugin pipeline, i18n strategy, WASM modules, dev-server proxies. Read before making structural or build-related changes.
---

# Architecture

This is a **SvelteKit** site using **Svelte 5** with TypeScript, built for the ASEAN Motor Club community.

## Rendering & deployment model

- Uses `@sveltejs/adapter-static` with `fallback: 'fallback.html'` — a **hybrid**: pages are prerendered where possible (`export const prerender = 'auto'` in `src/routes/+layout.ts`), and everything else runs as an SPA via the fallback page.
- Build outputs to `build/`. The site must remain statically buildable — no server-side runtime.
- Prerender HTTP errors throw, except for `/stream` (explicitly ignored in `svelte.config.js`).

## Build pipeline (`vite.config.ts`)

Plugins, in order: `vite-plugin-wasm` → UnoCSS → SvelteKit → Paraglide → `vite-bundle-analyzer` (disabled on CI) → custom `webmanifestPlugin` (from `vite-plugins/webmanifest.ts`).

Dev server proxies (targets from `VITE_*` env vars):

- `/stream` → `VITE_MAIN_SITE`
- `/icecast-status` → `VITE_ICE_CAST` (rewritten to `/status-json.xsl`)
- `/login/token` → `VITE_API_BASE` (rewritten to `/api/login/token`)

## Internationalization (Paraglide)

- Source messages live in `messages/{en,id,ms,th,tl,vi}.json`; compiled output in `src/lib/paraglide/` (generated — never edit manually).
- Compiled by the Paraglide Vite plugin during dev/build, or manually with `pnpm paraglide:compile`.
- Locale strategy: `['custom-svelteReactiveLocale', 'baseLocale']`, persisted in localStorage key `siteLocale`.
- URL delocalization happens in `src/hooks.ts` via `reroute` + `deLocalizeUrl`.

## Styling (UnoCSS)

- UnoCSS with the **Wind4 preset** (Tailwind v4-style syntax), configured via the shared `amc-uno-css-config` package (a GitHub dependency) and extended in `unocss.config.ts`.
- Uses the UnoCSS **Vite plugin** with `@unocss/extractor-svelte` (not svelte-scoped mode).
- `unocss.config.ts` has a blocklist to avoid false-positive class extraction (e.g. paraglide `m.` / `m['...']` calls, bare `m2`/`w10`-style tokens).

## WASM (Rust)

- Rust crates live at the repo root: `wasm/pakop/` (plus `xtask/` for build orchestration; Cargo workspace at root `Cargo.toml`).
- Built with `cargo xtask build-pakop` (release) or `cargo xtask build-pakop --dev` (fast dev build); extra args are forwarded to `wasm-pack build --target bundler`.
- Output goes to `wasm/pakop/pkg/`, exposed as the pnpm workspace package `pakop` (`pnpm-workspace.yaml` includes `wasm/**`; the app depends on `pakop: workspace:*`).
- Consumed via lazy dynamic import: `await import('pakop')` (see `src/routes/pak/`).

## Protobuf

- `.proto` definitions in `src/lib/api/proto/`; generated `_pb.ts` files in `src/lib/api/proto/generated/` via `pnpm proto:generate` (buf, config in `buf.gen.yaml`). Runtime is `@bufbuild/protobuf`.

## Tooling

- pnpm ≥ 11, Node ≥ 22. Lint = Prettier check + ESLint (`eslint.config.js`). Git hooks via lefthook (`lefthook.yml`).
- Testing: Vitest with the Playwright browser provider (`@vitest/browser-playwright`, chromium) for component tests in a real browser; plain node tests for pure TS.
- Storybook 10 (`pnpm storybook`) for UI component development.

Related: [[project-structure]], [[path-aliases]], [[app-shell]], [[env-config]], [[pakop-wasm]]
