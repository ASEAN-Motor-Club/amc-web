import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import UnoCSS from '@unocss/svelte-scoped/vite';
import { transformerDirectives } from 'unocss';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      devtoolsJson(),
      UnoCSS({
        cssFileTransformers: [transformerDirectives()],
        classPrefix: '_',
      }),
      sveltekit(),
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/lib/paraglide',
      }),
    ],
    test: {
      projects: [
        {
          extends: './vite.config.ts',
          plugins: [svelteTesting()],
          test: {
            name: 'client',
            environment: 'jsdom',
            clearMocks: true,
            include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
            exclude: ['src/lib/server/**'],
            setupFiles: ['./vitest-setup-client.ts'],
          },
        },
        {
          extends: './vite.config.ts',
          test: {
            name: 'server',
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
  };
});
