---
name: monaco-code-editor
description: The Monaco JSON editor in the AMC web repo — the pinned version and why, the single-import rule, worker/Vite wiring, zod-derived JSON Schema validation, the CodeEditor lifecycle, and the track editor's map/code view switch. Read before touching src/lib/ui/CodeEditor, the track editor's code view, or upgrading monaco-editor.
---

# Monaco (`monaco-editor`)

Used by the track editor's code view
(`src/lib/components/TrackEditor/Editor/Editor.svelte`) to hand-edit a track as JSON.

## Version is pinned to 0.54.0 — do not bump blindly

`0.55.0` and `0.56.0` are breaking for this integration:

- `0.56.0` added an `exports` map (`"./*": "./esm/vs/*.js"`), so every `monaco-editor/esm/vs/…`
  specifier resolves to `esm/vs/esm/vs/…` and fails. The replacement form is `monaco-editor/editor/…`.
- `0.56.0` deleted `esm/vs/editor/editor.all.js`; the only remaining bundle entry is `editor.main.js`,
  which pulls in every language.
- `0.55.0` moved `languages.css/html/json/typescript` off the `monaco` namespace, so
  `monaco.languages.json.jsonDefaults` no longer exists — schemas are registered by importing
  `jsonDefaults` from the contribution module instead.

Upgrading means rewriting `src/lib/ui/CodeEditor/monaco.ts` for all three, and re-checking bundle
size once `editor.all.js` is gone.

## Import through `monaco.ts` only

`src/lib/ui/CodeEditor/monaco.ts` is the single import choke point. Reaching Monaco through a second
specifier creates a **second copy of the standalone API singleton**, and only one of them carries the
json contribution — diagnostics silently stop working.

```ts
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
```

- Keep the `.js` extensions — extensionless resolution is what 0.55 broke.
- `editor.all.js` is required. `editor.api.js` registers **zero** contributions: no suggest widget,
  no hover, no find, and codicons render as empty boxes.
- `CodeEditor.svelte` imports it **statically**, so Monaco ships with the page rather than arriving on
  first use. SvelteKit still code-splits per route: the ~2.5 MB chunk lands in the `/track/edit` node's
  dependency list and is only referenced from the entry's `__vite__mapDeps` table, never statically
  imported by it. Confirm after a build by grepping the entry for the chunk name and checking it sits
  next to `nodes/22` rather than in an `import` statement.
- `optimizeDeps: { exclude: ['monaco-editor'] }` in `vite.config.ts` means `pnpm dev` fetches Monaco's
  ~1000 modules individually on every `/track/edit` load. If that gets painful, switch to
  `optimizeDeps.include` listing **all three** specifiers above — including only some of them yields
  two copies of the standalone API singleton and silently kills diagnostics.

## Workers

Both labels must be handled — the editor worker service is spawned even for a plain json model
(word-based suggestions, link detection):

```ts
self.MonacoEnvironment = {
  getWorker: (_workerId, label) => (label === 'json' ? new JsonWorker() : new EditorWorker()),
};
```

`vite.config.ts` needs `worker: { format: 'es' }` (Vite still defaults to `iife`) and
`optimizeDeps: { exclude: ['monaco-editor'] }` (the package is ~1000 modules and 101 stylesheets).
Neither key is in SvelteKit's `enforced_config`. SvelteKit forces `base: './'` because
`svelte.config.js` sets no `kit.paths`, so Vite emits worker URLs as
`new URL('../workers/…', import.meta.url)` — relocatable under `adapter-static`. Confirm any change
here with `pnpm build && pnpm preview`, not just `pnpm dev`.

## Schema validation

Monaco's json worker cannot take a zod schema, so the JSON Schema is _derived_ from it rather than
hand-written — a `<script module>` const in `Editor.svelte`, computed once per module:

```ts
const trackJsonSchema = JSON.parse(JSON.stringify(z.toJSONSchema(trackSchema))) as object;
```

It is not a second source of truth. `trackSchema.safeParse` still runs on every keystroke and is what
gates Save and produces the error list; the JSON Schema only adds the as-you-type layer (property
completion, inline markers). Removing it keeps validation and loses completion.

- The JSON round-trip strips zod's non-enumerable `~standard` property, which holds functions and
  cannot cross the worker `postMessage` boundary.
- Set `schemaValidation: 'error'` in `setDiagnosticsOptions` — the default is `'warning'`, which
  renders as a faint underline and reads as optional.
- `zod/mini`'s `toJSONSchema` **drops the i18n `error` callbacks** (they are runtime-only), so
  Monaco's inline messages are generic English. The translated messages come from
  `trackSchema.safeParse`, which is what actually gates saving. Keep both: the schema catches typos
  as you type, zod produces the user-facing errors.
- `toJSONSchema` emits `additionalProperties: false`, which is _stricter_ than zod (a non-strict
  `z.object` silently strips unknown keys). This is deliberate — it catches `scale3d` vs `scale3D`.
