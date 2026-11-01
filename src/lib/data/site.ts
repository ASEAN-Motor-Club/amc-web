/** Canonical public origin — absolute URLs in head tags, the sitemap and prerendering need it. */
export const siteOrigin = 'https://www.aseanmotorclub.com';

/** Indexable, non-parameterized routes listed in `sitemap.xml`. */
export const sitemapPaths = [
  '/',
  '/map',
  '/players',
  '/housing',
  '/jobs',
  '/deliveries',
  '/radio',
  '/track',
  '/pak/conflict',
  '/pak/inspect',
] as const;
