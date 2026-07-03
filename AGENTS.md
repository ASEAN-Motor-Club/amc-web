# ASEAN Motor Club Web - AI Coding Agent Instructions

A **SvelteKit static/SPA hybrid** site using **Svelte 5** (runes) with TypeScript, UnoCSS (Wind4 preset), and Paraglide i18n, built for the ASEAN Motor Club community.

## Agent Skills

Detailed guidance has been split into skills under `.agents/skills/`. Read the relevant skill before working in its area:

**Core**

| Skill                                                          | Read it when…                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [architecture](.agents/skills/architecture/SKILL.md)           | Making build, config, i18n-pipeline, WASM, or deployment-related changes        |
| [project-structure](.agents/skills/project-structure/SKILL.md) | Adding new files or locating existing code                                      |
| [path-aliases](.agents/skills/path-aliases/SKILL.md)           | Writing imports (`$lib`, `$messages`, `pakop`)                                  |
| [codebase-patterns](.agents/skills/codebase-patterns/SKILL.md) | Writing any code (style rules, runes, props, class merging, i18n, icons, tests) |
| [i18n-paraglide](.agents/skills/i18n-paraglide/SKILL.md)       | Adding or changing any user-facing text (messages, locales, fonts)              |
| [app-shell](.agents/skills/app-shell/SKILL.md)                 | Changing global head tags, SEO metadata, fonts, or hooks                        |
| [env-config](.agents/skills/env-config/SKILL.md)               | Adding configuration or touching `.env` (PUBLIC\_\* vs VITE\_\*)                |
| [testing](.agents/skills/testing/SKILL.md)                     | Writing or running tests (browser `comp` vs node `unit` projects)               |
| [git-hooks](.agents/skills/git-hooks/SKILL.md)                 | Committing or debugging a failed pre-commit hook (lefthook pipeline)            |

**Features**

| Skill                                            | Read it when…                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| [api-layer](.agents/skills/api-layer/SKILL.md)   | Adding any network call (fetch, polling, SSE, WebSocket)                |
| [map-system](.agents/skills/map-system/SKILL.md) | Touching `src/lib/ui/OlMap`, `EditorOlMap`, or `src/lib/components/Map` |
| [pakop-wasm](.agents/skills/pakop-wasm/SKILL.md) | Touching `wasm/pakop` or the `/pak` routes                              |

**Libraries** (read before using the library)

| Skill                                                            | Library                                     |
| ---------------------------------------------------------------- | ------------------------------------------- |
| [zod](.agents/skills/zod/SKILL.md)                               | `zod/mini` validation schemas               |
| [openlayers](.agents/skills/openlayers/SKILL.md)                 | `ol` maps                                   |
| [date-fns](.agents/skills/date-fns/SKILL.md)                     | Dates and reactive current time             |
| [gsap](.agents/skills/gsap/SKILL.md)                             | Scripted animations                         |
| [lottie](.agents/skills/lottie/SKILL.md)                         | `lottie-web` vector animations              |
| [lodash](.agents/skills/lodash/SKILL.md)                         | `lodash-es` + `src/lib/utils` helpers       |
| [markdown-rendering](.agents/skills/markdown-rendering/SKILL.md) | `marked` + `dompurify` (XSS-safe markdown)  |
| [protobuf](.agents/skills/protobuf/SKILL.md)                     | `@bufbuild/protobuf` + buf codegen          |
| [svelte-portal](.agents/skills/svelte-portal/SKILL.md)           | Overlays (modals, tooltips, popovers)       |
| [quaternion](.agents/skills/quaternion/SKILL.md)                 | Rotation math in the track editor           |
| [class-merging](.agents/skills/class-merging/SKILL.md)           | `clsx` + `tailwind-merge` for `class` props |

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
