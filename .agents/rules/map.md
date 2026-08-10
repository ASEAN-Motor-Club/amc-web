---
description: The in-game map — OlMap/OlMapWrapper/Map split, one-way data flow, game-world re-projection, WebGL layers, URL-driven selection, OpenLayers conventions.
globs:
  - src/lib/ui/OlMap/**
  - src/lib/ui/EditorOlMap/**
  - src/lib/components/Map/**
  - src/routes/(map)/**
---

# Map system (OpenLayers)

Never instantiate a raw `ol/Map`. The stack, outermost first:

- `src/routes/(map)/+layout.svelte` — owns the data: TanStack queries plus `createPlayerPositionsV2Stream`, handed down as props.
- `components/Map/Map/Map.svelte` — owns app state: `mapState` (POI toggles, persisted to `localStorage` key `mapState`), URL params, picture-in-picture, overlays.
- `components/Map/Map/OlMapWrapper.svelte` — owns every `Feature`, source, layer and hit test, driven by reactive props.
- `ui/OlMap/OlMap.svelte` — owns the ol `Map`, the custom pixel `Projection`, the `WebGLTileLayer` base, view controls and the PiP button. Props include `layers`, `initialView`, `pipActive`, `enterPip`, `disablePip`; exports `centerOn`, `fit`, `getMap`, `getViewState`.
- `ui/EditorOlMap/` — the track-editor variant (`points`, `selectedPoint`, `gateMode`, `showNum`, `onPointClick`, `onSelectedPointMove`, `initialView`; exports `getViewState`, `zoomFit`).

## One-way data flow

`Map.svelte` never reaches into the map — no `bind:this` on the component, no imperative `centerOn`. Anything the map must _do_ is a prop the wrapper reacts to; anything the user does comes back through `onHover(feature, pixel)` / `onClick(feature)` / `onRightClick(feature)`, each with `undefined` for empty map (`onHover` reports the sentinel pixel `[-1, -1]`). `OlMap`'s own callbacks are `onPointerMove` / `onClick` / `onPointerDrag` (`MapBrowserEvent`), `onMoveStart` / `onMoveEnd` (`MapEvent`) and `onRightClick` (DOM `MouseEvent` from the viewport `contextmenu`).

Build features in `$effect`s and clear the source in the cleanup. Never call `map.updateSize()` — ol observes the target element itself, including across the picture-in-picture move.

## Coordinates

Game coordinates must be re-projected before they become geometry. `src/lib/ui/OlMap/utils.ts`:

```ts
MAP_REAL_X_LEFT = -1280000;
MAP_REAL_Y_TOP = -320000;
MAP_REAL_SIZE = 2200000;
reProjectPoint([x, y]); // tuple → map tuple (flips Y)
reProjectVec2({ x, y }); // Vector2 → map tuple
reProjectPointInverse([x, y]); // map tuple → Vector2
```

## Layers & styling

- `WebGLVectorLayer` for large or frequently updated point sets (players, delivery points); plain `VectorLayer` for labels and small overlays.
- Colors and fonts in `Style` objects come from `$lib/tw-var` (`colorEmerald400`, `fontSans`, `textXs`, `adjustOpacity`) — never hardcoded.
- Imports follow the existing split: barrels for `ol`, `ol/geom`, `ol/style`, `ol/source`; deep paths for layers (`ol/layer/WebGLVector`, …) and `ol/source/Vector`.
- Static features come from `$lib/data/*` inside the wrapper; streamed ones arrive as props. Shared types live in `components/Map/Map/types.ts`.

## Selection is the URL

`Map.svelte` derives a `MapSelection` (`{ pointType, id }`) from the search params — `house`, `delivery`, `player`, `focus_index`, in that precedence — and the wrapper marks that feature selected, forces its layer visible and centres on it. A locked player is followed as it moves; panning breaks the lock. So "view on map", search hits and clicks all just navigate.

```ts
const newParams = getSelectionClearedParams(); // components/Map/utils.ts
newParams.set('house', name);
goto(`/map?${newParams.toString()}`);
```

`getViewHref(Features.House | Player | Delivery, id)` builds the same link for list cards.

## Click semantics

- **Left click** (gated on `isMouse.current`): delivery → lock + `menu=deliveries/<guid>` when `isSm.current`; house → lock + `hf`; teleport → copy its `/tp` command; anything else → clear the selection. On touch a tap only opens the tooltip.
- **Right click** always clears the selection, whatever feature it hits.

## Data

Player positions arrive as a protobuf WebSocket stream; everything else (delivery points and jobs, housing, teleports, shortcut zones) is a TanStack Query, so a hovered point and its open panel share one poll. `/api/v1/teleports/` returns one entry per in-game name — `mergeTeleportPoints` (`Map/Map/teleport.ts`, unit-tested) collapses shared coordinates: longest name wins, ties keep the earlier, the rest become `aliases`.
