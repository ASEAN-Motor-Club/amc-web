---
description: Which library to reach for — dates through $lib/date, es-toolkit utilities, markdown through MarkdownText, the portal action for overlays, Lottie wrapper, GSAP only for timelines.
globs:
  - src/**/*.ts
  - src/**/*.svelte
---

# Library choices

## Dates — `$lib/date` only

Importing `date-fns` directly is an eslint error. `src/lib/date.ts` re-exports an explicit allowlist and wraps `format`, `formatDistanceStrict` and `formatDuration` with the active locale already injected — callers take `Omit<FormatOptions, 'locale'>` and must not pass one. Need another function? Extend the barrel.

For a reactive "now", read `rtDate.d` from `src/lib/realtimeDate.svelte.ts`; it is driven by one `requestAnimationFrame` loop in the root layout. Never start your own interval.

## Utilities

Check `src/lib/utils/` first, then `es-toolkit` (named imports from the package root — it is already tree-shakeable). Don't use either for what modern JS does natively.

## Markdown — `MarkdownText`

All markdown and remote HTML renders through `src/lib/ui/MarkdownText/MarkdownText.svelte` (marked + DOMPurify); it also handles Discord timestamps/mentions and link targets. Never `{@html}` untrusted content elsewhere — extend the component. Its `noSanitize` prop skips DOMPurify entirely and is only ever valid for static i18n text.

## Overlays — the `portal` action

Floating UI escapes the tree with `use:portal` from `$lib/utils/portal` (`use:portal={'body' | element}`). `svelte-portal` is not a dependency and must not be reintroduced. Prefer extending `Modal` or `Tooltip`, and use `ClickAwayBlock` for dismiss-on-outside-click.

## Animation

- Default to Svelte transitions or UnoCSS classes, timed with `defaultTransitionDurationMs` (`$lib/tw-var`) and `cssTransitionToMs`, and gated on `prefersReducedMotion` from `svelte/motion`.
- GSAP is only for timeline choreography. Register `ScrollTrigger` in `onMount`, branch motion inside `gsap.matchMedia()` on `default` / `reduced` conditions, and keep the context for cleanup.
- Pre-authored vector animations go through `src/lib/ui/Lottie/Lottie.svelte` (the `lottie_light` svg build) with JSON under `src/lib/assets/lottie/`. Never import `lottie-web` in feature code.
