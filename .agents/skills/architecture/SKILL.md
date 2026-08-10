---
name: architecture
description: High-level architecture of the AMC web app — SvelteKit static/SPA hybrid, Vite plugin pipeline, i18n strategy, WASM modules, dev-server proxies. Read before making structural or build-related changes.
---

# Architecture

This is a **SvelteKit** site using **Svelte 5** with TypeScript, built for the ASEAN Motor Club community.

## Rendering & deployment model

- Uses `@sveltejs/adapter-static` with `fallback: 'fallback.html'` — a **hybrid**: pages are prerendered where possible (`export const prerender = 'auto'` in `src/routes/+layout.ts`), and everything else runs as an SPA via the fallback page.
- Build outputs to `build/`. The site must remain statically buildable — no server-side runtime.

## Internationalization (Paraglide)

- Source messages live in `messages/{en,id,ms,th,tl,vi}.json`; compiled output in `src/lib/paraglide/` (generated — never edit manually).
- Compiled by the Paraglide Vite plugin during dev/build, or manually with `pnpm paraglide:compile`.
- Locale strategy: `['custom-svelteReactiveLocale', 'baseLocale']`, persisted in localStorage key `siteLocale`.
- URL delocalization happens in `src/hooks.ts` via `reroute` + `deLocalizeUrl`.

## Styling (UnoCSS)

- UnoCSS with the **Wind4 preset** (Tailwind v4-style syntax), configured via the shared `amc-uno-css-config` package (a GitHub dependency) and extended in `unocss.config.ts`.
- Uses the UnoCSS **Vite plugin** with `@unocss/extractor-svelte` (not svelte-scoped mode).
- `unocss.config.ts` has a blocklist to avoid false-positive class extraction (e.g. paraglide `m.` / `m['...']` calls, bare `m2`/`w10`-style tokens).

## WASM (C# / .NET)

- C# .NET 10 browser-WASM project at `wasm/pakop/` (`Pakop.csproj`, CUE4Parse-based; no Blazor).
- Built with `pnpm build:pakop` (`dotnet build -c Release`; required before `pnpm dev`/`pnpm build`); requires .NET 10 SDK + `dotnet workload install wasm-tools`. The pakop shim imports `dotnet.js` straight from the dotnet build output; the bundler-friendly `dotnet.js` statically imports all runtime assets, so Vite bundles them with hashed names into `_app/immutable/assets/`.
- The pnpm workspace package `pakop` is the committed shim `wasm/pakop/index.js`/`index.d.ts` (`pnpm-workspace.yaml` includes `wasm/**`; the app depends on `pakop: workspace:*`).
- Consumed via lazy dynamic import: `await import('pakop')` (see `src/routes/pak/`).

## Protobuf

- `.proto` definitions in `src/lib/api/proto/`; generated `_pb.ts` files in `src/lib/api/proto/generated/` via `pnpm proto:generate` (buf, config in `buf.gen.yaml`). Runtime is `@bufbuild/protobuf`.

## Tooling

- pnpm ≥ 11, Node ≥ 22 (lts). Lint = Prettier check + ESLint (`eslint.config.js`). Git hooks via lefthook (`lefthook.yml`).
- Testing: Vitest with the Playwright browser provider (`@vitest/browser-playwright`, chromium) for component tests in a real browser; plain node tests for pure TS.
- Storybook 10 (`pnpm storybook`) for UI component development.

Related: [[project-structure]], [[path-aliases]], [[app-shell]], [[env-config]], [[pakop-wasm]]
