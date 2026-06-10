import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import viteConfig from './vite.config';

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        projects: [
          {
            extends: './vite.config.ts',
            test: {
              name: 'comp',
              browser: {
                enabled: true,
                provider: playwright(),
                instances: [{ browser: 'chromium' }],
                headless: true,
              },
              include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
              exclude: ['src/lib/server/**'],
            },
          },
          {
            extends: './vite.config.ts',
            test: {
              name: 'unit',
              environment: 'node',
              include: ['src/**/*.{test,spec}.{js,ts}'],
              exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
            },
          },
        ],
      },
    }),
  ),
);
