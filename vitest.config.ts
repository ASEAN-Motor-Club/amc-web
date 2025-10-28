import { defineConfig, mergeConfig } from 'vitest/config';
import { webdriverio } from '@vitest/browser-webdriverio';
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
                provider: webdriverio(),
                instances: [{ browser: 'chrome' }],
                headless: true,
              },
              include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
              exclude: ['src/lib/server/**'],
              setupFiles: ['./vitest-setup-client.ts'],
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
