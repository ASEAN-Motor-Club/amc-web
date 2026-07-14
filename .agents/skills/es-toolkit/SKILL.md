---
name: es-toolkit
description: Utility function conventions in the AMC web repo — es-toolkit for lodash-like helpers (lodash-es was removed), but check src/lib/utils first. Read before adding utility helpers.
---

# es-toolkit

- Import named exports directly from the package root: `import { debounce, isEqual } from 'es-toolkit';` — it's already tree-shakeable, no per-function import paths needed (unlike lodash-es, which this repo no longer uses).
- **Check `src/lib/utils/` first** — many domain helpers already exist with tests (`formatTime`, `filterSubsets`, `colorContrast`, `parsePlayerRole`, `delivery`, `math/`, `media.svelte.ts`, …). Add new reusable helpers there with a colocated `.test.ts`.
- Don't reimplement what es-toolkit already provides, and don't use it for things modern JS does natively (e.g. `Array.prototype.at`, spread, `Object.entries`).

Related: [[codebase-patterns]], [[testing]]
