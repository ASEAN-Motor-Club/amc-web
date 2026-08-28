# 3D map module (`src/lib/ui/ThreeMap/`)

A Three.js port of the `mt-map-extract/script/terrain-viewer` standalone viewer. It drapes the
same `static/map_tiles/719` color+height pyramids that OpenLayers uses over a quadtree of 3D
terrain patches. Rendered in place of the OL map through the `onToggleMapMode` toggle button both
map wrappers expose above their zoom control.

## File layout

- `constants.ts` — every tunable value (zoom inertia, LOD ring multipliers, altitude cap, look-up
  limits, skirt drop, ocean size). Two files (@ `lod.ts`, `tileManager.ts`, `tileGeometry.ts`,
  `scene.ts`, `groundPan.ts`) import only what they use.
- `heightmap.ts` — `TILES_META`, the static import of `src/lib/assets/data/tiles.json` converted
  from centimeters to meters (bundled by Vite, no fetch — unlike terrain-viewer). Plus
  `tileWorldRect` (tile grid → world rect centered on the map origin) and the raw-height→meters
  conversion (`(rawHeight - 32768) / 128`).
- `three-map-types.ts` — shared types: `TilesMeta`, `LeafTile`, `RingExtents`, `ActiveTile`,
  `RawTilesJson`.
- `lod.ts` — `selectLeafTiles()`: the quadtree LOD selection (ring cascade + altitude cap +
  frustum cull) and `computeRingExtents()`, the shared geometry it tests against.
- `tileGeometry.ts` — per-tile data fetch (`heights/<z>_<x>_<y>.bin`, `colors/<z>_<x>_<y>.avif`)
  and `buildTileGeometry()`: the resolution×resolution grid mesh from the height samples, plus a
  vertical skirt to hide LOD-boundary cracks and analytically-computed vertex normals.
- `tileManager.ts` — the tile load/unload lifecycle as a three-stage pipeline (LOD → background
  load/cache → mount/unmount), with a persistent data cache and a fallback "cover" so a not-yet-
  ready tile drops to its coarse cached ancestor.
- `scene.ts` — the whole scene: renderer (logarithmic depth buffer), lights, ocean quad,
  `createCameraRig()` (OrbitControls + inertial exponential wheel-zoom), the ground-anchored
  pan, and the RAF loop that runs LOD ticks every `TILE_UPDATE_INTERVAL_MS`.
- `groundPan.ts` — left-drag ground-anchored pan (raycast the grabbed terrain point under the
  cursor the whole drag) with a post-release fling.

## The three-stage tile pipeline (tileManager.ts)

`updateVisibleTiles()` runs one tick every 150ms:

1. **LOD stage** — `selectLeafTiles(camera, meta, controls.target)` → the desired leaf set.
2. **Load & cache stage** — fires background loads (height `.bin` + decoded color `.avif`) for
   every desired leaf and its coarser ancestors into `dataCache` (raw data only, no mesh), then
   computes `computeFallbackCover()`: the finest set of _already-cached_ tiles covering the
   desired set with no holes.
3. **Generation stage** — for each cover tile, builds the mesh/geometry/material (memoized in
   `builtTiles`), then mounts/unmounts to match the cover. Unmounted tiles keep their built
   resources so a revisit re-mounts without rebuilding. Coarse tiles (z ≤ `CACHE_MAX_ZOOM`) stay
   cached; finer ones are evicted on unmount (the browser HTTP cache is the victim cache).

The cover swap is the "2×2 swap only when fully loaded" behavior: a coarse ancestor stays mounted
until all four of its finer replacements have loaded, so zooming never flashes a hole.

## LOD selection (lod.ts)

- **Rule 1 (vision rings from the orbit point)** — `controls.target`'s XZ is the "lod0 point".
  Each zoom z has a circular vision ring around it, radius = half `RING_EXTENT_*_MULTIPLIER` × that
  zoom's tile width (finest active zoom uses the tighter `FINEST` factor). The quadtree is walked
  top-down; a tile at zoom z is a leaf once the _next finer_ zoom's ring misses its square hitbox,
  giving a compact max-zoom core under the orbit point with symmetric rings cascading out.
- **Rule 2 (altitude cap, overrides rule 1)** — `camera.position.y - oceanLevel` caps the max
  zoom, scaled linearly across the full zoom-out range, so flying high never selects fine LODs.
- **Frustum cull** — nodes fully outside the camera's frustum are skipped outright (no load).

## Camera & controls (scene.ts + groundPan.ts)

- `OrbitControls` with damping; bindings `LEFT: null` (pan is handled separately), `MIDDLE: DOLLY`,
  `RIGHT: ROTATE`; `enablePan = false`, `enableZoom = false`.
- **Wheel zoom** is custom inertial _exponential_: wheel deltas accumulate into a log-distance
  `zoomLog`, applied each frame as `distance *= exp(zoomLog)` and damped (uniform scroll feel at
  every zoom, with glide).
- **Ground-anchored pan** raycasts the terrain on left-drag and keeps the grabbed point under the
  cursor; the recent drag motion seeds a decaying fling on release.
- Rotate speed and look-up cap (`maxPolarAngle`) are lerped by the current zoom fraction in
  `update(dt)`.

## Wiring into the app

- `src/lib/ui/ThreeMap/scene.ts` exports `createThreeMapScene(container)`; the Svelte wrapper
  (`src/lib/components/Map/Map/ThreeMapWrapper.svelte`) creates it in `onMount` and disposes it on
  unmount (`dispose()` cancels RAF, removes listeners, disposes the renderer).
- `Map.svelte` toggles between `OlMapWrapper` and `ThreeMapWrapper` via the `onToggleMapMode`
  button both wrappers render above the zoom control. The Wrapper carries the same props shape as
  `OlMapWrapper`, minus the PiP pair (`pipActive`/`enterPip` — no PiP in 3D); POI layers and
  input callbacks (hover/click/right-click) are wired. Delivery lines are not drawn yet.
- The OL base tile layer (`src/lib/ui/OlMap/OlMap.svelte`) reads its zoom range from
  `TILES_META` instead of hardcoded values.

## Asset URLs

Tiles come from `static/map_tiles/{version}/` (`colors/` and `heights/`), the same directory the OL map
serves. The color dir is plural — `colors/`, not `color/` (a missed-plural 404 was the one real
port bug).
