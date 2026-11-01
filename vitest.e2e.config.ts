import { defineConfig } from 'vitest/config';

// E2E smoke suite over the static build — kept out of `vitest.config.ts` (and so out of `pnpm test`
// and pre-commit) because it needs `pnpm build` first. Run: `pnpm build && pnpm test:e2e`.
// The tests drive Playwright from node; only the `#lib` / `#messages` subpath imports need resolving,
// which Vite does from package.json `imports`.
export default defineConfig({
  test: {
    name: 'e2e',
    environment: 'node',
    include: ['src/**/*.e2e.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // One browser and server per file; the cases inside are independent pages.
    fileParallelism: false,
  },
});
