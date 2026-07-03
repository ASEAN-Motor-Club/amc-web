---
name: openlayers
description: OpenLayers (ol) usage in the AMC web repo — build on the OlMap/EditorOlMap wrappers, re-project coordinates, use WebGL layers for large point sets, style from tw-var. Read before writing any ol code.
---

# OpenLayers (`ol`)

- Never instantiate a raw `ol/Map` in routes or features — build on the wrappers: `src/lib/ui/OlMap/` (display) and `src/lib/ui/EditorOlMap/` (editing). Pass overlays via the `layers?: BaseLayer[]` prop.
- Game-world coordinates **must** be converted with `reProjectPoint` from `$lib/ui/OlMap/utils` before creating geometries (see [[map-system]] for the projection details).
- Use `WebGLVectorLayer` for large/frequently-updated point sets (players, delivery points); plain `VectorLayer` only for small overlays.
- Style objects (`Fill`, `Stroke`, `Style`, `Text`) take colors/fonts from `$lib/tw-var` exports (`colorEmerald400`, `fontSans`, `textXs`, `adjustOpacity`) — never hardcode hex values.
- Import deep paths (`ol/layer/Vector`, `ol/source/Vector`, `ol/geom/Point`, …) for tree-shaking, matching existing imports.
- Pointer interaction goes through the wrapper's `onPointerMove` / `onClick` callbacks (`MapBrowserEvent`), not direct map listeners.

Related: [[map-system]], [[project-structure]]
