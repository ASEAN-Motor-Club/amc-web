import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';

// E2E smoke suite over the static build — kept out of `vitest.config.ts` (and so out of `pnpm test`
// and pre-commit) because it needs `pnpm build` first. Run: `pnpm build && pnpm test:e2e`.
// The tests drive Playwright from node; only the `#lib` / `#messages` subpath imports need resolving,
// which Vite does from package.json `imports`. Paraglide 3 emits `messages.js` as virtual modules, so the
// Paraglide plugin must be present to resolve them; the locale is always the base locale in node.
export default defineConfig({
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
      strategy: ['baseLocale'],
    }),
  ],
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
