---
name: testing
description: Test setup in the AMC web repo — the two Vitest projects (browser component tests vs node unit tests), file-naming rules that decide which project runs a test, and how to run them. Read before writing or running tests.
---

# Testing

Vitest with **two projects** defined in `vitest.config.ts` (which merges `vite.config.ts`). The **file name decides which project runs a test**:

| Project | File pattern                     | Environment                                              |
| ------- | -------------------------------- | -------------------------------------------------------- |
| `comp`  | `src/**/*.svelte.{test,spec}.ts` | Real Chromium via Playwright browser provider (headless) |
| `unit`  | `src/**/*.{test,spec}.ts` (rest) | Node                                                     |

- **Name the test after the module it tests**, so the pair sorts adjacent in a directory listing:
  `delivery.ts` → `delivery.test.ts`, `_stream.svelte.ts` → `_stream.svelte.test.ts`,
  `DeliveryInfo.svelte` → `DeliveryInfo.svelte.test.ts`. Never invent a separate name.
- Pure logic tests are colocated `.test.ts` files next to the code (see `src/lib/utils/*.test.ts`,
  `src/lib/schema/track.test.ts`, `src/lib/api/_api.test.ts`).
- Component tests are named `<Name>.svelte.test.ts` and use `vitest-browser-svelte` to render in the
  real browser.

## Runes inside tests

`*.svelte.test.ts` files are compiled as **Svelte module files**, so `$state`, `$derived` and
`$effect.root` work directly in them. The plugin's module filter is
`^[^?#]+(?:\.svelte\.)(?:[^.\\/]+\.)*(?:js|ts)(?:[?#]|$)` — the middle group allows the extra
`test.` infix.

So a rune-based helper needs no harness component; mount it in an effect root and assert on the
returned object (see `src/lib/api/_stream.svelte.test.ts`):

```ts
const dispose = $effect.root(() => {
  stream = createEventSourceStream(() => ({ url }));
});
await tick();
```

A harness component is only needed when the code under test reads **context** it cannot be handed
directly — e.g. a component pulling the `QueryClient` out of `QueryClientProvider`. Name it
`<Name>.test.svelte` so it sorts with its subject and is visibly test-only (see
`src/lib/components/Map/Map/DeliveryInfo.test.svelte`). Vitest's include patterns only match
`.ts`/`.js`, so a `.test.svelte` file is never collected as a test itself.

## Running

```bash
pnpm test                          # single run, all projects — prefer this
pnpm test:unit                     # watch mode
pnpm exec vitest run --project unit            # node tests only
pnpm exec vitest run path/to/file.test.ts      # one file
```

`pnpm test` also runs in the lefthook pre-commit pipeline, so keep tests fast and deterministic — see [[git-hooks]].

## Conventions

- Colocate tests with the code under test; no separate `tests/` tree.
- Utilities and schemas should have unit tests; UI components get Storybook stories always, browser tests where behavior warrants it.
- `pnpm check` (svelte-check) is the type-level gate and runs separately from Vitest.

Related: [[codebase-patterns]], [[git-hooks]], [[architecture]]
