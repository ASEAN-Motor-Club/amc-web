---
description: Vitest setup — the comp (browser) and unit (node) projects, the file-name rule that picks one, runes and harnesses in tests, how to run.
globs:
  - src/**/*.test.ts
  - src/**/*.spec.ts
  - vitest.config.ts
---

# Testing

`vitest.config.ts` merges `vite.config.ts` and defines two projects that both `extends: './vite.config.ts'`, so tests inherit UnoCSS/SvelteKit/Paraglide and need the `PUBLIC_*` env present. **The file name decides the project:**

| Project | Include                                | Environment                                         |
| ------- | -------------------------------------- | --------------------------------------------------- |
| `comp`  | `src/**/*.svelte.{test,spec}.{js,ts}`  | Chromium via `@vitest/browser-playwright`, headless |
| `unit`  | everything else matching `{test,spec}` | Node                                                |

- Name a test after the module it covers so the pair sorts adjacent: `delivery.ts` → `delivery.test.ts`, `_stream.svelte.ts` → `_stream.svelte.test.ts`, `DeliveryInfo.svelte` → `DeliveryInfo.svelte.test.ts`.
- Colocate tests with the code; there is no `tests/` tree.
- Component tests use `vitest-browser-svelte`.

## Runes in tests

`*.svelte.test.ts` files are compiled as Svelte modules, so `$state`, `$derived` and `$effect.root` work directly — a rune-based helper needs no harness component:

```ts
const dispose = $effect.root(() => {
  stream = createEventSourceStream(() => ({ url }));
});
await tick();
```

A harness is only needed when the subject reads context it cannot be handed (e.g. a `QueryClient` from its provider). Name it `<Name>.test.svelte`; Vitest only collects `.ts`/`.js`, so it is never treated as a test itself.

## Running

```bash
pnpm test                                  # single run, both projects — prefer this
pnpm test:unit                             # watch mode
pnpm exec vitest run --project unit        # node only
pnpm exec vitest run path/to/file.test.ts  # one file
```

`pnpm test` also runs pre-commit, so keep tests fast and deterministic. Types are gated separately by `pnpm check`.
