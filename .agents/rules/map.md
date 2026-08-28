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

Game coordinates are not map coordinates. Every geometry goes through `reProjectPoint` (tuple) or `reProjectVec2` (`Vector2`) from `$lib/ui/OlMap/utils`; `reProjectPointInverse` goes back. Raw game coordinates render off-map.

## Layers & styling

- `WebGLVectorLayer` for large or frequently updated point sets; plain `VectorLayer` for labels and small overlays.
- Colors and fonts in `Style` objects come from `$lib/tw-var` — never hardcoded hex or px.
- Follow the existing import split: barrels for `ol`, `ol/geom`, `ol/style`, `ol/source`; deep paths for layers and `ol/source/Vector`.

## Selection is the URL

`Map.svelte` derives the selection from the search params (`house`, `delivery`, `player`, `focus_index`, in that precedence) and the wrapper marks that feature selected, forces its layer visible and centres on it. A locked player is followed as it moves; panning breaks the lock.

So "view on map", search results and clicks all just navigate — build the link with `getViewHref`, or clear with `getSelectionClearedParams()` and `goto`. Never centre the map imperatively.

## Click semantics

- **Left click** (gated on `isMouse.current`): delivery or house → lock it and open its panel; teleport → copy its `/tp` command; anything else → clear. On touch a tap only opens the tooltip.
- **Right click** always clears the selection, whatever it hits.

Teleport entries can share a coordinate; `mergeTeleportPoints` collapses them (longest name wins, the rest become aliases) and is unit-tested — extend it there, not at the callsite.
