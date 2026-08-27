# ASEAN Motor Club Web - AI Coding Agent Instructions

A **SvelteKit static/SPA hybrid** site using **Svelte 5** (runes) with TypeScript, UnoCSS (Wind4 preset), and Paraglide i18n, built for the ASEAN Motor Club community.

## Where the guidance lives

`.agents/rules/*.md` — one rule per area, listed with their globs in your prompt. Read the ones matching the files you are about to touch, and `rule://architecture` before anything structural. Prefer `glob`/`read` over any doc for what currently exists on disk.

### Rule catalog (frontmatter digest)

If you cannot read the rule files directly, this catalog from their frontmatter tells you what each rule governs — read the matching rule file before touching those globs.

| Rule              | Applies to (globs)                                                                                     | Covers                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api-layer         | `src/lib/api/**`                                                                                       | TanStack Query option factories, the apiClient queryFn, reactive SSE/WebSocket stream wrappers, protobuf decoding                                                                                        |
| app-shell         | `src/hooks.ts`, `src/hooks.server.ts`, `src/app.html`, `src/globals.d.ts`, `vite-plugins/**`           | Prerender-time head injection, app.html placeholders and theme bootstrap, URL delocalization, asset import suffixes                                                                                      |
| architecture      | `package.json`, `vite.config.ts`, `svelte.config.js`, `pnpm-workspace.yaml`                            | Build and deploy model — static output, the generated trees and their commands, non-obvious Vite config knobs                                                                                            |
| code-style        | `src/**/*.ts`, `src/**/*.svelte`                                                                       | Required TS/Svelte 5 style — const enums, runes, props interfaces, class merging, context composition, icons, banned imports, file placement                                                             |
| env-config        | `.env*`, `vite.config.ts`, `.github/workflows/*.yml`                                                   | `PUBLIC_*` app config via `$env/static/public` vs `VITE_*` dev-proxy targets; the three places a new var must be registered                                                                              |
| git-hooks         | —                                                                                                      | The lefthook pre-commit pipeline — what runs on commit, what it does not cover, the pre-flight that avoids a failed commit                                                                               |
| i18n              | `src/**/*.ts`, `src/**/*.svelte`, `messages/*.json`                                                    | Paraglide — every user-facing string from `$messages`, message sources, locale runtime and delocalized URLs                                                                                              |
| libraries         | `src/**/*.ts`, `src/**/*.svelte`                                                                       | Which library to reach for — dates via `$lib/date`, es-toolkit utilities, markdown via MarkdownText, portal action for overlays, Lottie wrapper, GSAP only for timelines                                 |
| map               | `src/lib/ui/OlMap/**`, `src/lib/ui/EditorOlMap/**`, `src/lib/components/Map/**`, `src/routes/(map)/**` | OpenLayers (2D) in-game map — OlMap/OlMapWrapper/Map split and one-way data flow, game-world re-projection, WebGL layers, URL-driven selection; the experimental 3D map has its own rule                 |
| pakop-wasm        | `wasm/**`, `src/routes/pak/**`                                                                         | The pakop C#/.NET WASM module — when to rebuild, how to import it, build wiring keeping the dotnet runtime out of the main bundle                                                                        |
| project-structure | —                                                                                                      | Directory shape — what each top-level tree is for, the ui vs components split, where new files go                                                                                                        |
| schemas           | `src/lib/schema/**`                                                                                    | Validation schemas — zod/mini only (eslint-enforced), functional API, i18n-aware error factories, derived types                                                                                          |
| testing           | `src/**/*.test.ts`, `src/**/*.spec.ts`, `vitest.config.ts`                                             | Vitest setup — comp (browser components), inte (browser pages) and unit (node) projects, the file name that picks one, runes and harnesses in tests                                                      |
| three-map         | `src/lib/ui/ThreeMap/**`, `src/lib/components/Map/Map/ThreeMapWrapper.svelte`                          | Experimental 3D terrain map (three.js) — three-stage tile pipeline, quadtree LOD rings + altitude cap, inertial camera controls, instanced POI sprites, game-to-world coordinates via `gameCoordToWorld` |
| track-editor      | `src/lib/components/TrackEditor/**`, `src/lib/ui/CodeEditor/**`                                        | Track editor and its Monaco JSON view — code view is a view not a modal, three dirty flags, quaternion rotations, pinned monaco version and its single import choke point                                |

## Essential commands

```bash
pnpm dev                 # dev server (dev:host to expose)
pnpm build               # static build → build/ (preview / preview:host to serve)
pnpm storybook           # component development (build:storybook to deploy)

pnpm paraglide:compile   # regenerate i18n messages
pnpm proto:generate      # regenerate _pb.ts from .proto
pnpm build:pakop         # build the pakop WASM module; run before dev/build and after C# changes

pnpm format              # write formatting
pnpm lint                # prettier check + eslint (lint:fix to autofix)
pnpm check               # svelte-check (check:watch for watch mode)
pnpm test                # single run — prefer over test:unit, which watches
```

## Non-negotiables

- The site must stay statically buildable: adapter-static with SPA fallback, `prerender = 'auto'`.
- Never hand-edit `src/lib/paraglide/`, `src/lib/api/proto/generated/` or `wasm/pakop/bin|obj` — regenerate them.
- Never hardcode user-facing strings; they come from `$messages`.
- Runes only — no `$:`, no `export let`.
