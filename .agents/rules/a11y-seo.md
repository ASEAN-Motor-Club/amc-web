---
description: Accessibility and SEO conventions — accessible names for icon-only controls, ARIA on the shared ui components, no a11y suppressions, skeleton/loading semantics, per-page head tags, sitemap/robots/canonical wiring.
globs:
  - src/**/*.svelte
  - src/hooks.server.ts
  - src/lib/data/site.ts
  - static/robots.txt
---

# Accessibility & SEO

Enforced by the e2e smoke suite `src/routes/site.e2e.ts` (`pnpm build && pnpm test:e2e`, also a CI job that gates deploy): on every `sitemapPaths` route at 412px and 1440px it requires zero axe-core violations (WCAG 2.1 A/AA + best-practice — what Lighthouse scores) and an accessible name on every Tab stop, plus complete SEO head tags in the prerendered HTML, robots.txt and sitemap.xml. When you add a route, menu or overlay, extend that suite rather than checking by hand. Markup changes for a11y can shift layout — follow up with the `visual-diff` skill.

## Accessibility

**Accessible names.** Every control needs a name a screen reader can announce.

- Icon-only `Button` (`icon` prop, or children that are only an `<Icon>`) must pass `aria-label={m['…']()}`. Labels live under the `a11y.*` message namespace unless a fitting message already exists (`action.close`, a page title, …).
- `Button` forwards `aria-label`, `aria-expanded`, `aria-current`. Toggles set `aria-expanded`; the active page/date sets `aria-current`.
- `Select` and `Slider` take `aria-label`; inside an `InputGroup` they fall back to its label. A `TextInput` outside an `InputGroup` uses its placeholder as `aria-label` (the placeholder alone disappears once typed into); override with `additionalAttributes={{ 'aria-label': … }}` when the placeholder is an example rather than a description.
- `Modal` needs a name: `aria-labelledby` pointing at its heading (`const titleId = $props.id()`), or `aria-label` when it has none.
- Never hardcode the label text — it is user-facing, it comes from `#messages` (see `rule://i18n`).

**Semantics before ARIA.**

- Something clickable is a `<button type="button">` or an `<a href>`. Never put `onclick` on a `div`/`li`/`span`; Svelte's `a11y_*` warnings are errors in spirit — **do not add `<!-- svelte-ignore a11y_… -->`**, fix the markup (wrap the content in a button, move the handler to a list item, …).
- Do not nest interactive elements (input inside button, link inside button). Overlay a sibling button instead — see `Select.svelte`.
- `Button` never sets a role for `a`/`button`; `tag="div"` is presentational unless it has `onClick` (then it becomes `role="button"` + `tabindex="0"`). A disabled `tag="a"` gets `aria-disabled` + `tabindex=-1`, not `disabled`.
- Lists of items are `<ul>/<li>` (navbar, feature chips). Landmarks: one `<nav aria-label>`, one `<main id="main-content">`, sections that matter get `aria-labelledby` their heading. Keep one `<h1>` per page and don't skip heading levels.
- `Modal` is already `role="dialog" aria-modal="true"` and closes on Escape — don't build ad-hoc overlays.

**Decorative vs. meaningful.**

- `Icon` is `aria-hidden` unless it has a `title` (then it's `role="img"`). Pass `title` only when the icon conveys information not present in nearby text.
- Decorative media (background video, ornament images) get `aria-hidden="true"` / `alt=""`; meaningful images get a translated `alt`.
- Skeletons (`TextSkeleton`, `Card loading`) are hidden from AT; a loading `Card` exposes `aria-busy` + a visually-hidden status. Placeholder text kept for sizing must stay `invisible`/`inert` — never just `text-transparent` on focusable content.

**Keyboard.** Everything reachable by mouse must be reachable by Tab and operable with Enter/Space (sliders: arrows/Home/End). Hover-only menus also open on focus (`NavbarItem` uses `focusin`/`focusout`). Visually hidden helpers use `sr-only`; things that appear on focus (the skip link) slide in with `translate` rather than toggling `sr-only`, which would reflow the page.

**Contrast.** Text needs 4.5:1 (3:1 for ≥24px or ≥18.7px bold), including tinted states such as active tabs and dimmed labels. Brand colours fail easily: Discord `#5865f2` with white text or as text on its own 15% tint is below 4.5:1 — use `#4e5ae8` as a background and `#4752c4` as text (light theme). Use `-800` text on `-800/20` tints, not `-700`.

**High contrast (`prefers-contrast: more`).** Every sitemap route must reach 7:1 text contrast in both themes when the OS asks for more contrast; the e2e suite checks it (axe `color-contrast-enhanced`, light and dark, 1440px).

- Muted `text-text-*` needs nothing: `src/app.css` remaps the tokens — 100–400 lighter, 600–900 darker, 500 per theme. That only holds while light tokens sit on dark surfaces and dark tokens on light ones; never put `text-text-300` on a light surface.
- Coloured text (brand, `primary`/`danger`, active-tab tints) needs a `contrast-more:` shade, plus `dark:contrast-more:` when the dark theme uses a different colour — a bare `contrast-more:` would override the `dark:` one. `Button`'s `outlined`/`text` variants already do.
- Translucent surfaces over imagery (the map's `bg-gray-900/50` controls) go opaque with a visible ring: `contrast-more:bg-gray-950!`, `contrast-more:ring-white/60!`, and a `contrast-more:hover:`/`focus:` shade so states still differ.

## SEO

- Global head tags (description, OpenGraph/Twitter image, canonical, `og:url`, schema.org JSON-LD) are injected at prerender time in `src/hooks.server.ts` — see `rule://app-shell`. Don't duplicate them in `+layout.svelte`.
- Every page sets, in `<svelte:head>`: `<title>`, `<meta property="og:title">` and `<meta name="twitter:title">` with the same localized value. OpenGraph uses `property=`, Twitter uses `name=`.
- Absolute URLs come from `siteOrigin` in `src/lib/data/site.ts`; Kit's `paths.origin` is set from it so prerendered `event.url`/`page.url` are absolute. Canonical/`og:url` are skipped on the SPA fallback (`/[fallback]`).
- A new indexable, non-parameterized route must be added to `sitemapPaths` in `src/lib/data/site.ts` (it feeds the prerendered `/sitemap.xml`). `static/robots.txt` points at the sitemap — keep the origin in both in sync.
- JSON-LD goes through the `jsonLd()` helper, which escapes `<`. Never interpolate unescaped strings into a `<script>`.
