---
name: a11y-seo-audit
description: Audit the built site for accessibility (axe-core, the engine behind Lighthouse) and SEO (robots, sitemap, canonical, OpenGraph/Twitter, JSON-LD), check keyboard reachability, and visually diff pages against main to catch layout regressions. Use after changing shared ui components, layout, navigation or head tags, when fixing a PageSpeed/Lighthouse finding, or when asked to make the site more accessible or SEO friendly.
---

# A11y & SEO audit

Conventions to follow while writing code are in `.agents/rules/a11y-seo.md` — read it first. This skill is the verification loop. Static checks (`pnpm check` surfaces Svelte `a11y_*` warnings) are necessary but not sufficient: run the built site.

Scripts live next to this file in `scripts/` and need only the repo's `playwright` (axe-core is fetched once into the OS temp dir). Run them with `node` from the repo root. `$SKILL` below means `.claude/skills/a11y-seo-audit`.

## 1. Build

```bash
pnpm build
```

- Needs a `.env` — copy `.env.example` if missing (don't commit it).
- Needs the pakop WASM output. If `dotnet` is unavailable, a stub is enough for auditing: `mkdir -p wasm/pakop/bin/Release/net10.0/wwwroot/_framework && echo 'export const dotnet = {};' > wasm/pakop/bin/Release/net10.0/wwwroot/_framework/dotnet.js` — delete `wasm/pakop/bin` afterwards (it is gitignored, but don't leave a fake build around).
- Copy the result somewhere stable (`cp -r build <scratch>/build-branch`) before building another revision.

## 2. Serve

```bash
node $SKILL/scripts/serve.mjs build 4174
```

Static server with the SPA fallback (`fallback.html`), like production. **Do not reuse `vite preview` across rebuilds** — it keeps serving the old asset list and every CSS file 404s, which shows up as bogus contrast/label violations. Start a fresh server (new port) per build.

## 3. SEO check (static, on the build dir)

```bash
node $SKILL/scripts/seo-check.mjs build
```

Verifies `robots.txt` → sitemap, every sitemap URL has a prerendered page, and each prerendered page has a title, description, absolute canonical + `og:url`, `og:title` with `property=`, `twitter:title`, absolute `og:image`, and valid JSON-LD. Exits non-zero on failure.

## 4. Accessibility audit

```bash
node $SKILL/scripts/audit.mjs http://localhost:4174
node $SKILL/scripts/audit.mjs http://localhost:4174 --routes /,/radio --widths 412,1440 --theme dark
```

Runs axe-core (WCAG 2 A/AA + best-practice) on each sitemap route at phone and desktop width, then a keyboard pass: it tabs through the page and reports the focus order and any focusable element without an accessible name. Exits non-zero on violations. `--verbose` prints the offending HTML.

Fixing findings — common causes in this codebase:

| axe id                           | usual fix                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `button-name`, `link-name`       | icon-only `Button` missing `aria-label={m['a11y.…']()}`                                         |
| `nested-interactive`             | input/link inside a button — overlay a sibling button (`Select.svelte`)                         |
| `aria-input-field-name`, `label` | `Slider`/`Select`/`TextInput` without `aria-label` or `InputGroup`                              |
| `aria-allowed-role`              | a role forced onto an element that already has one                                              |
| `color-contrast`                 | darken the background/foreground; brand colours are a design call — flag, don't silently change |

New label strings go in `messages/{en,th,id}.json` under `a11y`, then `pnpm paraglide:compile`.

## 5. Visual regression vs. main

A11y fixes change markup and wrappers, which silently changes layout (e.g. moving an element out of a `w-full` button broke the Select width). Always compare against main:

```bash
git stash -u   # or use a worktree
git checkout main && pnpm build && cp -r build <scratch>/build-main
git checkout - && git stash pop && pnpm build && cp -r build <scratch>/build-branch
node $SKILL/scripts/serve.mjs <scratch>/build-main 5001 &
node $SKILL/scripts/serve.mjs <scratch>/build-branch 5002 &
node $SKILL/scripts/screens.mjs http://localhost:5001 <scratch>/shots/main
node $SKILL/scripts/screens.mjs http://localhost:5002 <scratch>/shots/branch
node $SKILL/scripts/compare.mjs <scratch>/shots/main <scratch>/shots/branch <scratch>/shots/cmp
```

`screens.mjs` captures every sitemap route at 412px and 1440px in light theme with reduced motion, plus interaction states (navbar dropdowns, mobile menu, settings menu, open select, skip link focused). `compare.mjs` prints the changed-pixel count and bounding box per screenshot and writes side-by-side images (main left, branch right) for every one that changed. **Look at each changed image** (Read the PNG). Live data — player counts, rent timers, map markers, job timers, the home video frame — differs between runs and is not a regression; everything else must be explained by an intended change.

## 6. Report

State what was run and what it found: violations fixed, violations left (with why — e.g. brand contrast), visual diffs and their cause, and anything not covered (dark mode, file-driven pages such as `/pak` results, authenticated views).
