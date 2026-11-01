import { siteOrigin, sitemapPaths } from '#lib/data/site.ts';

export const prerender = true;

export const GET = () => {
  const urls = sitemapPaths
    .map((path) => `  <url><loc>${new URL(path, siteOrigin).href}</loc></url>`)
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
