import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { sequence } from '@sveltejs/kit/hooks';

const iconList = [
  // add imported icons here
  'map',
  'home',
  'factory',
  'radio',
  'route',
  'light_mode',
  'dark_mode',
  'menu',
];

const iconListStr = iconList.toSorted().join(',');

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

export const handle: Handle = sequence(handleIconsReplace, handleParaglide);