- Diagnostics options are **global**, not per-editor, so `CodeEditor` binds its schema to its own
  model with `fileMatch: [modelUri.toString()]` and a per-instance `crypto.randomUUID()` uri. Two
  simultaneous `CodeEditor`s would need the registration hoisted into a merging registry.

## `CodeEditor.svelte` lifecycle

Follow `onMount` + returned cleanup (as in `OlMap`/`Lottie`), not `$effect` for creation. Creation is
fully synchronous now that the import is static, so there is no unmount race to guard against.

- Dispose the model separately: `editor.dispose()` only owns models it created itself, and this
  wrapper passes `model:` explicitly.
- Push external `value` updates with `model.pushEditOperations(selections, …, () => selections)`.
  `model.setValue()` resets the cursor to (1,1) and clears undo. Guard it with an
  `applyingExternalValue` flag, or `onDidChangeContent → onChange → parent state → $effect` loops.
- Monaco's theme is global (`monaco.editor.setTheme`) and this app toggles dark mode with a raw
  `dark` class on `<html>` with no store — hence the `MutationObserver` on `document.documentElement`.
- The stock `vs` / `vs-dark` themes are used as-is, so Monaco paints its own background. If you ever
  want it to inherit the container's colour instead, note that Monaco theme colours must be hex while
  the app's palette is oklch (`$lib/tw-var`) — the way around that is a `defineTheme` blanking every
  surface to `#00000000`, not a colour conversion.
- `automaticLayout: true` plus one `requestAnimationFrame(() => editor.layout())`, because ancestors
  can still be laid out after this child's `onMount` (child effects precede parent effects in
  Svelte 5), leaving the first measurement stale.
- Give the container real height so the suggest and hover widgets fit inside `.overflow-guard`. Do
  **not** reach for `fixedOverflowWidgets: true` — it hosts widgets on `document.body`, which can land
  below whatever the editor is stacked inside.
- `wordBasedSuggestions: 'off'` keeps completion to schema properties instead of words already in the
  document.

## The code view is a view, not a modal

`Editor.svelte` swaps the map for the editor in place. The current view is the `?view=` query param
(`code`, anything else means map), written with `goto('?…', { replaceState: true, noScroll: true })`
via the shared `clientSearchParams` helpers. `replaceState` is the point: switching views never grows
the history stack, so none of the history machinery an overlay would need exists.

An earlier version _was_ a modal held in `page.state`, and it went badly — recorded here so nobody
rebuilds it. `beforeNavigate` does not fire for shallow routing, so browser Back out of the modal had
to be caught by an `$effect.pre` on the page state; that effect also read the dirty flag, so it re-ran
on every keystroke and a stale close transition could slam the editor shut as it opened. If you find
yourself reaching for `pushState` here, reconsider.

Three consequences worth knowing:

- **Exactly one of the map and the editor is mounted**, so neither pays for the other. The map's
  viewport is carried across the unmount by hand: `OlMap` takes an `initialView` prop and exports
  `getViewState()`, `EditorOlMap` forwards both, and `Editor.svelte` captures the state before
  switching and hands it back on remount. The `$effect` that calls `zoomFit` runs on every map mount
  and skips the fit when a saved viewport was restored — `handleCodeSave` clears the saved viewport,
  so a wholesale JSON replace refits instead of keeping a now-meaningless view. `untrack` around the
  `zoomFit` call is required, or the reactive reads inside it make the effect re-fit on every edit.
- **`beforeNavigate` must ignore same-pathname navigations**, or every view switch raises the leave
  guard.
- `/track` forwards its whole query string to `/track/edit`, so a reload can land straight in code
  view — `onMount` seeds the buffer when `codeView` is already true. Read `codeView` inside `onMount`,
  not at the top level, or the compiler warns `state_referenced_locally`.

## Three dirty states

`unsaved = dirty || localDirty || codeDirty`, and all three feed both `beforeunload` and
`beforeNavigate`:

| flag         | meaning                                         | committed by        |
| ------------ | ----------------------------------------------- | ------------------- |
| `dirty`      | `trackData` differs from the loaded track       | never — download it |
| `localDirty` | waypoint panel buffer vs. the selected waypoint | Save Changes        |
| `codeDirty`  | `codeText` vs. the JSON it was seeded from      | Save (code view)    |

Both buffers commit only on their own Save and ask before being abandoned (`confirmDiscardPointEdits`
for waypoints, an inline confirm in `handleLeaveCodeView` for the code buffer), through the ordinary
`showModal`. `localDirty` must test `initialEditingPoint !== undefined` first — it starts undefined
against a zeroed buffer, so a naive `!isEqual` reports dirty before anything is ever selected.

Component tests do not cover Monaco. To verify by hand, drop a track JSON into `static/` and open
`/track?uri=/your-track.json` — `SelectTrack` fetches the `?uri=` param straight into the editor.

Related: [[codebase-patterns]], [[zod]], [[app-shell]], [[i18n-paraglide]]
