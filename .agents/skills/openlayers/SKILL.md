---
name: openlayers
description: OpenLayers (ol) usage in the AMC web repo — build on the OlMap/EditorOlMap wrappers, re-project coordinates, use WebGL layers for large point sets, style from tw-var. Read before writing any ol code.
---

# OpenLayers (`ol`)

- Never instantiate a raw `ol/Map` in routes or features — build on the wrappers: `src/lib/ui/OlMap/` (display) and `src/lib/ui/EditorOlMap/` (editing). Pass overlays via the `layers?: BaseLayer[]` prop.
- On the main map, features and layers belong to `src/lib/components/Map/Map/OlMapWrapper.svelte`; feed it data through props and let its `$effect`s build the features (clearing sources in the effect cleanup) — see [[map-system]].
- Game-world coordinates **must** be converted with `reProjectPoint` from `$lib/ui/OlMap/utils` before creating geometries (see [[map-system]] for the projection details).
- Use `WebGLVectorLayer` for large/frequently-updated point sets (players, delivery points); plain `VectorLayer` only for small overlays.
- Style objects (`Fill`, `Stroke`, `Style`, `Text`) take colors/fonts from `$lib/tw-var` exports (`colorEmerald400`, `fontSans`, `textXs`, `adjustOpacity`) — never hardcode hex values.
- Import deep paths (`ol/layer/Vector`, `ol/source/Vector`, `ol/geom/Point`, …) for tree-shaking, matching existing imports.
- Pointer interaction goes through the wrapper callbacks, never direct map listeners: `OlMap` exposes `onPointerMove` / `onClick` / `onRightClick` / `onPointerDrag` / `onMoveStart` / `onMoveEnd` (`MapBrowserEvent`), and `OlMapWrapper` hit-tests for you and reports features — `onHover(feature, pixel)`, `onClick(feature)`, `onRightClick(feature)`, each with `undefined` for empty map.
- Never call `map.updateSize()`; ol observes the target element itself, including across the picture-in-picture document move.

Related: [[map-system]], [[project-structure]]
