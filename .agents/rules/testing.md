---
description: Vitest setup — the comp (browser components), inte (browser pages) and unit (node) projects, the file name that picks one, runes and harnesses in tests, how to run them.
globs:
  - src/**/*.test.ts
  - src/**/*.spec.ts
  - vitest.config.ts
---

# Testing

Three Vitest projects, and **the file name decides which one runs a test**: `*.svelte.{test,spec}.ts` go to `comp` (real Chromium via the Playwright provider, `vitest-browser-svelte`), `*.integration.ts` to `inte` (same browser harness, one project per suite so it can be targeted by name), everything else to `unit` (node). All extend `vite.config.ts`, so tests inherit the app's plugins and need the `PUBLIC_*` env present.

- Name a test after the module it covers so the pair sorts adjacent: `delivery.ts` → `delivery.test.ts`, `_stream.svelte.ts` → `_stream.svelte.test.ts`, `DeliveryInfo.svelte` → `DeliveryInfo.svelte.test.ts`.
- Integration tests exercise a whole page in the browser and carry `.integration` only — `RadioPage.integration.ts`, with a `<Name>.integration.svelte` harness when the page reads context it cannot be handed.
- Colocate tests with the code; there is no `tests/` tree.

## Runes in tests

`*.svelte.test.ts` files compile as Svelte modules, so `$state`, `$derived` and `$effect.root` work directly — a rune-based helper needs no harness component:

```ts
const dispose = $effect.root(() => {
  stream = createEventSourceStream(() => ({ url }));
});
await tick();
```

Add a harness only when the subject reads context it cannot be handed (e.g. a `QueryClient` from its provider). Name it `<Name>.test.svelte` (or `<Name>.integration.svelte` for integration tests); Vitest collects only `.ts`/`.js`, so it is never treated as a test itself.

## Browser tests (comp and inte projects)

Tests run inside a real Chromium iframe: `document`, `window` and `localStorage` are directly accessible, and `locator.element()` / `locator.query()` return the `HTMLElement` synchronously.

```ts
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser'; // NOT '@vitest/browser/context' — deprecated
import { createRawSnippet } from 'svelte';
```

- `render` is async — always `await` it; `output.rerender({ ... })` swaps props, `output.container` is the mount point.
- **Snippet props cannot be plain arrow functions** — `mount()` never converts them, so `children: () => 'Save'` silently renders empty. Pass text snippets via `createRawSnippet(() => ({ render: () => 'Save' }))`; pass real child components via a `<Name>.test.svelte` harness.
- Interact through roles (`await page.getByRole('button').click()`, `await locator.fill('text')`) or deterministic DOM events: `el.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, bubbles: true }))` — `bubbles: true` is required for Svelte 5 delegation.
- Assert with `await expect.element(locator).toHaveTextContent(...)` / `.toBeVisible()` / `.toHaveAttribute(name, value)` / `.toHaveValue(...)`; absence via `locator.all()` or `locator.query()`.
- Fake `requestAnimationFrame`/`ResizeObserver`/`matchMedia` via `vi.stubGlobal`; restore with `vi.unstubAllGlobals()` in `afterEach`.
- Test observable behavior (roles, attributes, callbacks, DOM state), never tailwind class strings.

## Running

```bash
pnpm test                                  # single run, all three projects — prefer this
pnpm exec vitest run --project unit        # node only
pnpm exec vitest run --project comp        # component tests only
pnpm exec vitest run --project inte        # page integration tests only
pnpm exec vitest run path/to/file.test.ts  # one file
```

`pnpm test:unit` is watch mode. `pnpm test` also runs pre-commit, so keep tests fast and deterministic; types are gated separately by `pnpm check`.
