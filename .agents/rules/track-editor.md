---
description: Track editor and its Monaco JSON view — the code view is a view not a modal, three dirty flags, quaternion rotations, the pinned monaco version and its single import choke point.
globs:
  - src/lib/components/TrackEditor/**
  - src/lib/ui/CodeEditor/**
---

# Track editor

`Editor/Editor.svelte` swaps the map for the code editor in place, driven by the `?view=` param and written with `goto('?…', { replaceState: true, noScroll: true })`. `replaceState` keeps view switching out of the history stack. An earlier `pushState` modal went badly (`beforeNavigate` doesn't fire for shallow routing, and the close guard re-ran on every keystroke) — don't rebuild it.

- Exactly one of the map and the editor is mounted, so the viewport is carried by hand: capture `getViewState()` before switching, pass it back as `initialView`, and keep the `untrack` around `zoomFit` or it refits on every edit.
- `beforeNavigate` must ignore same-pathname navigations, or every view switch raises the leave guard.
- A reload can land straight in code view, so `onMount` seeds the buffer — read the view flag inside `onMount`, not at the top level.

## Three dirty flags

`unsaved = dirty || localDirty || codeDirty`, all feeding `beforeunload` and `beforeNavigate`:

| flag         | meaning                                         | committed by        |
| ------------ | ----------------------------------------------- | ------------------- |
| `dirty`      | `trackData` differs from the loaded track       | never — download it |
| `localDirty` | waypoint panel buffer vs. the selected waypoint | Save Changes        |
| `codeDirty`  | `codeText` vs. the JSON it was seeded from      | Save (code view)    |

Each buffer commits only on its own Save and confirms before being abandoned. `localDirty` must test that a waypoint was actually selected first — it starts undefined against a zeroed buffer, so a bare `!isEqual` reports dirty before anything is touched.

## Rotations

Waypoint rotations are `{x, y, z, w}` quaternions. Use the `quaternion` package through `TrackEditor/utils/` and always convert with the shared `WP_EULER_ORDER`; never drop to Euler angles for intermediate math. Vector and normalization helpers live in `$lib/utils/math/`.

## 3D view

`EditorThreeMap.svelte` (`src/lib/ui/EditorThreeMap/`) is a third view flavor driven by a
`threeDView` state in `Editor.svelte` (a button, not a query param — only code/map are URLs).
It always renders gates, so the gate-mode toggle is hidden while it is mounted; the shared
`map` ref is typed structurally (`EditorMap`: `zoomFit` + `getViewState`), and 3D's
`getViewState()` returns `undefined` — the 2D viewport is parked in `parkedMapView` on the way
in and restored on the way out.

- `trackGates.ts` owns the overlay: one yellow **gate box** per waypoint built straight from the
  waypoint's full 3D data — the in-game gate object is a 1 m cube scaled by scale3D
  (scale(1,1,1) IS a cube), so the box spans scale3D.y along the quaternion's UE local-Y
  (width, the a/b pick line), scale3D.x along local X (depth) and scale3D.z along local Z
  (height); no terrain sampling, and the quaternion rotates in the UE frame and maps to
  world components x/−y/z directly, so three.js rotation conventions never enter. The spec
  carries world-space half-extent vectors `ex`/`ez` for the two extra axes (ey = a − center).
  The box renders as 6 semi-transparent faces (`GATE_FACE_OPACITY`) plus the 12 edges as an
  opaque `LineSegments` frame. A waypoint **dot** shows from afar
  and fades out as the camera closes in (the gate fades in over the same
  `GATE_FADE_NEAR_M..GATE_FADE_FAR_M` range, incl. the selected dot); the connector line is
  a flat ribbon with clamped miter joins (`TRACK_LINE_WIDTH_M`, `TRACK_LINE_OPACITY`, no
  depth test, renderOrder below the gates). Dots
  are camera-facing `Mesh` quads with `MeshBasicMaterial` (its opacity animation is proven
  under WebGPURenderer; SpriteMaterial/SpriteNodeMaterial opacity paths both misbehaved —
  one never showed, the other never faded), scaled per frame for constant screen size. Number labels follow `showNum`; the orange
  selected overlay is drawn from the live `selectedWaypoint` (`fromEulerWp` of the editing
  buffer). The ghost: while a drag is live (`setDragging(true)`) the committed gate stays
  visible at its original spot; when the drag commits, the ghost clears — the overlay IS
  the waypoint then (deselect restores it).
- Pointer interaction lives in the wrapper: ground pan is suppressed via the scene's
  `groundPanBlocked` callback (queried inside groundPan's pointerdown, which runs first);
  a press on the selected gate drags along a horizontal plane at the grabbed gate's height and commits through `onSelectedPointMove` on release, converting world→game with
  `worldXZToGamePlane` (the inverse of `gamePlaneToWorldXZ`, round-trip tested).
- `zoomFit` tips the camera toward **+Z**: with a near-straight-down lookAt, screen-up
  resolves opposite the horizontal offset, so a +X offset renders west-up; the +Z offset
  projects screen-up onto world −Z (north up). The editor scene passes
  `minDistance: TRACK_EDITOR_MIN_DISTANCE_M` so gates can be worked on up close.

## Monaco

**Pinned to 0.54.0 — do not bump blindly.** 0.55 moved `languages.json` off the `monaco` namespace; 0.56 added an `exports` map that breaks every `monaco-editor/esm/vs/…` specifier and deleted `editor.all.js`. Either bump means rewriting `src/lib/ui/CodeEditor/monaco.ts`.

`monaco.ts` is the single import choke point. A second specifier creates a second standalone-API singleton and only one carries the json contribution, so diagnostics die silently.

```ts
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
```

- Keep the `.js` extensions, and keep `editor.all.js` — `editor.api.js` alone registers zero contributions (no suggest, no hover, empty codicons).
- Handle both worker labels: `json` → JsonWorker, everything else → EditorWorker.
- If you ever switch `optimizeDeps.exclude` to `include`, list all three specifiers or you get two singletons again.

### Schema validation

The json worker can't take a zod schema, so the JSON Schema is derived once in a `<script module>` const: `JSON.parse(JSON.stringify(z.toJSONSchema(trackSchema)))`. The round-trip strips zod's non-enumerable `~standard`, which holds functions and can't cross `postMessage`.

It is not a second source of truth — `safeParse` still runs on every keystroke, gates Save and produces the translated errors; `toJSONSchema` drops the i18n callbacks and only adds completion and inline markers. It also emits `additionalProperties: false`, deliberately stricter than zod's silent stripping. Set `schemaValidation: 'error'`, and bind the schema to a per-instance model uri via `fileMatch` because diagnostics options are global.

### `CodeEditor.svelte` lifecycle

- `onMount` + returned cleanup, not `$effect`. Dispose the model separately — `editor.dispose()` only owns models it created.
- Push external values with `model.pushEditOperations` behind a guard flag; `setValue()` resets the cursor and clears undo.
- Monaco's theme is global and the app toggles a raw `dark` class on `<html>`, hence the `MutationObserver` on `documentElement`.
- `automaticLayout: true` plus one `requestAnimationFrame(() => editor.layout())`, because ancestors can lay out after this child's `onMount`.
- Give the container real height so widgets fit inside `.overflow-guard`; `fixedOverflowWidgets` hosts them on `document.body` and mis-stacks them.

No test covers Monaco. Exercise it by hand: drop a track JSON in `static/` and open `/track?uri=/your-track.json`.
