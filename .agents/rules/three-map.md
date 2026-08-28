---
description: The 3D terrain map (three.js) — the three-stage tile pipeline, quadtree LOD selection, inertial camera controls, instanced POI sprites, game-to-world coordinates, and the ThreeMapWrapper bridge.
globs:
  - src/lib/ui/ThreeMap/**
  - src/lib/components/Map/Map/ThreeMapWrapper.svelte
---

# 3D map module (three.js)

A three.js port of the `mt-map-extract/script/terrain-viewer` standalone viewer: the same
`static/map_tiles/{version}` color+height pyramids the OL map serves, draped over a quadtree of
3D terrain patches. Rendered in place of `OlMapWrapper` when the user toggles the map mode —
the toggle is the `onToggleMapMode` prop both wrappers accept, rendered as an icon button above
the zoom control (`material-symbols:3d-2-rounded` in 2D, `material-symbols:2d-2-rounded` in 3D).
No picture-in-picture in 3D: the wrapper takes no PiP props and Map.svelte hides its PiP button
in 3D mode. Delivery lines are not drawn (`deliveryLineData` accepted, unused) — treat that as
staged work, not a bug to fix blindly.

Follow map.md's one-way data flow for everything around this module; this rule covers only the
things unique to the 3D side.

## Layering

- `components/Map/Map/ThreeMapWrapper.svelte` — the only Svelte boundary. Same props shape as
  `OlMapWrapper`. Turns app data into per-type `PoiInput` `$derived`s and pushes them with one
  `setPoisFor(PointType, …)` `$effect` per type (so a churning source like live players never
  disturbs other types' markers); owns the hover/click/right-click bridge and selection
  centering.
- `ui/ThreeMap/scene.ts` — the entry point `createThreeMapScene(container)`: renderer, lights,
  ocean quad, camera rig, tile manager, POI manager, RAF loop. Everything it creates needs a
  matching step in its returned `dispose()`.
- `lod.ts`, `tileGeometry.ts`, `tileManager.ts`, `groundPan.ts`, `poi.ts`, `poiManager.ts`,
  `coords.ts`, `heightmap.ts`, `constants.ts` — one concern each, described below.

## Coordinates

Game coords are UE-style centimeters (x right, y down, z up). Every coordinate entering a three
object goes through `gameCoordToWorld(coord, meta)` from `coords.ts` → world meters centered on
the map origin; UE y-increasing-south maps to `-worldZ`, so north is -Z and terrain color
textures read correctly from above. Pins live in OL px-space and convert with
`reProjectPointInverse` first (`pxToGame` in the wrapper). Raw game coordinates off-map, same
invariant as the OL map.

Metadata is bundled, never fetched: `TILES_META` (`heightmap.ts`) is the static import of
`src/lib/assets/data/tiles.json` converted cm→m at build time. Raw tile heights convert with
`(rawHeight - 32768) / 128`; `tileWorldRect()` maps tile grid keys to world rects.

## Constants

Every numeric tunable lives in `constants.ts` (zoom inertia factors, LOD ring multipliers,
altitude cap bounds, skirt drop, ocean size, `POI_CONFIG`). Adding a knob means adding it there
— don't hardcode a magic number next to a callsite.

## Tile pipeline (tileManager.ts)

`updateVisibleTiles()` runs once per `TILE_UPDATE_INTERVAL_MS` tick:

1. **LOD** — `selectLeafTiles(camera, meta, controls.target)` computes the desired leaf set.
2. **Load & cache** — background loads (heights `<z>_<x>_<y>.bin`, colors `<z>_<x>_<y>.avif`)
   for desired leaves _and their coarser ancestors_ land raw-data-only in `dataCache`;
   `computeFallbackCover()` picks the finest fully-cached hole-free cover.
3. **Generate & mount** — geometry/material build memoized in `builtTiles`, then mount/unmount
   to match the cover. Unmounted tiles keep built resources so a revisit remounts free. Coarse
   tiles (z ≤ `CACHE_MAX_ZOOM`) stay cached; finer ones evict on unmount — the browser HTTP
   cache is the victim cache.

The swap invariant: a coarse ancestor stays mounted until **all four** of its finer replacements
have loaded, so zooming never flashes a hole. Never mount the finer ring partially. Meshes get a
vertical skirt (`SKIRT_DROP`) hiding LOD-boundary cracks and analytic vertex normals
(`tileGeometry.ts`). Whatever changes tile-tick ordering must keep `poiManager.syncCovers()`
running immediately after `updateVisibleTiles()` (see `refreshVisibleTiles` in scene.ts).

## LOD selection (lod.ts)

Two rules inside `selectLeafTiles()`:

- **Vision rings** — `controls.target`'s XZ is the lod0 point; each zoom has a circular ring
  around it, radius = half `RING_EXTENT_*_MULTIPLIER` × that zoom's tile width (finest active
  zoom uses the tighter FINEST factor). Walking the quadtree top-down, a node becomes a leaf
  once the _next finer_ zoom's ring misses its square hitbox — compact core under the orbit
  point, symmetric cascading rings.
- **Altitude cap (overrides rings)** — `camera.position.y - oceanLevel` scales the allowed max
  zoom linearly across `ALTITUDE_CAP_MIN..ALTITUDE_CAP_FULL`; flying high never selects fine
  LODs.

Frustum-culled nodes never load. Any per-marker coverage logic follows tiles the manager marked
active (`activeTiles`), like `syncCovers()` does — not a recomputation of the LOD walk.

## Camera & controls (scene.ts + groundPan.ts)

`OrbitControls` is deliberately hobbled: `{ LEFT: null, MIDDLE: DOLLY, RIGHT: ROTATE }`,
`enablePan = false`, `enableZoom = false`. Custom drivers replace the defaults:

- **Wheel** — inertial exponential zoom. `zoomBy(deltaY)` accumulates into a log-distance value
  applied per frame as `distance *= exp(zoomLog)`, damped (uniform scroll feel at every zoom).
  Mouse-wheel detents use a different factor than trackpad drips (split at
  `WHEEL_NOTCH_DELTA_Y`). Positive deltaY zooms out. Zoom +/- buttons feed
  `stepBy(ZOOM_BUTTON_LOG_STEP)` so clicks glide — never teleport `camera.position`.
- **Left-drag** — ground-anchored pan (`groundPan.ts`): raycasts the grabbed terrain point under
  the cursor for the whole drag; release seeds a decaying fling. `LEFT: null` exists precisely
  because this takes over left-drag.
- Rotate speed and the look-up cap (`maxPolarAngle`) lerp with the zoom fraction in
  `CameraRig.update(dt)`.

Renderer is `WebGPURenderer` with `logarithmicDepthBuffer` — required by the huge clip range
(30..100000-ish scene). `renderer.setAnimationLoop` drives frames, the node-material update
pass, and awaits async backend init (WebGL2 fallback when WebGPU is missing); `dispose()`
cancels it. Container resizes blur the canvas and run through the debounced `ResizeObserver` —
don't resize the renderer anywhere else.

## POIs (poi.ts + poiManager.ts)

- All dot/label styling ports 1:1 from the OL layers: `POI_CONFIG[pointType]` plus
  `POI_DELIVERY_RESIDENT/_JOB_SOURCE/_JOB_DEST` variants and `POI_DEFAULT` fallback is the
  single source of truth. Colors come from `$lib/tw-var` — including oklch strings, which
  `THREE.Color` cannot parse: always via `makeColor`/`convertOklchToHex` (culori) from `poi.ts`.
- Dots are **one `THREE.Sprite` per distinct palette** (`dotPaletteKey` = fill|stroke|
  strokeWidth), backed by `SpriteNodeMaterial` with instanced position+opacity
  `InstancedBufferAttribute`s and a uniform scale (palette size is constant per group).
  Capacity starts at `MIN_CAPACITY` and doubles on demand. Mutations happen only through
  `setPoisFor` / `setMarkerVisible` — writing those buffers anywhere else desyncs slot bookkeeping.
- Sprites render with `depthTest: false` + `renderOrder: 1`, so ordinary raycasting cannot hit
  them. Hit-testing goes through `pick(raycaster, ndc)`: project each drawable marker to NDC and
  compare against the constant screen radius implied by `sizeAttenuation: false`, nearest-first.
  Extend `pick()`; never add real 3D raycasts against dots.
- Labels cannot instance — one `makeTextSprite` Sprite per labelled marker, repositioned above
  its dot along screen-up in `poiManager.update(camera)` every frame.
- Resident delivery points draw only within the finest LOD ring: `draws()` gates them on their
  covering tile reaching `RESIDENT_MIN_COVER_Z`.

## App bridge (the wrapper)

Pointer input exits as the same OL-compatible callbacks (`onHover` / `onClick` /
`onRightClick`) carrying `ol/Feature` stubs holding `pointType` + `info`, or `undefined` for
empty map — this parity is what lets `Map.svelte`'s tooltip/panels/click semantics stay
wrapper-agnostic. Pointer coordinates passed upward are container-relative, not client.

Selection arrives as the same URL-driven `selection` prop — pan the marker to screen center
without changing zoom or orbit: raycast the screen-center ray onto a horizontal plane at the
marker's world height, then translate camera AND `controls.target` by the same XZ delta, which
preserves orbit/zoom by construction. The instant form lives in `centerOnSelection()`
(ThreeMapWrapper); the gliding re-targetable servo lives in `ui/ThreeMap/selectionPan.ts`
(`panTo`/`update`, the OL `animate({ center })` counterpart). Both share this geometry — never
"animate" by lerping toward a target while also moving the plane you measure against, and guard
against parallel-to-plane rays (`remainingDistance()` holds instead of stepping toward garbage).
The effect tolerates the marker arriving after the selection (it references the owning type's
derived set) and repeats are guarded by `lastCenteredSelection`.

## Asset URLs

Tiles serve from `static/map_tiles/{version}/colors/` and `heights/`, same directories the OL
map uses. The color dir is plural — `colors/`, not `color/` (a missed plural was the one real
port bug).
