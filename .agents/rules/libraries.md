---
description: Which library to reach for — dates via $lib/date, es-toolkit utilities, markdown through MarkdownText, portal action for overlays, Lottie wrapper, GSAP only for timelines.
globs:
  - src/**/*.ts
  - src/**/*.svelte
---

# Library choices

## Dates — `$lib/date`

Importing `date-fns` directly is an eslint error. `src/lib/date.ts` is a re-export barrel with a fixed allowlist (`addMilliseconds`, `eachDayOfInterval`, `isSameDay`, `isBefore`, `isAfter`, `isSameYear`, `intervalToDuration`, `differenceInSeconds`, `isValid`, `max`, `min`) plus locale-injecting wrappers for `format`, `formatDistanceStrict`, `formatDuration`. Need another function? Extend the barrel.

The wrappers resolve the locale themselves via `getDateFnsLocale()` (`enUS | th | id`, switched on the paraglide locale) and take `Omit<FormatOptions, 'locale'>` — callers cannot and need not pass one.

For a reactive "now", read `rtDate.d` from `src/lib/realtimeDate.svelte.ts`. It is a plain `$state` object updated by a single `requestAnimationFrame` loop in `src/routes/+layout.svelte`; never start your own interval.

## Utilities — `src/lib/utils/` first, then `es-toolkit`

`src/lib/utils/` holds `portal`, `delivery`, `filterSubsets`, `status`, `parsePlayerRole`, `getMtLocale`, `media.svelte` (the `isMouse` / `isLg` / `isSm` `MediaQuery` instances), `formatTime`, `cssTransitionToMs`, `colorContrast`, `clientSearchParamsGet`, `math/vectors`, `math/rotation/normalized`. Import es-toolkit from the package root (`import { debounce, isEqual } from 'es-toolkit'`) — it is already tree-shakeable. Don't use it for what modern JS does natively.

## Markdown — `MarkdownText`

All markdown and remote HTML goes through `src/lib/ui/MarkdownText/MarkdownText.svelte` (marked + DOMPurify). Props: `text`, `size` (`prose-sm` … `prose-2xl`), `noSanitize`, `textOnly`. `noSanitize` skips DOMPurify entirely and is only for static i18n text — never for user-generated content. Never `{@html}` untrusted content elsewhere; extend the component instead. It also carries custom marked extensions (Discord timestamps and mentions), forces `target="_blank" rel="noreferrer"` on links, and marks `/downloads/` hrefs as downloads.

## Overlays — the `portal` action

Floating UI renders outside the tree with `use:portal` from `src/lib/utils/portal.ts` (`use:portal={'body' | element}`, defaults to `body`, throws on an unmatched selector). `svelte-portal` is not a dependency and must not be reintroduced. Prefer extending `Modal` (`z-1000000`) or `Tooltip` (`z-1000001`) — both gate portalling behind a prop — and use `ClickAwayBlock` for dismiss-on-outside-click.

## Animation

- Svelte transitions or UnoCSS classes for ordinary motion; time them with `defaultTransitionDurationMs` from `$lib/tw-var` and `cssTransitionToMs`, and gate decorative motion on `prefersReducedMotion` from `svelte/motion`.
- GSAP is only for timeline choreography and is used in exactly one file, `src/routes/championship/+page.svelte`: `ScrollTrigger` registered in `onMount`, motion branched inside `gsap.matchMedia()` on `default` / `reduced` conditions, the context kept for cleanup.
- Pre-authored vector animations go through `src/lib/ui/Lottie/Lottie.svelte` (the `lottie_light` svg build) with JSON in `src/lib/assets/lottie/`; never import `lottie-web` in feature code.
