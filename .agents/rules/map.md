---
description: The in-game map — the Map/ThreeMapWrapper/ui/ThreeMap split and its one-way data flow, the 2D (orthographic) and 3D (perspective) views, game-world coordinates, URL-driven selection, click semantics and the coordinate picker.
globs:
  - src/lib/components/Map/**
  - src/routes/(map)/**
---

The map is **one three.js renderer** with two views of the same scene: the flat, north-up **2D
view** (`view: 'ortho'`, the default) and the tilting **3D view** (`view: 'perspective'`). Everything
about rendering — tiles, dots, labels, overlays, cameras, the LOD — is in `rule://three-map`; this
rule covers the app layers around it and the behaviour they promise.

Never instantiate a raw `THREE.WebGPURenderer` outside `ui/ThreeMap/scene.ts`. Four layers, each with
one job:

1. `routes/(map)/+layout.svelte` — owns the data (queries + the player stream) and passes it down.
2. `components/Map/Map/Map.svelte` — owns app state: POI toggles persisted to `localStorage`, URL params, overlays, picture-in-picture, the 2D/3D mode.
3. `components/Map/Map/ThreeMapWrapper.svelte` — owns every marker, overlay and hit test; the only Svelte boundary of the renderer.
4. `ui/ThreeMap/` — owns the scene: renderer, camera rigs, tile pipeline, instanced dots, labels, vector overlays.

## One-way data flow

`Map.svelte` never reaches into the map: no `bind:this`, no imperative `centerOn`. Anything the map must _do_ becomes a prop the wrapper reacts to; anything the user does comes back as `onHover` / `onClick` / `onRightClick` / `onPick` carrying a `MapFeature` (`pointType` + `info`) or `undefined` for empty map. Build the scene state in `$effect`s (one per data source, so a churning stream only touches its own markers) and tear it down in the cleanup.

The 2D/3D switch is a prop (`view`). The wrapper owns the scene instance: when `view` changes its effect disposes the old scene — releasing the WebGL context before the next is created — and mounts the new one at the view the old one reported (`getViewState()`: a px-space centre and an OL-style zoom, which both views can express), so toggling never jumps. A scene's view is fixed for its lifetime.

Picture-in-picture reparents the whole map root into the PiP document; the canvas, scene and renderer are the same objects before and after (nothing is remounted, so there is never a second renderer). The wrapper's `ResizeObserver` and DPR handling pick up the new window size and ratio.

**The canvas never resizes with the sidebar.** The map's layout cell shrinks as the sidebar slides open, and resizing a WebGPU canvas on every frame of that is what made it lag. So the wrapper renders a clipped box (`overflow-hidden`, the visible map area) holding two things: the canvas host, `absolute top-0 left-0 h-full w-screen` — as wide as the window, so it only resizes with the window — and an empty `pointer-events-none absolute inset-0` measuring element that tracks the visible area and is handed to the scene as `viewportElement`. The scene draws only into that element's size (see "Canvas vs view" in `rule://three-map`). Anything that needs the visible size reads `scene.viewSize` — not the canvas's `getBoundingClientRect().width` — and overlays/controls positioned against the clipped box follow the sidebar edge for free.

## Coordinates

Game coordinates are UE centimetres, not map coordinates. Every point enters the scene through `gameCoordToWorld` (world meters, north = -Z, `ui/ThreeMap/coords.ts`); `worldXZToGamePlane` goes back. The px-space of the old 2D map (`reProjectPoint` / `reProjectVec2` / `reProjectPointInverse` in `#lib/utils/mapProjection.ts`, 0..`MAP_REAL_SIZE`, y up) is still the unit the views report and accept (`MapViewState`), and `ui/ThreeMap/view.ts` converts between px-space, zoom and world meters. Raw game coordinates render off-map.

## Colours and fonts

Colours and fonts come from `#lib/tw-var.ts` — never hardcoded hex or px. Oklch/lab strings go through `makeColor` / `colorComponents` (`poi.ts`), never straight into `THREE.Color`.

## Selection is the URL

`Map.svelte` derives the selection from the search params (`house`, `delivery`, `player`, `focus_index`, in that precedence) and the wrapper marks that marker selected, forces its layer visible and centres on it: a new selection glides there (and in 2D zooms to 5, like the old map's `centerOn`); a locked **player or pin** is followed as it moves; **panning breaks the lock** until something else is selected.

So "view on map", search results and clicks all just navigate — build the link with `getViewHref`, or clear with `getSelectionClearedParams()` and `goto`. Never centre the map imperatively.

## Click semantics

A press only counts as a click when the pointer barely moved (5 px) — a drag is a pan, in both views.

- **Left click** (gated on `isMouse.current`): delivery → lock it and open its panel; house → open the 3D house viewer page `/house/<housingKey>` (POC, see `HANDOFF-house-viewer.md`); teleport → copy its `/tp` command; anything else → clear. On touch a tap only opens the tooltip (which then follows the dot while the map moves and hides while a finger pans), whose button does the same navigation.
- **Right click** always clears the selection, whatever it hits.
- Only delivery, house, teleport and player dots are hoverable/clickable. Pins, zones, lines and bounds are never hit-tested, so polygons cannot swallow clicks.
- **Coordinate picker** (`pickMode`, off by default, 2D only): the pin-drop button in the map control stack arms it, the cursor turns into a crosshair and every left click reports its GAME coordinate through `onPick` instead of selecting — `handleClick` never reports a feature while it is armed. The wrapper unprojects the click onto the ground, draws the pointer from the `pickPoint` prop, and `Map.svelte` follows it with `PickCoordCard` (rounded `X, Y` plus a copy button). Hover tooltips are suppressed while armed, disarming or clearing drops the pointer, and switching to 3D disarms the picker (its button lives on the 2D map).

Teleport entries can share a coordinate; `mergeTeleportPoints` collapses them (longest name wins, the rest become aliases) and is unit-tested — extend it there, not at the callsite.

## Track editor

The track editor's maps are the same renderer: `ui/EditorThreeMap/` opens a scene in the 2D (`ortho`) or 3D view and draws its own track overlay (see `rule://track-editor`). No OpenLayers code remains in the app.
