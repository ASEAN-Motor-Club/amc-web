---
name: visual-diff
description: Screenshot the built site on this branch and on main and pixel-diff them, to catch layout regressions that tests cannot judge. Use after changing shared ui components (Button, Select, TextInput, Modal, Card…), the navbar, the root layout or global styles — especially a11y/markup refactors that move or wrap elements — and before saying a UI change "doesn't break anything".
---

# Visual diff against main

Accessibility and SEO are covered by the automated e2e smoke suite (`pnpm build && pnpm test:e2e`, `src/routes/site.e2e.ts`; conventions in `.agents/rules/a11y-seo.md`). What it cannot tell you is whether a page still _looks_ right — markup refactors routinely change layout (e.g. moving an input out of a `w-full` button made the Select overflow its container). That needs a before/after comparison and a human-style judgement, which is this skill.

Scripts are in `scripts/` next to this file and need only `node` and the repo's `playwright`. `$SKILL` = `.agents/skills/visual-diff`, `<scratch>` = your scratch directory.

## 1. Build both revisions

```bash
git stash -u                      # or work from a git worktree
git checkout main && pnpm build && cp -r build <scratch>/build-main
git checkout - && git stash pop && pnpm build && cp -r build <scratch>/build-branch
```

- Needs a `.env` — copy `.env.example` if missing (don't commit it).
- Needs the pakop WASM output (`pnpm build:pakop`). Without `dotnet`, a stub is enough for screenshots: `mkdir -p wasm/pakop/bin/Release/net10.0/wwwroot/_framework && echo 'export const dotnet = {};' > wasm/pakop/bin/Release/net10.0/wwwroot/_framework/dotnet.js`, and delete `wasm/pakop/bin` afterwards.

## 2. Serve, screenshot, compare

```bash
node $SKILL/scripts/serve.mjs <scratch>/build-main 5001 &
node $SKILL/scripts/serve.mjs <scratch>/build-branch 5002 &
node $SKILL/scripts/screens.mjs http://localhost:5001 <scratch>/shots/main
node $SKILL/scripts/screens.mjs http://localhost:5002 <scratch>/shots/branch
node $SKILL/scripts/compare.mjs <scratch>/shots/main <scratch>/shots/branch <scratch>/shots/cmp
```

- `serve.mjs` mimics production (SPA fallback). Use a **fresh server per build** — `vite preview` keeps serving the old asset list after a rebuild and every stylesheet 404s.
- `screens.mjs` captures each `sitemapPaths` route at 412px and 1440px (light theme, reduced motion) plus interaction states: navbar dropdowns, mobile menu, settings menu, open select, focused skip link. Flags: `--routes`, `--widths`, `--theme dark`, `--only name1,name2`. Add an interaction there when you touch a component it doesn't reach.
- `compare.mjs` prints changed pixels and a bounding box per screenshot and writes side-by-side images (main left, branch right, change outlined) for the ones that differ.

## 3. Judge every diff

Read each PNG in `shots/cmp`. Live data differs between runs and is not a regression: player counts, rent/job timers, map markers, the home video frame. Every other difference must be explained by an intended change; anything else is a regression to fix, then rebuild and re-run only the affected shots with `--only`.

Report what you compared, what differed and why, and what was not covered (dark mode unless run with `--theme dark`, file-driven views such as `/pak` results).

# Map renderer regression gate

The in-game map is one three.js renderer (a flat 2D view and a tilting 3D view, `rule://three-map`).
`scripts/golden.mjs` is its pixel gate: it renders the dev-only harness `src/routes/dev/map-harness` (404s
outside `vite dev`; fixed-seed mock data in `mockData.ts`, no API calls) in a fixed set of scenes and diffs two
captures taken on different revisions. Run it on main (a `git worktree`) and on the branch:

```bash
node $SKILL/scripts/golden.mjs capture <scratch>/main --base http://localhost:5173   # `pnpm dev` of main
node $SKILL/scripts/golden.mjs capture <scratch>/branch --base http://localhost:5174 # `pnpm dev --port 5174` of the branch
node $SKILL/scripts/golden.mjs compare <scratch>/main <scratch>/branch --out <scratch>/diff
```

- Scenes: every dot palette in the normal/hover/selected states, the whole map at several zooms, and each
  layer alone at three zooms (`--view three` for the 3D camera, `--dpr 1,1.5` for DPRs, `--swiftshader` to force
  software GL like a GPU-less CI runner). `compare` tolerates 1 px of anti-alias drift and reports the share of
  changed pixels per scene (red in the `*-diff.png`).
- Harness query: `r=ortho|three`, `at=<delivery index>` or `x,y` (px space), `z` (zoom), `on=`/`off=` mapState keys,
  `line=<index>`, `sel=<index>`, `selplayer=<index>`, `drift=1`, `pick=x,y|anchor&pickmode=1`, `chrome=0`, `seed=`.
  `window.__mapHarness.getViewState()` reports where the map looks, for interaction probes.
- `scripts/perf.mjs` measures the same harness: GPU frames while idle (rAF intervals with GL draw calls), pan/zoom
  frame intervals, JS heap. `scripts/bundle.mjs <buildDir>` reports per-route JS/CSS bytes and first-contentful-paint
  of a production build. Baselines, budgets and the final OL-vs-three parity numbers (measured while OpenLayers
  still existed) are in `.hermes/plans/threemap-replaces-ol.md`.
- three's WebGPURenderer falls back to WebGL2 when WebGPU is missing, the only path headless Chromium has;
  `--swiftshader` forces software GL so the run matches a GPU-less runner.
