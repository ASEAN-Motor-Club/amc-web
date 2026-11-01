---
description: Required TypeScript/Svelte 5 style — const enums, runes, props interfaces, class merging, context composition, icons, banned imports, file placement.
globs:
  - src/**/*.ts
  - src/**/*.svelte
---

# Code style

## TypeScript

- `const enum`, never a plain `enum`.
- No magic numbers — name them, or take them from `#lib/tw-var.ts` / `src/lib/data`.
- Comment only non-obvious constraints; never restate code, never leave commented-out code.
- Banned imports (eslint `no-restricted-imports`, type imports allowed): `zod` → `zod/mini`, `date-fns` → `#lib/date.ts`, `react`.
- Imports: `#lib/*` → `src/lib/*` and `#messages` → `src/lib/paraglide/messages.js`, both Node subpath imports in `package.json` `imports` (Kit 3 dropped `$lib` and deprecated `kit.alias`; there are no tsconfig `paths`). Every local specifier — `#lib` and relative — names the real file on disk: `.ts` for TS modules (`#lib/date.ts`, `./locale.svelte.ts`), `.js` only for files that are actually `.js` (paraglide output), `.svelte` for components, and `/index.ts` spelled out for barrels (never `'.'`). `allowImportingTsExtensions` comes from `$app/tsconfig`. Enforced by eslint `import-x/extensions` (resolved through `eslint-import-resolver-typescript`; `$app/*` ignored). Its suggestion for a `.js` → `.ts` mismatch appends instead of replacing (`date.js.ts`) — fix those by hand. Import components by full path — `MarkdownText` is the only barrel.

## Svelte 5

- Runes only (`$props`, `$state`, `$derived` / `$derived.by`, `$effect`). No `$:`, no `export let`, no slots — use `{#snippet}` / `{@render}`.
- Modules holding reactive state end in `.svelte.ts`.
- Props: `export interface <Name>Props`, one JSDoc line per prop, destructured from `$props()`.
- `class` props are `ClassValue` from `svelte/elements`, merged `twMerge(base, clsx(propsClass))` — wrap in `$derived` when the base is stateful.
- Before adding a prop, check the component's colocated `context.ts`: `InputGroup`, `Button`, `Select` and `Table` push sizing and layout down through context.

```svelte
<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export interface TextSkeletonProps {
    /** CSS class to apply to the component */
    class?: ClassValue;
  }

  const { class: propsClass }: TextSkeletonProps = $props();
</script>

<span class={twMerge('inline-block animate-pulse rounded-md bg-gray-500/20', clsx(propsClass))}>
</span>
```

## Icons & styling

- `<Icon class="i-material-symbols:…-rounded" size="sm" />` — `class` is required; inside a `Button` the button context **overrides** `size`.
- UnoCSS Wind4 utilities; a class with no effect usually doesn't exist in the preset. Values needed from TS come from `#lib/tw-var.ts`.
