---
name: i18n-paraglide
description: The full i18n workflow in the AMC web repo — Paraglide message usage (m from $messages), adding messages to messages/*.json, locale strategy, URL delocalization, and locale-aware fonts. Read before adding or changing any user-facing text.
---

# Internationalization (Paraglide)

## Using messages

Every user-facing string must go through Paraglide — never hardcode text:

```svelte
<script lang="ts">
  import { m } from '$messages';
</script>

<h1>{m.site_name()}</h1>
<p>{m['radio.title']()}</p>
<span>{m['track_editor.validate.waypoint_invalid']({ index: 1, key: 'x', type: 'number' })}</span>
```

- Use bracket syntax `m['key.with.dots']()` for namespaced keys; messages with parameters take an object argument.
- Import only from the `$messages` alias (see [[path-aliases]]).
- Works in `.ts` files too (e.g. zod error factories in `src/lib/schema/track.ts`, head tags in `src/hooks.server.ts`).

## Adding / editing messages

1. Add the key to `messages/en.json` (base locale) — and to the other locales (`id`, `ms`, `th`, `tl`, `vi`) where you can.
2. The Paraglide Vite plugin recompiles on dev/build; run `pnpm paraglide:compile` for a manual regen (also runs in the pre-commit hook).
3. Never edit `src/lib/paraglide/` — it is generated output.

Missing keys in a locale fall back to the base locale (`en`).

## Locale runtime

- Strategy (in `vite.config.ts`): `['custom-svelteReactiveLocale', 'baseLocale']` — a custom reactive strategy so locale switches update without reload; persisted under localStorage key `siteLocale`.
- URL delocalization: `src/hooks.ts` `reroute` strips locale prefixes via `deLocalizeUrl`, so route files never handle locale segments.
- At prerender time, `paraglideMiddleware` in `src/hooks.server.ts` sets `%lang%`/`%dir%` in `app.html`.
- The locale switcher UI lives in `src/lib/components/Locale/`; `getMtLocale` (`src/lib/utils/getMtLocale.ts`) maps the site locale for game/date use.

## Gotchas

- The UnoCSS blocklist (`unocss.config.ts`) explicitly excludes `m.…`/`m['…']` patterns from class extraction — keep message calls out of `class` attributes anyway.
- Per-script fonts (Thai, SC, JP, KR) are lazily loaded via `src/hooks.server.ts` — new locales with non-Latin scripts need a font entry there (see [[app-shell]]).

Related: [[path-aliases]], [[app-shell]], [[codebase-patterns]], [[git-hooks]]
