---
description: Validation schemas — zod/mini only (eslint-enforced), the functional API, i18n-aware error factories, derived types.
globs:
  - src/lib/schema/**
---

# Schemas (`zod/mini`)

```ts
import * as z from 'zod/mini';
```

Importing plain `zod` is an eslint error. Schemas live in `src/lib/schema/` with colocated tests.

- The mini build is functional: `z.optional(x)`, `.check(z.minLength(1, '…'))` — not chained `.optional()` / `.min()`.
- Errors shown to users must be translated: pass `{ error: … }` callbacks that resolve `m['…']()`, following the waypoint error factory in `track.ts`. Hardcoded English strings elsewhere in the directory are debt, not a pattern.
- Derive types with `z.infer`, keeping the loose inferred shape separate from the normalized required one.
- `z.toJSONSchema()` drops the `error` callbacks and emits `additionalProperties: false` — read the track-editor rule before feeding it to editor tooling.
