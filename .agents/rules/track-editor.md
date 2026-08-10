---
description: Track editor and its Monaco JSON view — pinned monaco version, the single import choke point, zod-derived schema validation, editor lifecycle, dirty state, quaternion rotations.
globs:
  - src/lib/components/TrackEditor/**
  - src/lib/ui/CodeEditor/**
---

# Track editor

`Editor/Editor.svelte` holds `trackData` and swaps `EditorOlMap` for `ui/CodeEditor` in place. The current view is the `?view=` param (`code`, anything else is the map), written with `goto('?…', { replaceState: true, noScroll: true })` — `replaceState` keeps view switching out of the history stack, which is why none of the shallow-routing machinery an overlay would need exists. Do not turn it back into a `pushState` modal.

- Exactly one of the map and the editor is mounted. The viewport is carried by hand: `Editor.svelte` captures `getViewState()` before switching and passes it back as `initialView`; the `zoomFit` `$effect` skips the fit when a viewport was restored and must keep its `untrack`, or it refits on every edit. `handleCodeSave` clears the saved viewport so a wholesale JSON replace refits.
- `beforeNavigate` must ignore same-pathname navigations or every view switch raises the leave guard.
- `/track` forwards its query string to `/track/edit`, so a reload can land straight in code view — `onMount` seeds the buffer, and `codeView` must be read inside `onMount` (`state_referenced_locally`).

## Three dirty flags

`unsaved = dirty || localDirty || codeDirty`, all three feeding `beforeunload` and `beforeNavigate`:

| flag         | meaning                                         | committed by        |
| ------------ | ----------------------------------------------- | ------------------- |
| `dirty`      | `trackData` differs from the loaded track       | never — download it |
| `localDirty` | waypoint panel buffer vs. the selected waypoint | Save Changes        |
| `codeDirty`  | `codeText` vs. the JSON it was seeded from      | Save (code view)    |

Both buffers commit only on their own Save and confirm before being abandoned (`confirmDiscardPointEdits`, `handleLeaveCodeView`). `localDirty` must test `initialEditingPoint !== undefined` first — it starts undefined against a zeroed buffer, so a naive `!isEqual` reports dirty before anything is selected.

## Rotations

Waypoint rotations are `{x, y, z, w}` quaternions (`quaternionSchema`, module-private inside `src/lib/schema/track.ts`, reachable via `waypointSchema.rotation` / the `Waypoint` type). Math uses the `quaternion` package in `TrackEditor/utils/` (`index.ts`, `normalized.ts`, `autoRotate.ts`) and `Editor.svelte`. Always convert through the shared `WP_EULER_ORDER` exported from `utils/index.ts`; don't hop to Euler angles for intermediate math. Vector helpers are `$lib/utils/math/vectors` and `$lib/utils/math/rotation/normalized`. `utils/average.ts` is plain angle math and uses no quaternions.

## Monaco (`monaco-editor`)

### Pinned to 0.54.0 — do not bump blindly

`0.55.0` moved `languages.json` off the `monaco` namespace (`jsonDefaults` must then come from the contribution module). `0.56.0` added an `exports` map that breaks every `monaco-editor/esm/vs/…` specifier and deleted `esm/vs/editor/editor.all.js`, leaving only the all-languages `editor.main.js`. Upgrading means rewriting `src/lib/ui/CodeEditor/monaco.ts` and re-checking bundle size.

### Import through `monaco.ts` only

A second specifier creates a second copy of the standalone API singleton, only one of which carries the json contribution — diagnostics then die silently.

```ts
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
```

- Keep the `.js` extensions. `editor.all.js` is required — `editor.api.js` alone registers zero contributions (no suggest, no hover, no find, empty codicon boxes).
- `monaco.ts` also imports both `?worker` entries and exports `LIGHT_THEME` / `DARK_THEME`. Both worker labels must be handled: `json` → JsonWorker, everything else → EditorWorker (the editor worker service spawns even for a plain json model).
- `vite.config.ts` needs `worker: { format: 'es' }` and `optimizeDeps: { exclude: ['monaco-editor'] }` (~1000 modules, 101 stylesheets). Neither is in SvelteKit's enforced config. Dev therefore fetches those modules individually; if you switch to `optimizeDeps.include`, list **all three** specifiers or you get two singletons again.
- `CodeEditor.svelte` imports it statically; SvelteKit still code-splits so the ~2.5 MB chunk stays in the `/track/edit` node's dependency list. Verify changes with `pnpm build && pnpm preview`, not just `pnpm dev`.

### Schema validation

The json worker cannot take a zod schema, so the JSON Schema is derived from it in a `<script module>` const:

```ts
const trackJsonSchema = JSON.parse(JSON.stringify(z.toJSONSchema(trackSchema))) as object;
```

- The JSON round-trip strips zod's non-enumerable `~standard`, which holds functions and cannot cross `postMessage`.
- This is not a second source of truth: `trackSchema.safeParse` runs on every keystroke, gates Save and produces the translated error list. `zod/mini`'s `toJSONSchema` drops the i18n `error` callbacks, so Monaco's inline text is generic English; it only adds completion and as-you-type markers.
- `toJSONSchema` emits `additionalProperties: false`, stricter than zod's silent stripping — deliberate, it catches `scale3d` vs `scale3D`.
- Set `schemaValidation: 'error'` (the default `'warning'` reads as optional). Diagnostics options are global, so the schema is bound to a per-instance `crypto.randomUUID()` model uri via `fileMatch`; two simultaneous editors would need a merging registry.

### `CodeEditor.svelte` lifecycle

- `onMount` + returned cleanup (as in `OlMap`/`Lottie`), not `$effect`. Dispose the model separately — `editor.dispose()` only owns models it created.
- Push external `value` updates with `model.pushEditOperations`, guarded by `applyingExternalValue`. `model.setValue()` resets the cursor and clears undo.
- Monaco's theme is global and the app toggles a raw `dark` class on `<html>`, hence the `MutationObserver` on `document.documentElement`. Stock `vs`/`vs-dark` are used as-is, so Monaco paints its own background; matching the app palette would need a `defineTheme` blanking every surface (theme colors must be hex, `$lib/tw-var` is oklch).
- `automaticLayout: true` plus one `requestAnimationFrame(() => editor.layout())`, because ancestors can be laid out after this child's `onMount`.
- Give the container real height so suggest/hover widgets fit inside `.overflow-guard`; `fixedOverflowWidgets: true` hosts them on `document.body` and lands them below the surrounding stack.
- `wordBasedSuggestions: 'off'` keeps completion to schema properties.

Monaco has a story but no test. To exercise it by hand, drop a track JSON in `static/` and open `/track?uri=/your-track.json`.
