---
name: map-system
description: The AMC in-game map system — the Map/OlMapWrapper/OlMap component split and its one-way data flow, the custom game-world projection and reProjectPoint helpers, WebGL layers, styling from tw-var, URL-driven selection locks, click semantics, and realtime player streams. Read before touching anything under src/lib/ui/OlMap, src/lib/ui/EditorOlMap, or src/lib/components/Map.
---

# Map System

The site renders the Motor Town game world with **OpenLayers**, split by responsibility:

- `src/lib/ui/OlMap/` — base display map: custom `Projection`, `WebGLTileLayer` image tiles, view controls, picture-in-picture button, reduced-motion awareness. Accepts a `layers?: BaseLayer[]` prop for overlays and exposes `centerOn`, `fit`, `getMap`, `getViewState`.
- `src/lib/ui/EditorOlMap/` — editing variant used by the track editor.
- `src/lib/components/Map/Map/OlMapWrapper.svelte` — owns every ol `Feature`, source, layer and hit test for the main map, and drives them from reactive props (the same shape `EditorOlMap` uses).
- `src/lib/components/Map/Map/Map.svelte` — owns app state: `mapState` (POI toggles, persisted to `localStorage` under `mapState`), fetched data, URL params, picture-in-picture, and the overlays.
- `src/lib/components/Map/` — the rest of the feature layer: `Delivery/`, `Housing/`, `Jobs/`, `Players/`, `Collapsible/`, wired to routes in `src/routes/(map)/`.

## One-way data flow (critical)

`Map.svelte` never reaches into the map: no `bind:this`, no imperative `centerOn`/`updateSize` calls. It passes props down (`mapState`, data arrays, `selection`, `deliveryLineData`, `pipActive`) and receives `onHover` / `onClick` / `onRightClick` callbacks back. Anything the map must _do_ is expressed as a prop the wrapper reacts to — add a prop, not a method.

Resizing is not your problem either: ol's own `ResizeObserver` handles it, including when the element is adopted into the picture-in-picture document.

Features are (re)built in `$effect`s inside the wrapper, with teardown in the effect cleanup:

```ts
$effect(() => {
  pinsSource.addFeatures(pinsData.map(/* … */));
  return () => {
    pinsSource.clear();
  };
});
```

## Coordinates (critical)

Game-world coordinates must be re-projected before rendering. Constants and helpers in `src/lib/ui/OlMap/utils.ts`:

```ts
MAP_REAL_X_LEFT = -1280000;
MAP_REAL_Y_TOP = -320000;
MAP_REAL_SIZE = 2200000;
reProjectPoint([x, y]); // game coords → map coords (flips Y)
reProjectPointInverse([x, y]); // map coords → game coords
```

Any `Point` geometry you add must go through `reProjectPoint` — raw game coordinates will render off-map.

## Layers & styling

- Use `WebGLVectorLayer` for large point sets (players, delivery points) — performance matters at this feature count; plain `VectorLayer` is fine for small overlays.
- All colors/fonts in OL `Style` objects come from `$lib/tw-var` exports (`colorEmerald400`, `textXs`, `fontSans`, `adjustOpacity(...)`, …) — never hardcode hex/px values.
- Static features (delivery points, houses) are built from `$lib/data/*` in `OlMapWrapper.svelte`; streamed ones (players, pins, teleports, shortcut zones) come in as props. Point/POI/state types (`PointType`, `MapState`, `PoiType`, `MapSelection`, `TeleportPoint`) live in `src/lib/components/Map/Map/types.ts`.

## Selection is the URL (critical)

There is one focus mechanism: a **lock**. `Map.svelte` derives a `MapSelection` (`{ pointType, id }`) from the search params — `house`, `delivery`, `player`, `focus_index` (a pin index), in that precedence — and hands it to the wrapper, which marks the matching feature `selected`, forces its layer visible and centres the map on it. A locked player is followed as it moves; **panning the map breaks the lock** until something else is selected.

So "view on map", search results and map clicks all do the same thing: navigate. Never centre the map imperatively.

```ts
const newParams = getSelectionClearedParams(); // src/lib/components/Map/utils.ts
newParams.set('house', name);
goto(`/map?${newParams.toString()}`);
```

`getSelectionClearedParams()` drops every selection param, so clearing a lock is just navigating with it. `getViewHref(Features.House | Player | Delivery, id)` builds the same links for list cards.

## Map interaction

The wrapper hit-tests on pointer move and reports the feature (or `undefined`) through `onHover` / `onClick` / `onRightClick`; `Map.svelte` decides what that means:

- **Left click** — delivery → open its menu + lock; house → open housing + lock; teleport → copy its `/tp` command; anything else, including empty map → clear the selection.
- **Right click** — delivery → lock it (keeps its supply/demand lines drawn); otherwise clear.
- Both are gated on `isMouse.current` (`$lib/utils/media.svelte`). On touch, a tap only opens the tooltip and the tooltip's own button navigates.

## Teleports

`/api/v1/teleports/` returns one entry per in-game name, so several names can share one coordinate. `mergeTeleportPoints` (`src/lib/components/Map/Map/teleport.ts`, unit-tested) collapses them into one point: the **longest name wins**, the rest become `aliases` shown in the tooltip. Ties keep the earlier name; the `/tp` copy uses the main name.

## Realtime data

Player positions stream via the API layer (`getPlayerRealtimePositionV2` — protobuf WebSocket; see [[api-layer]]) with `getAbortSignal()` for cleanup. Delivery info is cached in `deliveryInfoCaches.svelte.ts` (reactive rune module).

## UI overlays

Hover/click info uses `HoverInfoTooltip.svelte`, `PoiPanel.svelte`, and info components (`DeliveryInfo`, `HousingInfo`, `PlayerInfo`, `TeleportInfo`); map search is `Search.svelte`. Navigation between map subpages uses `goto` from `$app/navigation` (routes under `src/routes/(map)/`).

Related: [[api-layer]], [[openlayers]], [[project-structure]]
