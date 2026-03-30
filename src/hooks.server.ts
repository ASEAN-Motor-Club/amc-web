import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection } from '$lib/paraglide/runtime';
import { sequence } from '@sveltejs/kit/hooks';
import { colorBackground100, colorBackground900 } from '$lib/tw-var';
import { m } from '$lib/paraglide/messages';
import notoSansLatinWghtNormalWoff2 from '@fontsource-variable/noto-sans/files/noto-sans-latin-wght-normal.woff2?no-inline';
import notoSansThaiCssUrl from '@fontsource-variable/noto-sans-thai/index.css?url';
import notoSansSCCssUrl from '@fontsource-variable/noto-sans-sc/index.css?url';
import notoSansJPCssUrl from '@fontsource-variable/noto-sans-jp/index.css?url';
import notoSansKRCssUrl from '@fontsource-variable/noto-sans-kr/index.css?url';
import splashBig from '$lib/assets/images/splash_big.jpg?no-inline';
import faviconIco from '$lib/assets/images/icon/favicon.ico?no-inline';
import faviconSvg from '$lib/assets/images/icon/favicon.svg?no-inline';
import appleTouchIcon from '$lib/assets/images/icon/apple-touch-icon.png?no-inline';

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
    event.request = localizedRequest;
    return resolve(event, {
      transformPageChunk: ({ html }) => {
        return html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale));
      },
    });
  });

const deferredFontCssUrls = [
  notoSansThaiCssUrl,
  notoSansSCCssUrl,
  notoSansJPCssUrl,
  notoSansKRCssUrl,
] as unknown as string[];

const handleStaticHead: Handle = ({ event, resolve }) =>
  resolve(event, {
    transformPageChunk: ({ html }) => {
      const staticHead = [
        `<meta name="theme-color" content="${colorBackground100}" media="(prefers-color-scheme: light)" />`,
        `<meta name="theme-color" content="${colorBackground900}" media="(prefers-color-scheme: dark)" />`,
        `<meta name="description" content="${m['home.desc_title']()}" />`,
        `<link rel="preload" as="font" href="${notoSansLatinWghtNormalWoff2 as string}" type="font/woff2" crossorigin="anonymous" />`,
        ...deferredFontCssUrls.map(
          (href) =>
            `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${href}"></noscript>`,
        ),
        `<link rel="icon" href="${faviconSvg}" type="image/svg+xml" />`,
        `<link rel="icon" href="${faviconIco}" />`,
        `<link rel="apple-touch-icon" href="${appleTouchIcon}" />`,
        `<meta property="og:site_name" content="${m.site_name()}" />`,
        `<meta property="og:description" content="${m['home.desc_title']()}" />`,
        `<meta property="og:image" content="${splashBig}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta property="og:type" content="website" />`,
        `<meta name="apple-mobile-web-app-capable" content="yes" />`,
        `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`,
        `<meta name="apple-mobile-web-app-title" content="${m.site_name_short()}" />`,
        `<meta name="mobile-web-app-capable" content="yes" />`,
        `<meta name="mobile-web-app-status-bar-style" content="default" />`,
        `<meta name="mobile-web-app-title" content="${m.site_name_short()}" />`,
      ].join('\n    ');
      return html.replace('%app.statichead%', staticHead);
    },
  });

export const handle: Handle = sequence(handleParaglide, handleStaticHead);
