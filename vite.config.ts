import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import UnoCSS from 'unocss/vite';
import { analyzer } from 'vite-bundle-analyzer';
import envCi from 'env-ci';
import { webmanifestPlugin } from './vite-plugins/webmanifest';
import { dotnetWasmAssetPlugin } from './vite-plugins/dotnet-wasm-asset';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const { isCi } = envCi();

  return {
    plugins: [
      dotnetWasmAssetPlugin(),
      UnoCSS(),
      sveltekit(),
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/lib/paraglide',
        strategy: ['custom-svelteReactiveLocale', 'baseLocale'],
        localStorageKey: 'siteLocale',
      }),
      analyzer({
        enabled: !isCi,
        analyzerMode: 'static',
        exclude: /.+\.(mp4|avif|png|jpg|jpeg|gif|svg)$/,
      }),
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
        '/stream': {
          target: env.VITE_MAIN_SITE,
          changeOrigin: true,
          secure: true,
        },
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
