import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { sequence } from '@sveltejs/kit/hooks';
import type { Icon } from '$lib/ui/Icon/types';

const iconList: Icon[] = [
  // add imported icons here
  'map',
  'home',
  'factory',
  'radio',
  'route',
  'light_mode',
  'dark_mode',
  'menu',
  'link',
];

const iconListStr = iconList.toSorted().join(',');

const handleUnoCss: Handle = async ({ event, resolve }) => {
  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%unocss-svelte-scoped.global%', 'unocss_svelte_scoped_global_styles'),
  });
  return response;
};

const handleIconsReplace: Handle = ({ event, resolve }) => {
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%icons%', iconListStr),
  });
};

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request;

    return resolve(event, {
      transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale),
    });
  });

export const handle: Handle = sequence(handleUnoCss, handleIconsReplace, handleParaglide);
