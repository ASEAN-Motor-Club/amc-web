---
description: App shell — prerender-time head injection in hooks.server.ts, the app.html placeholders and theme bootstrap, URL delocalization, asset import suffixes.
globs:
  - src/hooks.ts
  - src/hooks.server.ts
  - src/app.html
  - src/globals.d.ts
  - vite-plugins/**
---

# App shell, head & SEO

**Global head tags belong in `src/hooks.server.ts`, not `+layout.svelte`.** Per-page tags use `<svelte:head>` via `src/lib/components/CommonHead/`.

`hooks.server.ts` runs at prerender/build time and sequences two handles: `handleParaglide` fills the `%lang%` / `%dir%` placeholders, then `handleStaticHead` replaces `%app.statichead%` with theme-color metas, localized SEO/OpenGraph/Twitter metas, font preloads and icons. Adding a locale with a non-Latin script means adding its font there.

`handleStaticHead` also emits the absolute canonical link and `og:url` (from `event.url`, made absolute by Kit's `paths.origin` = `siteOrigin` in `src/lib/data/site.ts`; skipped for the `/[fallback]` SPA page), absolute `og:image`/`twitter:image`, and schema.org `Organization`/`WebSite` JSON-LD via the escaping `jsonLd()` helper. `static/robots.txt` and the prerendered `src/routes/sitemap.xml/+server.ts` complete the SEO surface — conventions in `rule://a11y-seo`.

The web app manifest is the prerendered `src/routes/manifest.webmanifest/+server.ts` (localized names from `#messages`, icons via `?no-inline` imports, colors from `#lib/tw-var.ts`), linked by `handleStaticHead`. Keep it in Kit, not a Vite plugin: Kit 3's adapter writes `build/` after Vite's `closeBundle`, so a plugin can't patch the prerendered HTML.

`src/app.html` also carries an inline blocking script that applies dark mode from `localStorage` before first paint — keep it inline and blocking, or the page flashes.

Asset imports need an explicit suffix:

- `?no-inline` — force a file URL instead of base64 inlining (anything referenced from a head string).
- `?url` — import the URL of a non-JS asset (deferred stylesheets, usmap mappings, the .NET `_framework` assets).

`src/globals.d.ts` holds the `@fontsource*` module declarations that keep those imports typechecking; a new font package pattern may need an entry.

`src/hooks.ts` exports `reroute` only — `deLocalizeUrl` strips the locale prefix so route files never see locale segments.
