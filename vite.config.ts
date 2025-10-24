import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import UnoCSS from 'unocss/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { analyzer } from 'vite-bundle-analyzer';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      devtoolsJson(),
      UnoCSS(),
      sveltekit(),
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/lib/paraglide',
        strategy: ['custom-svelteReactiveLocale', 'baseLocale'],
        localStorageKey: 'siteLocale',
      }),
      analyzer({
        enabled: false,
        analyzerMode: 'static',
        exclude: /.+\.(mp4|avif|png|jpg|jpeg|gif|svg)$/,
      }),
    ],
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
    server: {
      proxy: {
        '/stream_high': {
          target: env.VITE_MAIN_SITE,
          changeOrigin: true,
          secure: true,
        },
        '/icecast-status': {
          target: env.VITE_ICE_CAST,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/icecast-status/, '/status-json.xsl'),
        },
        '/login/token': {
          target: env.VITE_API_NEW_BASE,
          secure: true,
        },
      },
    },
    build: {
      minify: 'terser',
      terserOptions: {
        ecma: 2020,
        compress: {
          passes: 4,
        },
      },
    },
  };
});
