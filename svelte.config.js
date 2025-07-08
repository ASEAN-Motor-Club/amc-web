import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'fallback.html',
    }),
    files: {
      assets: process.env.NODE_ENV === 'development' ? 'static_dev' : 'static',
    },
  },
};

export default config;
