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
    prerender: {
      handleHttpError: ({ path, _, message }) => {
        if (path === '/stream_high') {
          return;
        }
        throw new Error(message);
      },
    },
  },
};

export default config;
