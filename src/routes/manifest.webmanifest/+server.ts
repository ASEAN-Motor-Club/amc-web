import { m } from '#messages';
import { getLocale } from '#lib/paraglide/runtime.js';
import { colorBackground900 } from '#lib/tw-var.ts';
import faviconSvg from '#lib/assets/images/icon/favicon.svg?no-inline';
import androidChrome512 from '#lib/assets/images/icon/android-chrome-512x512.png?no-inline';
import androidChrome192 from '#lib/assets/images/icon/android-chrome-192x192.png?no-inline';
import icoRadio from '#lib/assets/images/icon/ico_radio.png?no-inline';
import icoMap from '#lib/assets/images/icon/ico_map.png?no-inline';
import icoJobs from '#lib/assets/images/icon/ico_jobs.png?no-inline';

export const prerender = true;

const shortcut = (name: string, description: string, url: string, icon: string) => ({
  name,
  short_name: name,
  description,
  url,
  icons: [{ src: icon, sizes: 'any', purpose: 'monochrome' }],
});

export const GET = () =>
  new Response(
    JSON.stringify({
      name: m.site_name(),
      short_name: m.site_name_short(),
      description: m['home.desc_title'](),
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: colorBackground900,
      background_color: colorBackground900,
      scope: '/',
      lang: getLocale(),
      categories: ['games', 'entertainment', 'social'],
      icons: [
        { src: faviconSvg, sizes: 'any' },
        { src: androidChrome512, sizes: '512x512', type: 'image/png' },
        { src: androidChrome192, sizes: '192x192', type: 'image/png' },
      ],
      shortcuts: [
        shortcut(m['radio.title'](), m['manifest.radio_desc'](), '/radio', icoRadio),
        shortcut(m['navbar.map'](), m['manifest.map_desc'](), '/map', icoMap),
        shortcut(m['jobs.title'](), m['manifest.jobs_desc'](), '/jobs', icoJobs),
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
