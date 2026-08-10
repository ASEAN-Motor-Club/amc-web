# ASEAN Motor Club Web - AI Coding Agent Instructions

A **SvelteKit static/SPA hybrid** site using **Svelte 5** (runes) with TypeScript, UnoCSS (Wind4 preset), and Paraglide i18n, built for the ASEAN Motor Club community.

## Where the guidance lives

`.agents/rules/*.md` — one rule per area, listed with their globs in your prompt. Read the ones matching the files you are about to touch, and `rule://architecture` before anything structural. Prefer `glob`/`read` over any doc for what currently exists on disk.

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
