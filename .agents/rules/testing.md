---
description: Vitest setup — the comp (browser) and unit (node) projects, the file name that picks one, runes and harnesses in tests, how to run them.
globs:
  - src/**/*.test.ts
  - src/**/*.spec.ts
  - vitest.config.ts
---

# Testing

Two Vitest projects, and **the file name decides which one runs a test**: `*.svelte.{test,spec}.ts` goes to `comp` (real Chromium via the Playwright provider, `vitest-browser-svelte`), everything else to `unit` (node). Both extend `vite.config.ts`, so tests inherit the app's plugins and need the `PUBLIC_*` env present.

- Name a test after the module it covers so the pair sorts adjacent: `delivery.ts` → `delivery.test.ts`, `_stream.svelte.ts` → `_stream.svelte.test.ts`, `DeliveryInfo.svelte` → `DeliveryInfo.svelte.test.ts`.
- Colocate tests with the code; there is no `tests/` tree.

## Runes in tests

`*.svelte.test.ts` files compile as Svelte modules, so `$state`, `$derived` and `$effect.root` work directly — a rune-based helper needs no harness component:

```ts
const dispose = $effect.root(() => {
  stream = createEventSourceStream(() => ({ url }));
});
await tick();
```

Add a harness only when the subject reads context it cannot be handed (e.g. a `QueryClient` from its provider). Name it `<Name>.test.svelte`; Vitest collects only `.ts`/`.js`, so it is never treated as a test itself.

## Running

```bash
pnpm test                                  # single run, both projects — prefer this
pnpm exec vitest run --project unit        # node only
pnpm exec vitest run path/to/file.test.ts  # one file
```

`pnpm test:unit` is watch mode. `pnpm test` also runs pre-commit, so keep tests fast and deterministic; types are gated separately by `pnpm check`.
