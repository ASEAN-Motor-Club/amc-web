# ASEAN Motor Club Web - AI Coding Agent Instructions

A **SvelteKit static/SPA hybrid** site using **Svelte 5** (runes) with TypeScript, UnoCSS (Wind4 preset), and Paraglide i18n, built for the ASEAN Motor Club community.

## Agent Skills

Detailed guidance has been split into skills under `.agents/skills/`. Read the relevant skill before working in its area:

## Essential Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm dev:host            # Start dev server with host access
pnpm storybook           # Component development

# Build & Deploy
pnpm build               # Build the static site (outputs to build/)
pnpm preview             # Preview built site locally
pnpm preview:host        # Preview built site with host access
pnpm paraglide:compile   # Regenerate i18n messages
pnpm proto:generate      # Regenerate _pb.ts files from .proto definitions
cargo xtask build-pakop        # Build pakop WASM module (release)
cargo xtask build-pakop --dev  # Build pakop WASM module (dev, fast)

# Quality Checks
pnpm format              # Prettier formatting
pnpm lint                # Prettier check + ESLint
pnpm lint:fix            # Auto-fix ESLint issues
pnpm check               # TypeScript + Svelte check
pnpm check:watch         # TypeScript + Svelte check in watch mode
pnpm test                # Run all tests once. Prefer this — no watcher to terminate
pnpm test:unit           # Run tests in watch mode
pnpm build:storybook     # Build Storybook for deployment
```

## Common Gotchas

1. **UnoCSS compatibility**: Some Tailwind classes don't exist in UnoCSS — refer to the Wind4 preset documentation. The Uno config also blocklists patterns that collide with paraglide message calls.
2. **i18n**: Never hardcode user-facing strings — always use `m['key']()` imported from `$messages`.
3. **Svelte 5**: Use runes syntax only; no legacy `$:` reactive statements or `export let`.
4. **Context**: UI components often depend on parent context (`InputGroup`, `Select`, `Button`→`Icon`, etc.) — check the colocated `context.ts`.
5. **Static generation**: The site must remain statically buildable (adapter-static with SPA fallback; `prerender = 'auto'`).
6. **Generated code**: Never hand-edit `src/lib/paraglide/`, `src/lib/api/proto/generated/`, or `wasm/*/pkg/` — regenerate them instead.
