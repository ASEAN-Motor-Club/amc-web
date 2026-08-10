---
description: App shell — hooks.server.ts prerender-time head injection (SEO, theme-color, font preloads, icons), app.html theme bootstrap, hooks.ts delocalization, asset import suffixes.
globs:
  - src/hooks.ts
  - src/hooks.server.ts
  - src/app.html
  - src/globals.d.ts
  - vite-plugins/**
---

# App shell, head & SEO

Global head changes go here, not in `+layout.svelte`. Per-page tags use `<svelte:head>` (see `src/lib/components/CommonHead/`).

## `src/hooks.server.ts` — runs at prerender/build time

Two handles in `sequence`:

1. `handleParaglide` — wraps the request in `paraglideMiddleware` and fills the `%lang%` / `%dir%` placeholders in `app.html`.
2. `handleStaticHead` — replaces `%app.statichead%` with generated tags:
   - `theme-color` for light/dark from `$lib/tw-var` (`colorBackground100` / `colorBackground900`)
   - SEO/OpenGraph/Twitter metas from paraglide messages (`m['home.desc_title']()`, `m.site_name()`), plus `apple-mobile-web-app-title` / `mobile-web-app-title` from `m.site_name_short()`
   - font preloads: Noto Sans latin woff2 preloaded; Thai/SC/JP/KR stylesheets lazily loaded with `rel=preload as=style` + onload swap
   - favicons and apple-touch / mobile-web-app metas

## `src/app.html`

`%app.statichead%` sits immediately before `%sveltekit.head%`. An inline blocking script bootstraps dark mode from `localStorage['theme']` before first paint — the only other piece of global head logic.

## `src/hooks.ts`

Exports `reroute` only: `deLocalizeUrl` strips the locale prefix so route files never see locale segments.

## Fonts

Self-hosted `@fontsource` packages (Noto Sans per script, Noto Sans Mono, Kanit, Koulen, Playfair Display, Great Vibes). `src/lib/font-sans-em.ts` is a side-effect import of Kanit + Koulen and belongs only in components that use the `font-sans-em` class. `src/globals.d.ts` declares the `@fontsource*` module shims that keep those imports typechecking.

## Asset import suffixes

- `?no-inline` — force a file URL instead of base64 inlining (fonts, splash, favicons referenced from head strings).
- `?url` — import the URL of a non-JS asset: deferred font stylesheets, `Mappings718.usmap` in the pak routes, and the `_framework/**` .NET assets rewritten by `vite-plugins/dotnet-wasm-asset.ts`.

## Vite plugins

`vite-plugins/` holds exactly two: `webmanifest.ts` (generates the manifest and injects its `<link>` into every built page) and `dotnet-wasm-asset.ts`.
