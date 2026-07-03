---
name: codebase-patterns
description: Required coding patterns for the AMC web repo — code style (const enums only, no magic numbers, no useless comments), Svelte 5 runes, component prop conventions, class merging, context composition, i18n usage, icons, stories, and testing. Read before writing or modifying any code.
---

# Codebase Patterns

## Code style (required)

- **Only `const enum`, never full `enum`**: `export const enum PointType { … }` (see `src/lib/components/Map/types.ts`, `src/lib/api/types.ts`). The only full `enum`s in the repo are in generated protobuf code — never write one by hand.
- **Never magic numbers**: extract them to named constants (e.g. `MAP_REAL_SIZE` in `src/lib/ui/OlMap/utils.ts`) or pull existing values from `$lib/tw-var` / `src/lib/data`. This applies to coordinates, durations, thresholds, and sizes alike.
- **Never uselessly comment code**: no comments that restate what the code does, no commented-out code left behind. Comment only non-obvious constraints or reasoning; document component props with JSDoc (see below).

## Svelte 5 (required)

- Use runes only: `$props`, `$state`, `$derived` / `$derived.by`, `$effect`. Never use legacy `$:` reactive statements or `export let`.
- Use snippets (`{#snippet}` / `{@render}`) instead of legacy slots.
- Reactive helper modules use the `.svelte.ts` suffix (e.g. `src/lib/realtimeDate.svelte.ts`, `src/lib/utils/media.svelte.ts`).

## Component props

- Export a typed props interface/type from the component; document each prop with a JSDoc comment.
- A `class` prop must be typed as `ClassValue` from `svelte/elements`.
- When merging a prop class into existing classes, use `twMerge(existing, clsx(propsClass))`.

Minimal example (`src/lib/ui/TextSkeleton/TextSkeleton.svelte` style):

```svelte
<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export type TextSkeletonProps = {
    /** CSS class to apply to the component */
    class?: ClassValue;
  };

  const { class: propsClass }: TextSkeletonProps = $props();
</script>

<span class={twMerge('inline-block animate-pulse rounded-md bg-gray-500/20', clsx(propsClass))}
  >.</span
>
```

## Context composition

UI components compose via Svelte context, with a colocated `context.ts` exporting `set…Context` / `get…Context` helpers (see `src/lib/ui/InputGroup/context.ts`, `Button/context.ts`, `Select/context.ts`). Examples: `InputGroup` provides context consumed by `TextInput`, `Select`, `Slider`; `Button` provides icon-size context consumed by `Icon`. Check for a parent context before adding new sizing/state props.

## Internationalization (required)

Every user-facing string must go through Paraglide:

```svelte
<script lang="ts">
  import { m } from '$messages';
</script>

<h1>{m.site_name()}</h1><p>{m['radio.title']()}</p>
```

- Use `m['key.with.dots']()` bracket syntax for namespaced keys.
- Add new messages to `messages/en.json` (and other locales where possible); the Vite plugin recompiles automatically, or run `pnpm paraglide:compile`.
- Never hardcode user-facing text; never edit `src/lib/paraglide/` by hand.
- Full workflow (locale strategy, URL delocalization, fonts): see [[i18n-paraglide]].

## Icons

Use the `Icon` component (`src/lib/ui/Icon`) with Material Symbols iconify classes:

```svelte
<Icon class="i-material-symbols:favorite-outline-rounded" size="sm" />
```

- Prefer `-rounded` suffix variants when available.
- `size` is `'xs' | 'sm' | 'md' | 'lg'` (default `'md'`) or a raw `!text-…` class; inside a `Button`, size comes from the button's context automatically.

## Styling

- UnoCSS Wind4 (Tailwind v4 syntax) utility classes; some Tailwind classes may not exist in UnoCSS — check the Wind4 preset docs if a class has no effect.
- For colors needed in JS/TS (e.g. OpenLayers styles, canvas), import from `$lib/tw-var` (oklch values) instead of hardcoding.

## Stories & tests

- Every UI component gets a colocated `<Name>.stories.svelte` (Storybook, `@storybook/addon-svelte-csf`).
- Component tests run with Vitest + Playwright browser provider (`vitest-browser-svelte`); pure utilities get colocated `.test.ts` files (see `src/lib/utils/`).
- Run `pnpm test` (single run) rather than `pnpm test:unit` (watch mode) when verifying.

Related: [[class-merging]], [[testing]], [[project-structure]], [[path-aliases]]
