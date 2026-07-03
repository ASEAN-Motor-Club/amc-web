---
name: map-system
description: The AMC in-game map system — OlMap/EditorOlMap wrappers, the custom game-world projection and reProjectPoint helpers, WebGL layers, styling from tw-var, static points, and realtime player streams. Read before touching anything under src/lib/ui/OlMap, src/lib/ui/EditorOlMap, or src/lib/components/Map.
---

# Map System

The site renders the Motor Town game world with **OpenLayers** through two layers of abstraction:

- `src/lib/ui/OlMap/` — base display map: custom `Projection`, `WebGLTileLayer` image tiles, view controls, reduced-motion awareness. Accepts a `layers?: BaseLayer[]` prop for overlays.
- `src/lib/ui/EditorOlMap/` — editing variant used by the track editor.
- `src/lib/components/Map/` — feature layer: the main map page (`Map/`), plus `Delivery/`, `Housing/`, `Jobs/`, `Players/`, `Collapsible/` subfeatures, wired to routes in `src/routes/(map)/`.

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
- Static point features (delivery points, houses, POIs) are built in `src/lib/components/Map/Map/staticPoints.ts` from `$lib/data/*`; point/POI types live in `src/lib/components/Map/types.ts`.

## Realtime data

Player positions stream via the API layer (`getPlayerRealtimePositionV2` — protobuf WebSocket; see [[api-layer]]) with `getAbortSignal()` for cleanup. Delivery info is cached in `deliveryInfoCaches.svelte.ts` (reactive rune module).

## UI overlays

Hover/click info uses `HoverInfoTooltip.svelte`, `PoiPanel.svelte`, and info components (`DeliveryInfo`, `HousingInfo`, `PlayerInfo`); map search is `Search.svelte`. Navigation between map subpages uses `goto` from `$app/navigation` (routes under `src/routes/(map)/`).

Related: [[api-layer]], [[openlayers]], [[project-structure]]
