import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { colorBackground100, colorBackground900 } from '#lib/tw-var.js';
import { m } from '#lib/paraglide/messages.js';
import notoSansLatinWghtNormalWoff2 from '@fontsource-variable/noto-sans/files/noto-sans-latin-wght-normal.woff2?no-inline';
import notoSansThaiCssUrl from '@fontsource-variable/noto-sans-thai/index.css?url';
import notoSansSCCssUrl from '@fontsource-variable/noto-sans-sc/index.css?url';
import notoSansJPCssUrl from '@fontsource-variable/noto-sans-jp/index.css?url';
import notoSansKRCssUrl from '@fontsource-variable/noto-sans-kr/index.css?url';
import splashBig from '#lib/assets/images/splash_big.jpg?no-inline';
import faviconIco from '#lib/assets/images/icon/favicon.ico?no-inline';
import faviconSvg from '#lib/assets/images/icon/favicon.svg?no-inline';
import appleTouchIcon from '#lib/assets/images/icon/apple-touch-icon.png?no-inline';
import androidChrome512 from '#lib/assets/images/icon/android-chrome-512x512.png?no-inline';
import { siteOrigin } from '#lib/data/site.js';
import { PUBLIC_DISCORD_LINK, PUBLIC_PATREON_LINK } from '$app/env/public';

const handleParaglide: Handle = ({ event, resolve }) =>
  // No `url` strategy, so the middleware's request is a same-URL clone; `event.request` is readonly in Kit 3.
  paraglideMiddleware(event.request, ({ locale }) =>
    resolve(event, {
      transformPageChunk: ({ html }) => {
        return html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale));
      },
    }),
  );

const deferredFontCssUrls = [
  notoSansThaiCssUrl,
  notoSansSCCssUrl,
  notoSansJPCssUrl,
  notoSansKRCssUrl,
] as unknown as string[];

const splashWidth = 1440;
const splashHeight = 810;

/** Kit renders the SPA fallback page from this pseudo-path; it has no URL of its own to canonicalize. */
const fallbackPathname = '/[fallback]';

const absoluteUrl = (path: string) => new URL(path, siteOrigin).href;

// `<` is escaped so no string value can close the surrounding <script> early.
const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const structuredData = () =>
  jsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteOrigin}/#organization`,
        name: m.site_name(),
        alternateName: m.site_name_short(),
        url: absoluteUrl('/'),
        logo: absoluteUrl(androidChrome512),
        description: m['home.description'](),
        sameAs: [
          PUBLIC_DISCORD_LINK,
          PUBLIC_PATREON_LINK,
          'https://wiki.aseanmotorclub.com/',
        ].filter(Boolean),
      },
      {
        '@type': 'WebSite',
        '@id': `${siteOrigin}/#website`,
        name: m.site_name(),
        alternateName: m.site_name_short(),
        url: absoluteUrl('/'),
        description: m['home.desc_title'](),
        publisher: { '@id': `${siteOrigin}/#organization` },
      },
    ],
  });

const handleStaticHead: Handle = ({ event, resolve }) =>
  resolve(event, {
    transformPageChunk: ({ html }) => {
      const pageUrl =
        event.url.pathname === fallbackPathname ? undefined : absoluteUrl(event.url.pathname);
      const ogImage = absoluteUrl(splashBig);
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
        `<meta property="og:image" content="${ogImage}" />`,
        `<meta property="og:image:width" content="${splashWidth}" />`,
        `<meta property="og:image:height" content="${splashHeight}" />`,
        `<meta property="og:image:alt" content="${m.site_name()}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:description" content="${m['home.desc_title']()}" />`,
        `<meta name="twitter:image" content="${ogImage}" />`,
        ...(pageUrl
          ? [
              `<link rel="canonical" href="${pageUrl}" />`,
              `<meta property="og:url" content="${pageUrl}" />`,
            ]
          : []),
        `<link rel="sitemap" type="application/xml" href="/sitemap.xml" />`,
        structuredData(),
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
