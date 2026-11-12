---
description: The map renderer (three.js) — the 2D orthographic and 3D perspective views, the tile pipelines, camera rigs, instanced POI dots and labels, vector overlays, game-to-world coordinates, and the ThreeMapWrapper bridge.
globs:
  - src/lib/ui/ThreeMap/**
  - src/lib/components/Map/Map/ThreeMapWrapper.svelte
---

# Map renderer (three.js)

The whole in-game map is one renderer with two views, chosen at scene creation
(`createThreeMapScene(container, { view })`) and fixed for the scene's lifetime:

- **`ortho` (2D, the default)** — a flat, north-up map. One unlit quad per tile of a single zoom,
  colour AVIF only (no `.bin` height fetches, no skirts, no ocean quad, no lights), OL's pan/zoom
  limits and tile colour grading. Pixel-faithful to the OpenLayers map it replaced.
- **`perspective` (3D)** — the tilting terrain: the same `static/map_tiles/{version}` colour+height
  pyramids draped over a quadtree of 3D terrain patches (a port of
  `mt-map-extract/script/terrain-viewer`).

Everything else — dots, labels, area names, zones, delivery lines, the picker pointer, hover/click
— is shared by both views and camera-agnostic. The mode toggle is the `onToggleMapMode` prop the
wrapper renders as an icon button above the zoom control; the wrapper re-creates the scene when
`view` changes and carries the viewport over (see `rule://map`). Picture-in-picture is 2D only: the
wrapper takes `pipActive`/`enterPip` and shows the PiP button only in the ortho view.

Follow map.md's one-way data flow for everything around this module; this rule covers only the
things unique to the renderer.

## Layering

- `components/Map/Map/ThreeMapWrapper.svelte` — the only Svelte boundary. Turns app data into
  per-type `PoiInput` `$derived`s and pushes them with one `setPoisFor(PointType, …)` `$effect` per
  type (so a churning source like live players never disturbs other types' markers); owns the
  hover/click/right-click/pick bridge, selection centring and lock-follow, and the control stack.
- `ui/ThreeMap/scene.ts` — the entry point: renderer, camera rig (`perspectiveRig.ts` or
  `orthoRig.ts` behind the `CameraRig` interface in `cameraRig.ts`), tile manager, POI manager,
  overlays, RAF loop. Everything it creates needs a matching step in its returned `dispose()`.
- `lod.ts`, `tileGeometry.ts`, `tileManager.ts`, `flatTiles.ts`, `groundPan.ts`, `poi.ts`,
  `poiManager.ts`, `screenQuads.ts`, `screenLines.ts`, `coords.ts`, `view.ts`, `orthoView.ts`,
  `heightmap.ts`, `groundHeights.ts`, `areaLabels.ts`, `constants.ts` — one concern each, described
  below.

## Views and the zoom scale

A view is described by `MapViewState` (`view.ts`): a px-space centre (0..`MAP_REAL_SIZE`, y up) and
an OL-style fractional zoom. `metersPerCssPx(zoom)` = `MAP_REAL_SIZE / 256 / 100 / 2^zoom` is the
2D scale (zoom 0 = the whole map across one 256 px tile); the 3D camera reports the zoom whose
scale equals its visible ground height over the canvas height, so a view survives a 2D↔3D switch.

**Ortho rig (`orthoRig.ts`, maths in `orthoView.ts`)** reproduces OL's `View`:

- opens on the whole map at zoom 1; max zoom 8; min zoom `orthoMinZoom` (the view extent — the
  map plus one map size on every side — across the viewport width; 0.69 at 1236 px, 0 at 756 px);
  the viewport may pan to the extent edge (the void shows `ORTHO_BACKGROUND`), no further;
- wheel/trackpad zoom is inertial toward the cursor with 3D's wheel constants; zoom buttons and
  double click (shift = out) step one whole zoom level and land exactly on it; two-finger pinch
  zooms and pans; shift-drag draws a box zoom; left-drag pans through the shared `groundPan`;
- `animateTo({x, z, zoom?}, seconds)` is OL's `animate`: eased, cancelled by a drag or wheel,
  and a 0-second call mid-glide only retargets the centre (lock-follow of a moving player);
- **keyboard pan/zoom is deliberately absent**: OL's keyboard interactions never worked in this app
  (the viewport had no `tabindex`, so arrows/+ did nothing - verified), and there is no
  accessible-name story for a focusable canvas. Add them only together with that.

**Tile zoom and tiers (2D)**: the drawn tile zoom is `flatTileZoom(viewZoom)` = round(zoom) within
`FLAT_MIN_TILE_ZOOM`..`COLOR_MAX_ZOOM` (5); deeper views magnify the z5 tiles with plain bilinear
filtering (like OL). The resident-delivery layer (`RESIDENT_MIN_COVER_Z`) and the area-name tiers
(`AREA_NAME_TIERS`) key off the **view zoom, exclusive** (`zoom > 5`, `> 3`, `> 4` — OL's layer
`minZoom`), in 3D off the covering tile's zoom (`>=`). `setViewZoom()` switches them.

**Colour pipeline (2D)**: the ortho scene is **display-referred**: `renderer.outputColorSpace` is
linear, so there is no output pass and no half-float framebuffer; translucent layers blend on
sRGB-encoded values exactly like OL's canvas did. So every colour fed to it is an encoded number
(`colorComponents(color, displayReferred)`, `makeDisplayColor`), baked canvases are `NoColorSpace`
(`ViewportScale.displayReferred` tells the texture makers), and flat tiles apply OL's
`exposure: 0.5, gamma: 1.5` to the raw bytes (`clamp((exposure + 1) * c)`, `pow(c, 1/gamma)`).
The 3D scene keeps the linear pipeline with the output transform.

## Constants

Every numeric tunable lives in `constants.ts` (zoom inertia factors, LOD ring multipliers,
altitude cap bounds, skirt drop, `POI_CONFIG`). Adding a knob means adding it there
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

- **Wheel** — inertial exponential zoom. The wheel handler accumulates into a log-distance value
  applied per frame as `distance *= exp(zoomLog)`, damped (uniform scroll feel at every zoom).
  Mouse-wheel detents use a different factor than trackpad drips (split at
  `WHEEL_NOTCH_DELTA_Y`). Positive deltaY zooms out. Zoom +/- buttons feed
  `stepBy(ZOOM_BUTTON_LOG_STEP)` so clicks glide — never teleport `camera.position`.
- **Left-drag** — ground-anchored pan (`groundPan.ts`): raycasts the grabbed terrain point under
  the cursor for the whole drag; release seeds a decaying fling. `LEFT: null` exists precisely
  because this takes over left-drag.
- **Touch** — one finger pans through `groundPan` and never rotates. A second finger cancels that
  pan (`groundPan` tracks its own pointer and ignores every other, so two fingers never fight over
  the map) and the pinch takes over. 3D (`perspectiveRig`; OrbitControls' touches are off) runs two
  mutually exclusive modes, locked by the first clear movement (`TOUCH_GESTURE_LOCK_PX`) until a
  finger lifts, like Google Maps: spread zooms and a twist rotates the map WITH the fingers (grab
  semantics, camera azimuth `+theta`), or dragging both fingers vertically tilts (up = toward the
  horizon, the inverse of a grab). Applied straight from finger deltas through `orbitBy`. 2D
  (`orthoRig`) pinch zooms and pans.
- Rotate speed and the look-up cap (`maxPolarAngle`) lerp with the zoom fraction in
  `CameraRig.update(dt)`.

Renderer is `WebGPURenderer` with `logarithmicDepthBuffer` — required by the huge clip range
(30..100000-ish scene). `renderer.setAnimationLoop` drives ticks, the node-material update
pass, and awaits async backend init (WebGL2 fallback when WebGPU is missing); `dispose()`
cancels it.

**Rendering is on demand.** The loop ticks every frame (inertia, servo, tile ticks) but only
calls `renderer.render` when `dirty`. OrbitControls' `change` event (raised by every
`controls.update()` that moved the camera: drags, damping, zoom, ground pan, selection glide)
sets it; tile mount/unmount and every `poiManager` / `areaLabels` write call the `invalidate`
callback they are constructed with; the scene exposes `invalidate()` for outside mutators (the
track editor calls it after every gate edit). Anything async that changes what is drawn must
invalidate when it lands, and anything new that animates on its own must keep invalidating
while it runs — an idle map issues zero GPU frames. The camera target is clamped to the map
rect (`mapRect.ts`) each tick; the ocean quad is exactly that rect, nothing is drawn past it.

Resizes are applied immediately by one `ResizeObserver` (and a `devicePixelRatio` watcher,
`dpr.ts`, since browser zoom / a monitor move fires no resize) and rendered synchronously —
`setSize` clears the canvas — so never resize the renderer anywhere else.

**Canvas vs view (`viewRect.ts`).** The canvas and the view are two rectangles. The canvas is the
container's box and is what `setSize` sizes; the **view** is its top-left part that is actually
drawn: `setViewRect` writes it into the renderer's viewport and everything reads it back from
there (`getViewBufferSize` for device px, `getViewCssSize` for CSS px) or from `scene.viewSize`.
Camera aspect, the ortho rig's size and zoom centre, pointer NDC (`groundPan`, the wrapper's picker
and hover-follow), the pick grid, label pixel snapping and `viewportScale` use the view, never
`domElement.clientWidth` / `getBoundingClientRect().width`. The screen-space shaders measure
`viewportSize`, not `screenSize`, for the same reason. By default the view is the whole canvas;
`createThreeMapScene(container, { viewportElement })` makes it track another element instead, so a
layout that animates the visible area (the map sidebar sliding open) costs one camera-aspect +
viewport update and a synchronous render per frame, with no `setSize` and no rebuild of the
DPR-baked atlases and label canvases (`onResize` runs those only when the canvas or the ratio
changed). `setViewRect` stores the viewport as a whole device-pixel count plus a 1e-3 px sliver
because three floors `viewport * pixelRatio` while the shaders read the unfloored product.

## POIs (poi.ts + poiManager.ts)

- All dot/label styling ports 1:1 from the OL layers: `POI_CONFIG[pointType]` plus
  `POI_DELIVERY_RESIDENT/_JOB_SOURCE/_JOB_DEST` and `POI_HOUSE_VACANT` variants is the
  single source of truth. Colors come from `#lib/tw-var.ts` — including oklch strings, which
  `THREE.Color` cannot parse: always via `makeColor`/`convertOklchToHex` (culori) from `poi.ts`.
  Each style also carries optional `hover`/`selected` color overrides, ported 1:1 from the
  OL layers' `hover`/`selected` attribute switches.
- Dots are **one instanced screen-space quad mesh per distinct palette** (`dotPaletteKey` = fill|
  stroke|strokeWidth, `screenQuads.ts`). The vertex stage (`MeshBasicNodeMaterial.vertexNode`)
  projects each world anchor with whatever camera renders, rounds the centre to the drawing-buffer
  pixel grid and adds a fixed device-pixel corner offset — no fov maths, so perspective and
  orthographic cameras behave the same and the dot never straddles pixels. Each palette's dot
  texture is a **three-cell atlas** (`PoiState`: normal | hover | selected) built by
  `makeDotAtlasTexture` (even side, `NearestFilter`) at device size; the per-instance state
  attribute shifts the sampled cell. Instance attributes are anchor, opacity (0 clips the slot
  away) and state. Capacity starts at `MIN_CAPACITY` and doubles on demand (`ensureCapacity`
  rebuilds the mesh). Groups draw in OL's layer order through `renderOrder` (delivery < house <
  player < teleport < pin, `DOT_LAYER_RANK`). Mutations happen only through `setPoisFor`
  (buffers) and `setMarkerState` (a single state slot) — writing those buffers anywhere else
  desyncs slot bookkeeping (layer toggles add/remove markers through `setPoisFor`; there is no
  separate visibility setter). A DPR change redraws the atlases (`setViewport`).
- Hover/selected paint is driven by the wrapper: it resolves each marker's state with OL's
  precedence (hover > selected > normal) and applies it via `poiManager.setMarkerState`;
  the selection effect re-applies on its type's marker-set changes so re-created markers
  regain the selected paint.
- Dots never depth-test (`depthTest: false`, `renderOrder: 1+`), so ordinary raycasting cannot hit
  them. Hit-testing goes through `pick(x, y)` (canvas CSS px): projected dots live in a
  screen-space hash grid (`pickGrid.ts`) rebuilt only when the camera, canvas size or marker layout
  changed, so each pick is a few cell lookups; the topmost drawn dot under the pointer wins.
  Extend `pick()`; never add real 3D raycasts against dots.
- Labels cannot instance — one `makeTextSprite` Sprite per labelled marker, anchored bottom-centre
  on its dot (the glyph lift is baked into the canvas). Crispness: the canvas is rasterised at
  device size with an even width, sampled with `NearestFilter`, and every rendered frame
  `snapLabelToPixelGrid` (poi.ts) moves the quad via `sprite.center` so its corners land on whole
  drawing-buffer pixels — derived from the actual buffer size, so fractional DPRs work.
- Resident delivery points draw only within the finest LOD ring: `draws()` gates them on their
  covering tile reaching `RESIDENT_MIN_COVER_Z`.

## Ground overlays (groundHeights + areaLabels)

Everything here drapes over the terrain and draws UNDER the POI dots/labels (transparent,
`depthTest: false`, `renderOrder: 0` — the ground itself renders in the opaque pass first, so
"behind every other layer except ground" is exactly this).
Exception: delivery lines are straight chords between their end points' ground heights (only the
two ends are sampled) and never follow the terrain between them.

- `groundHeights.ts` owns the height-tile fetches for overlays, separate from tileManager's
  cache (tileManager evicts fine tiles outside the camera ring; overlays sit in fixed places).
  `sample()` returns null while the tile loads and kicks the fetch — callers re-sample on a
  later frame and mount only complete geometry. `zoomForBox()` bounds tile fetches per feature.
- `areaLabels.ts` ports OL's `areaNameLayers`: one `makeTextSprite` per area at the ring's
  interior point (`ringInteriorPoint` in coords.ts), OL's per-flag weight/size/fill and
  `AREA_NAME_TIERS` gating on the covering tile's z (recomputed in `syncCovers()`, called
  from `refreshVisibleTiles` right after `updateVisibleTiles()` like `poiManager.syncCovers`).
  `setTexts()` re-applies localized text — the wrapper re-runs it on locale changes.

## Vector overlays (polygonLayer + screenLines)

Shortcut zones, area bounds and delivery lines are ports of OL's vector layers, drawn with two
camera-agnostic pieces:

- `screenLines.ts` — instanced constant-pixel-width line segments with anti-aliased round caps and an
  optional dash pattern whose phase flows with the `time` node. Everything is measured in device px
  in the vertex/fragment stage, so width, dash length and flow speed read the same at any zoom,
  tilt or DPR, and alpha blends normally (three's `Line2NodeMaterial` blends by re-reading the
  framebuffer and its dashes are in world units, so it is not used). A segment with an end behind
  the camera is dropped, not trimmed.
- `polygonLayer.ts` — triangulates rings once (`polygons.ts`: `ShapeUtils`, holes supported,
  midpoint subdivision capped at `MAX_EDGE_M`), fills them with vertex colours in one merged mesh
  and strokes the ring through `ScreenLines`. Heights come from `groundHeights.sampleMany`;
  geometry for a polygon builds once its ground tiles are cached (`update()` polls, like
  `areaLabels`), and `setFlat(true)` drops everything to y=0 for the orthographic view.
- Draw order mirrors OL's layer array through `renderOrder`: delivery lines (0.5) < dots (1.0+) <
  shortcut zones (1.5) < POI labels (2) < picker pointer (2.1) < area bounds (2.15) < area names
  (2.2); constants in `constants.ts` (`*_RENDER_ORDER`, widths, dashes, opacities - copy them from
  the OL style objects, never invent).
- Nothing here is clickable: overlays never enter `pick()`, so polygons cannot swallow clicks.
- A layer that animates by itself (the delivery lines' flow) reports it through
  `onAnimatingChange`; the scene's `animating` set keeps it drawing while any animation runs and
  renders nothing once the set is empty. Reduced motion freezes the flow (`setFlow(0)`).

## App bridge (the wrapper)

Pointer input exits as `onHover` / `onClick` / `onRightClick` / `onPick` carrying a plain `MapFeature`
(`pointType` + `info`, from `components/Map/Map/types.ts`) or `undefined` for empty map; `Map.svelte`'s
tooltip, panels and click semantics are written against that. Pointer coordinates passed upward are
container-relative, not client. A press is a click only on release without a 5 px move (a drag pans);
touch has no hover, so a tap resolves its pick on release, and the tapped dot's tooltip follows it while
the map moves (hidden while a finger pans, dropped when the dot leaves the view). Mouse hover is
re-resolved at the pointer every rendered frame the map moves under it (cleared while a drag pans).
Only delivery, house, player and teleport dots are pickable; pins are display-only.

The scene lives in a `$effect` keyed on `view`: switching it disposes the old scene (releasing its
WebGL context) and creates the new one at `carriedView`, the old scene's `getViewState()`. The component
also exports `getViewState()`.

Selection arrives as the URL-driven `selection` prop. A _new_ lock glides the marker to the screen
centre — 2D: `ortho.animateTo` also zooms to 5 like OL's `centerOn`; 3D: the `selectionPan` servo (below)
keeps zoom and orbit. A locked **player or pin** is then followed on every reconcile (`markerRevision`
makes the effect re-run after each `setPoisFor`; `markerById` itself is not reactive); houses and
deliveries are centred once. A drag past the click threshold sets `lockBroken` until the selection id
changes.

3D selection glide: raycast the screen-centre ray onto a horizontal plane at the marker's world height,
then translate camera AND `controls.target` by the same XZ delta, which preserves orbit/zoom by
construction (`ui/ThreeMap/selectionPan.ts`, `panTo`/`update`). Never "animate" by lerping toward a
target while also moving the plane you measure against, and guard against parallel-to-plane rays
(`remainingDistance()` holds instead of stepping toward garbage).

## Asset URLs

Tiles serve from `static/map_tiles/{version}/colors/` and `heights/` (the 2D view fetches only
`colors/`). The color dir is plural — `colors/`, not `color/` (a missed plural was the one real
port bug).
