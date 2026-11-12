import { error } from '@sveltejs/kit';
import { dev } from '$app/env';

// Visual-parity harness for the map renderers: dev server only, never prerendered or served.
export const ssr = false;
export const prerender = false;

export function load() {
  if (!dev) error(404);
}
