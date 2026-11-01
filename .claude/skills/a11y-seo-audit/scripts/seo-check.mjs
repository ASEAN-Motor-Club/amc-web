// Usage: node seo-check.mjs [buildDir]
// Static SEO checks on the prerendered output. Exits 1 on any failure.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'build';
const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
const read = (p) => readFileSync(join(dir, p), 'utf8');

if (!existsSync(join(dir, 'robots.txt'))) fail('robots.txt', 'missing');
const robots = existsSync(join(dir, 'robots.txt')) ? read('robots.txt') : '';
const sitemapUrl = /^Sitemap:\s*(\S+)/m.exec(robots)?.[1];
if (!sitemapUrl) fail('robots.txt', 'no Sitemap: line');

if (!existsSync(join(dir, 'sitemap.xml'))) fail('sitemap.xml', 'missing');
const locs = existsSync(join(dir, 'sitemap.xml'))
  ? [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]))
  : [];
if (locs.length === 0) fail('sitemap.xml', 'no <loc> entries');
if (sitemapUrl && locs[0] && new URL(sitemapUrl).origin !== locs[0].origin) {
  fail(
    'robots.txt',
    `sitemap origin ${new URL(sitemapUrl).origin} != page origin ${locs[0].origin}`,
  );
}

const attr = (html, re) => re.exec(html)?.[1];
const isAbsolute = (u) => !!u && /^https?:\/\//.test(u);

for (const loc of locs) {
  const file = loc.pathname === '/' ? 'index.html' : `${loc.pathname.slice(1)}.html`;
  if (!existsSync(join(dir, file))) {
    fail(loc.pathname, `not prerendered (${file} missing)`);
    continue;
  }
  const html = read(file);
  const where = loc.pathname;
  const title = attr(html, /<title>([^<]*)<\/title>/);
  if (!title?.trim()) fail(where, 'empty <title>');
  if (!attr(html, /<meta name="description" content="([^"]+)"/)) fail(where, 'no meta description');

  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
  if (!isAbsolute(canonical)) fail(where, `canonical not absolute: ${canonical}`);
  else if (new URL(canonical).pathname !== loc.pathname)
    fail(where, `canonical points to ${canonical}`);
  if (attr(html, /<meta property="og:url" content="([^"]+)"/) !== canonical)
    fail(where, 'og:url != canonical');

  if (/<meta name="og:/.test(html)) fail(where, 'og:* meta uses name= instead of property=');
  const ogTitle = attr(html, /<meta property="og:title" content="([^"]+)"/);
  if (!ogTitle) fail(where, 'no og:title');
  if (!attr(html, /<meta name="twitter:title" content="([^"]+)"/)) fail(where, 'no twitter:title');
  if (!isAbsolute(attr(html, /<meta property="og:image" content="([^"]+)"/)))
    fail(where, 'og:image not absolute');
  if (!isAbsolute(attr(html, /<meta name="twitter:image" content="([^"]+)"/)))
    fail(where, 'twitter:image not absolute');

  const ld = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ld) fail(where, 'no JSON-LD');
  else {
    try {
      const data = JSON.parse(ld);
      if (data['@context'] !== 'https://schema.org')
        fail(where, 'JSON-LD @context is not schema.org');
    } catch (e) {
      fail(where, `JSON-LD does not parse: ${e.message}`);
    }
  }
  if (!/<html lang="[a-z]/.test(html)) fail(where, '<html> has no lang');
}

const fallback = existsSync(join(dir, 'fallback.html')) ? read('fallback.html') : '';
if (/rel="canonical"/.test(fallback))
  fail('fallback.html', 'SPA fallback must not declare a canonical URL');

console.log(`checked ${locs.length} sitemap pages`);
if (failures.length) {
  console.log(`\n${failures.length} SEO problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('SEO checks passed');
