---
name: lodash
description: Utility function conventions in the AMC web repo — lodash-es with per-function imports, but check src/lib/utils first. Read before adding utility helpers.
---

# lodash-es

- Import individual functions for tree-shaking: `import isError from 'lodash-es/isError';` (or named imports from `'lodash-es'`) — never the whole default export.
- **Check `src/lib/utils/` first** — many domain helpers already exist with tests (`formatTime`, `filterSubsets`, `colorContrast`, `parsePlayerRole`, `delivery`, `math/`, `media.svelte.ts`, …). Add new reusable helpers there with a colocated `.test.ts`.
- Don't reimplement what lodash-es already provides, and don't use lodash for things modern JS does natively (e.g. `Array.prototype.at`, spread, `Object.entries`).

Related: [[codebase-patterns]], [[testing]]
