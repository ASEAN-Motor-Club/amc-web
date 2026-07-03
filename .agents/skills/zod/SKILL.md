---
name: zod
description: Zod usage in the AMC web repo — always the zod/mini build, schemas in src/lib/schema with i18n-aware error factories. Read before writing or modifying validation schemas.
---

# Zod (`zod/mini`)

Always import the **mini** build for bundle size:

```ts
import * as z from 'zod/mini';
```

- Schemas live in `src/lib/schema/` (`track.ts`, `pin.ts`) with colocated `.test.ts` files.
- zod/mini uses the functional API: `z.optional(...)`, `.check(z.minLength(1, '...'))` instead of chained `.optional()` / `.min()`.
- User-facing validation errors must be i18n-aware: pass per-field `{ error: … }` callbacks that produce translated messages via `m['…']()` from `$messages` — see the `createWaypointError` factory in `src/lib/schema/track.ts`.
- Derive types from schemas with `z.infer<typeof schema>`; the codebase distinguishes `Loose*` (inferred, optionals) from `Required<…>` normalized types (see `pin.ts`).

Related: [[codebase-patterns]], [[path-aliases]]
