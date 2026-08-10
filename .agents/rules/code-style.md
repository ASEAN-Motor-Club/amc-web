---
description: Required TypeScript/Svelte 5 style — const enums, runes, props interfaces, class merging, context composition, icons, banned imports, aliases.
globs:
  - src/**/*.ts
  - src/**/*.svelte
---

# Code style

## TypeScript

- `const enum` only. The single plain `enum` is `VehicleKey` in `src/lib/api/proto/player_positions.proto`. Existing const enums: `api/types.ts`, `components/Map/Map/types.ts`, `components/Map/utils.ts`, `components/Championship/types.ts`, `utils/status.ts`.
- No magic numbers — name them (`MAP_REAL_SIZE` in `src/lib/ui/OlMap/utils.ts`) or read them from `$lib/tw-var` / `src/lib/data`.
- Comment only non-obvious constraints. Never restate code, never leave commented-out code. Props get JSDoc.
- Banned imports, enforced by eslint `no-restricted-imports` (type imports allowed): `zod` → use `zod/mini`; `date-fns` / `date-fns/*` → use `$lib/date`; `react`. The only disables are `src/lib/date.ts` and `src/lib/ui/MarkdownText/MarkdownText.svelte`.
- Aliases: `$lib` → `src/lib`, `$messages` → `src/lib/paraglide/messages` (the only `kit.alias`; `tsconfig.json` declares no `paths`). Import UI components by full path (`$lib/ui/Icon/Icon.svelte`) — `MarkdownText` is the only barrel.
- Check `src/lib/utils/` before writing a helper, then `es-toolkit` (named imports from the package root). New shared helper → `src/lib/utils/<name>.ts` with a colocated test.

## Svelte 5

- Runes only (`$props`, `$state`, `$derived` / `$derived.by`, `$effect`). No `$:`, no `export let`, no slots — use `{#snippet}` / `{@render}`.
- Modules holding reactive state end in `.svelte.ts` (`src/lib/realtimeDate.svelte.ts`, `src/lib/utils/media.svelte.ts`).
- Props: `export interface <Name>Props`, one JSDoc line per prop, destructured from `$props()`.
- `class` props are typed `ClassValue` from `svelte/elements` and merged as `twMerge(base, clsx(propsClass))` — wrap in `$derived` when the base depends on state. `Lottie` and `HighlightText` pass the class through raw; don't copy them.
- Look for a colocated `context.ts` before adding a prop: `InputGroup` (feeds TextInput/Select/Slider), `Button` (icon size), `Select`, `Table` (grid/row classes).

## Icons & styling

- `<Icon class="i-material-symbols:…-rounded" size="sm" />`. `class` is required; `size` is `xs | sm | md | lg` or a raw `!text-…` class, and inside a `Button` the button context **overrides** the prop.
- UnoCSS with `presetIcons`, `presetWind4`, `presetTypography` from `amc-uno-css-config` plus `transformerDirectives()` locally. Values needed in TS come from `$lib/tw-var` (oklch colors, `defaultTransitionDurationMs`).
- Storybook stories are colocated `<Name>.stories.svelte`. 14 of the 20 `src/lib/ui` components have one — Icon, MarkdownText, Table, TextSkeleton, ClickAwayBlock and Lottie don't.
