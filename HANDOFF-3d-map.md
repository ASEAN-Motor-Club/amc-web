# 3D map — stage 1 handoff

Stage 1 (render 3D terrain in place of the OL map) is committed. Stage 2 (POI layers) is next.

## What stage 1 shipped

- **`src/lib/ui/ThreeMap/`** — a port of `mt-map-extract/script/terrain-viewer` to the app:
  - `scene.ts` — renderer (log depth buffer), lights, ocean quad, OrbitControls rig with inertial
    exponential wheel-zoom, ground-anchored pan, RAF loop + tile ticks, `dispose()`.
  - `tileManager.ts` — 3-stage pipeline: LOD → background load/cache → mount/unmount with a
    fallback cover (no holes, "2×2 swap only when fully loaded").
  - `lod.ts` — quadtree LOD selection (vision rings from orbit point + altitude cap + frustum cull).
  - `tileGeometry.ts` — per-tile height `.bin` + color `.avif` fetch, grid+skirt geometry,
    analytic normals; color URL is `/map_tiles/719/colors/` (plural — a real 404 bug, fixed).
  - `heightmap.ts` — `TILES_META` from a **static import** of `src/lib/assets/data/tiles.json`
    (cm → m, no fetch), `tileWorldRect`, raw-height→meters.
  - `constants.ts`, `three-map-types.ts`, `groundPan.ts`.
- **`src/lib/components/Map/Map/ThreeMapWrapper.svelte`** — same props shape as `OlMapWrapper`;
  terrain-only for now. Zoom `+`/`−` buttons bottom-right, styled like the OL controls, driving
  the inertial zoom via `scene.zoomBy(deltaY)`.
- **`src/lib/components/Map/Map/Map.svelte`** — `{#if threeDMode}` swaps
  `ThreeMapWrapper`/`OlMapWrapper`; a `2D`/`3D` button top-right is shown only when
  `localStorage.__experimental_3d_map === '1'`.
- **`src/lib/ui/OlMap/OlMap.svelte`** — base tile layer zoom range now reads from `TILES_META`
  (`meta.maxZoom`) instead of hardcoded `2`/`5`.
- **`.agents/knowledge/three-map.md`** — module mechanics (pipeline, LOD rules, wiring, asset URLs).
- Deps: `three@0.185.1`, `@types/three`.

Lighting was brightened from the terrain-viewer defaults (hemisphere 1.4→2.1, ambient 0.6→0.9,
directional 2.4→3.6) because the map read dull; typecheck/build pass, visual confirmation of the
exact brightness was cut short by this commit.

## How to try it

```bash
localStorage.setItem('__experimental_3d_map', '1')   # in the browser console on /map
```

Then the `3D` button appears top-right. Switch back with `2D`.

## Stage 2 (POI) notes

- The Wrapper props are already the full `OlMapWrapper` contract; deferred props are captured in a
  rest (`_deferredProps`) so `svelte/no-unused-props` stays quiet — consume them as POI lands.
- Game → map coordinates: `reProjectPoint`/`reProjectVec2` from `$lib/ui/OlMap/utils` (px space,
  0..2200000). The 3D world is meters centered on the map origin: px→world is
  `(px - MAP_REAL_SIZE/2) / 100`... i.e. world = `(px/100) - widthMeters/2` for both axes; y-up in
  three. Verify before drawing.
- URL-driven selection (`house`/`delivery`/`player`/`focus_index`) and click semantics
  (left: lock+panel / copy teleport / clear; right: clear) live in `Map.svelte` and should be
  reused, not re-implemented.
- `selection` centering: OL uses `map.centerOn`; three would set `controls.target` — decide the
  lock/follow behavior with the existing player-follow in mind.
- `enterPip`/`pipActive` are accepted but pip is not wired for three (zoom controls hide in pip).
