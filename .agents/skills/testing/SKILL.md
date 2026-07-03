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

- Component tests must be named `<Name>.svelte.test.ts` and use `vitest-browser-svelte` to render components in the real browser.
- Pure logic tests are colocated `.test.ts` files next to the code (see `src/lib/utils/*.test.ts`, `src/lib/schema/track.test.ts`, `src/lib/api/_api.test.ts`).

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
