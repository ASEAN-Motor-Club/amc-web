import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { sequence } from '@sveltejs/kit/hooks';

// Cache for the inlined Google Fonts CSS
let cachedFontCSS: string | null = null;

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Koulen&family=Noto+Sans+JP:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap';

async function fetchGoogleFonts(): Promise<string> {
  if (cachedFontCSS) {
    return cachedFontCSS;
  }

  try {
    const response = await fetch(GOOGLE_FONTS_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      cachedFontCSS = await response.text();
      return cachedFontCSS;
    }
  } catch (error) {
    console.warn('Failed to fetch Google Fonts:', error);
  }

  return '';
}

const handleFontInlining: Handle = async ({ event, resolve }) => {
  return resolve(event, {
    transformPageChunk: async ({ html }) => {
      // Replace %google-fonts% placeholder with inlined CSS
      const fontCSS = await fetchGoogleFonts();

      if (fontCSS) {
        return html.replace('%google-fonts%', `<style>${fontCSS}</style>`);
      }

      return html.replace('%google-fonts%', '');
    },
  });
};

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request;

    return resolve(event, {
      transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale),
    });
  });

export const handle: Handle = sequence(handleFontInlining, handleParaglide);
