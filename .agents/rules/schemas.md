---
description: Validation schemas — zod/mini only (eslint-enforced), schemas in src/lib/schema, i18n-aware error factories, derived types.
globs:
  - src/lib/schema/**
---

# Schemas (`zod/mini`)

```ts
import * as z from 'zod/mini';
```

Importing plain `zod` is an eslint error (`Use zod/mini instead for smaller bundle size`; type imports allowed).

- `src/lib/schema/` holds `track.ts` (with `track.test.ts`) and `pin.ts`.
- The mini build is functional: `z.optional(x)`, `.check(z.minLength(1, '…'))` — not chained `.optional()` / `.min()`.
- User-facing validation errors must be translated: pass `{ error: … }` callbacks that call `m['…']()`, as `createWaypointError` does in `track.ts`. `pin.ts` still carries hardcoded English strings and is not a model to copy.
- Derive types with `z.infer`; the codebase distinguishes inferred `Loose*` types from normalized `Required<…>` ones (`pin.ts`).
- `z.toJSONSchema(schema)` feeds editor tooling. It drops the `error` callbacks and emits `additionalProperties: false` — see the track-editor rule before relying on it.
