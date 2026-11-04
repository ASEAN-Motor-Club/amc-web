---
description: The in-game map — the OlMap/OlMapWrapper/Map split and its one-way data flow, game-world re-projection, WebGL layers, URL-driven selection, OpenLayers conventions.
globs:
  - src/lib/ui/OlMap/**
  - src/lib/ui/EditorOlMap/**
  - src/lib/components/Map/**
  - src/routes/(map)/**
---

Applies to the OpenLayers (2D) map only. The 3D terrain map (`src/lib/ui/ThreeMap/**`,
`ThreeMapWrapper.svelte`) has its own rule: `rule://three-map` — its conventions (coordinates via
`gameCoordToWorld`, instanced POI sprites, tile pipeline) are different and must not be mixed
with the ones below.

# Map system (OpenLayers)

Never instantiate a raw `ol/Map`. Four layers, each with one job:

1. `routes/(map)/+layout.svelte` — owns the data (queries + the player stream) and passes it down.
2. `components/Map/Map/Map.svelte` — owns app state: POI toggles persisted to `localStorage`, URL params, overlays, picture-in-picture.
3. `components/Map/Map/OlMapWrapper.svelte` — owns every `Feature`, source, layer and hit test.
4. `ui/OlMap/` (display) and `ui/EditorOlMap/` (track editor) — own the ol `Map`, the custom projection and the base tile layer.

## One-way data flow

`Map.svelte` never reaches into the map: no `bind:this`, no imperative `centerOn`. Anything the map must _do_ becomes a prop the wrapper reacts to; anything the user does comes back as `onHover` / `onClick` / `onRightClick` with `undefined` for empty map. Build features in `$effect`s and clear the source in the cleanup. Never call `map.updateSize()` — ol observes the target element itself, including across the picture-in-picture move.

## Coordinates

Game coordinates are not map coordinates. Every geometry goes through `reProjectPoint` (tuple) or `reProjectVec2` (`Vector2`) from `#lib/ui/OlMap/utils.ts`; `reProjectPointInverse` goes back. Raw game coordinates render off-map.

## Layers & styling

- `WebGLVectorLayer` for large or frequently updated point sets; plain `VectorLayer` for labels and small overlays.
- Colors and fonts in `Style` objects come from `#lib/tw-var.ts` — never hardcoded hex or px.
- Follow the existing import split: barrels for `ol`, `ol/geom`, `ol/style`; deep paths for layers and every source (`ol/source/Vector`, `ol/source/ImageTile`). The `ol/source` barrel is eslint-banned: it drags in `ol/source/GeoTIFF` → `web-worker`, which throws on import inside SvelteKit's prerender worker thread. That is what keeps `Map.svelte` a static import in `routes/(map)/+layout.svelte` (SSR-rendered, prefetched with the route) — don't reintroduce a lazy `import()`.
- ol is external in the SSR build, so Node evaluates every barrel in full — tree-shaking only happens client-side. The remaining barrels are safe today (they only reach `rbush`, which is inert on import). After an ol bump, if prerender fails with an error thrown at module load, check whether a barrel now pulls in a package that runs code on import, and eslint-ban that barrel the same way as `ol/source`.

## Selection is the URL

`Map.svelte` derives the selection from the search params (`house`, `delivery`, `player`, `focus_index`, in that precedence) and the wrapper marks that feature selected, forces its layer visible and centres on it. A locked player is followed as it moves; panning breaks the lock.

So "view on map", search results and clicks all just navigate — build the link with `getViewHref`, or clear with `getSelectionClearedParams()` and `goto`. Never centre the map imperatively.

## Click semantics

- **Left click** (gated on `isMouse.current`): delivery → lock it and open its panel; house → open the 3D house viewer page `/house/<housingKey>` (POC, see `HANDOFF-house-viewer.md`); teleport → copy its `/tp` command; anything else → clear. On touch a tap only opens the tooltip, whose button does the same navigation.
- **Right click** always clears the selection, whatever it hits.
- **Coordinate picker** (`pickMode`, off by default, 2D only): the pin-drop button in the map
  control stack arms it, the cursor turns into a crosshair and every left click reports its GAME
  coordinate through `onPick` instead of selecting — `handleMapClick` never runs while it is armed.
  `OlMapWrapper` converts the pixel coordinate back with `reProjectPointInverse`, draws the pointer
  with `pickLayer` from the `pickPoint` prop, and `Map.svelte` follows it with `PickCoordCard`
  (rounded `X, Y` plus a copy button). Hover tooltips are suppressed while armed, disarming or
  clearing drops the pointer, and switching to 3D disarms the picker (its button lives on the 2D
  map).

Teleport entries can share a coordinate; `mergeTeleportPoints` collapses them (longest name wins, the rest become aliases) and is unit-tested — extend it there, not at the callsite.
