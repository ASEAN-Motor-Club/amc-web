import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import UnoCSS from 'unocss/vite';
import { analyzer } from 'vite-bundle-analyzer';
import envCi from 'env-ci';
import { webmanifestPlugin } from './vite-plugins/webmanifest.ts';
import { dotnetWasmAssetPlugin } from './vite-plugins/dotnet-wasm-asset.ts';
import path from 'node:path';
import { siteOrigin } from './src/lib/data/site.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const { isCi } = envCi();

  return {
    plugins: [
      dotnetWasmAssetPlugin(),
      UnoCSS(),
      sveltekit({
        preprocess: vitePreprocess(),
        adapter: adapter({ fallback: 'fallback.html' }),
        // Prerendered `event.url` / `page.url` carry the real origin, so canonical and og:url are absolute.
        paths: { origin: siteOrigin },
      }),
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/lib/paraglide',
        strategy: ['custom-svelteReactiveLocale', 'baseLocale'],
        localStorageKey: 'siteLocale',
      }),
      // Kit 3 builds client and ssr as environments of one Vite build and leaves the top-level
      // `build.outDir` at Vite's default (`dist`), which is where the analyzer would write. The
      // client output is what adapter-static copies into `build/`, so the report ends up at
      // `build/stats.html`. Assign rather than spread: the analyzer swaps its own hooks after creation.
      Object.assign(
        analyzer({
          enabled: !isCi,
          analyzerMode: 'static',
          fileName: path.resolve('.svelte-kit/output/client/stats.html'),
          exclude: /.+\.(mp4|avif|png|jpg|jpeg|gif|svg)$/,
        }),
        { applyToEnvironment: (environment: { name: string }) => environment.name === 'client' },
      ),
      webmanifestPlugin(),
    ],
    build: {},
    // Monaco's worker bootstrap expects module workers; Vite still defaults to 'iife'.
    worker: {
      format: 'es',
    },
    // Monaco ships ~1000 modules and 101 stylesheets; prebundling it fights the lazy chunk.
    optimizeDeps: {
      exclude: ['monaco-editor'],
    },
    server: {
      fs: {
        allow: ['wasm'],
      },
      proxy: {
        '/icecast-status': {
          target: env.VITE_ICE_CAST,
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/icecast-status/, '/status-json.xsl'),
        },
        '/login/token': {
          target: env.VITE_API_BASE,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/login/, '/api/login'),
        },
      },
    },
  } as UserConfig;
});
