// Site-wide smoke test against the static build (`pnpm build && pnpm test:e2e`): SEO head tags,
// robots/sitemap/llms.txt/ARD manifest, axe-core accessibility and keyboard reachability on every sitemap route.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { siteOrigin, sitemapPaths } from '#lib/data/site.ts';
import { m } from '#messages';
import {
  axeViolations,
  buildFileExists,
  openPage,
  readBuildFile,
  serveBuild,
  tabThrough,
} from '../test/e2e.ts';

const mobile = 412;
const desktop = 1440;
/** Enough Tab presses to walk the navbar and well into the page on every route. */
const maxTabStops = 40;

let browser: Browser;
let server: Awaited<ReturnType<typeof serveBuild>>;

beforeAll(async () => {
  server = await serveBuild();
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
  await server.close();
});

const htmlFile = (path: string) => (path === '/' ? 'index.html' : `${path.slice(1)}.html`);
const attr = (html: string, re: RegExp) => re.exec(html)?.[1];

describe('SEO', () => {
  it('robots.txt allows crawling and points at the sitemap', () => {
    const robots = readBuildFile('robots.txt');
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).not.toMatch(/^Disallow: \/$/m);
    expect(robots).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`);
  });

  it('sitemap.xml lists every indexable route on the site origin', () => {
    const locs = [...readBuildFile('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
    expect(locs).toEqual(sitemapPaths.map((path) => new URL(path, siteOrigin).href));
  });

  it('llms.txt is markdown linking every indexable page', () => {
    const llms = readBuildFile('llms.txt');
    expect(llms).toMatch(/^# \S/);
    for (const path of sitemapPaths.filter((path) => path !== '/')) {
      expect(llms).toContain(`](${new URL(path, siteOrigin).href})`);
    }
  });

  it('/.well-known/ard.json is an ARD manifest with an entries array', () => {
    const manifest: unknown = JSON.parse(readBuildFile('.well-known/ard.json'));
    expect(manifest).toHaveProperty('entries', expect.any(Array));
  });

  it.each(sitemapPaths)('%s is prerendered with complete head tags', (path) => {
    expect(buildFileExists(htmlFile(path)), 'prerendered html').toBe(true);
    const html = readBuildFile(htmlFile(path));
    const canonical = new URL(path, siteOrigin).href;

    expect.soft(html).toMatch(/<html lang="[a-z]{2}/);
    expect.soft(attr(html, /<title>([^<]*)<\/title>/)?.trim(), 'title').toBeTruthy();
    expect
      .soft(attr(html, /<meta name="description" content="([^"]+)"/), 'description')
      .toBeTruthy();
    expect.soft(attr(html, /<link rel="canonical" href="([^"]+)"/), 'canonical').toBe(canonical);
    expect.soft(attr(html, /<meta property="og:url" content="([^"]+)"/), 'og:url').toBe(canonical);
    expect.soft(html, 'og:* must use property=, not name=').not.toMatch(/<meta name="og:/);
    expect.soft(attr(html, /<meta property="og:title" content="([^"]+)"/), 'og:title').toBeTruthy();
    expect
      .soft(attr(html, /<meta name="twitter:title" content="([^"]+)"/), 'twitter:title')
      .toBeTruthy();
    expect
      .soft(attr(html, /<meta property="og:image" content="([^"]+)"/), 'og:image')
      .toMatch(new RegExp(`^${siteOrigin}/`));
    expect
      .soft(attr(html, /<meta name="twitter:image" content="([^"]+)"/), 'twitter:image')
      .toMatch(new RegExp(`^${siteOrigin}/`));

    const ld = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect.soft(ld, 'JSON-LD').toBeTruthy();
    expect.soft(JSON.parse(ld ?? '{}')).toMatchObject({ '@context': 'https://schema.org' });
  });

  it('the SPA fallback declares no canonical URL', () => {
    expect(readBuildFile('fallback.html')).not.toMatch(/rel="canonical"/);
  });
});

describe.each([mobile, desktop])('accessibility at %ipx', (width) => {
  it.each(sitemapPaths)('%s has no axe violations and every Tab stop is named', async (path) => {
    const page = await openPage(browser, server.origin, path, width);
    expect.soft(await axeViolations(page)).toEqual([]);
    // axe accepts a placeholder as a name, but it vanishes once typed into — require a real one.
    const unnamed = (await tabThrough(page, maxTabStops)).filter((stop) => !stop.name);
    expect.soft(unnamed.map((stop) => stop.html)).toEqual([]);
    await page.context().close();
  });
});

describe.each(['light', 'dark'] as const)('prefers-contrast: more, %s theme', (theme) => {
  it.each(sitemapPaths)('%s reaches 7:1 text contrast with no axe violations', async (path) => {
    const page = await openPage(browser, server.origin, path, desktop, { theme, contrast: 'more' });
    expect.soft(await axeViolations(page, { enhancedContrast: true })).toEqual([]);
    await page.context().close();
  });
});

describe('keyboard and interaction states', () => {
  it('the skip link is the first Tab stop and moves focus to main', async () => {
    const page = await openPage(browser, server.origin, '/radio', desktop);
    await page.keyboard.press('Tab');
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('href')))
      .toBe('#main-content');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main-content');
    await page.context().close();
  });

  it('reaches every navbar sub menu item by keyboard', async () => {
    const page = await openPage(browser, server.origin, '/radio', desktop);
    const names = (await tabThrough(page, maxTabStops)).map((stop) => stop.name);
    for (const label of [
      m['navbar.players'](),
      m['navbar.housing'](),
      m['navbar.jobs'](),
      m['navbar.wiki'](),
      m['navbar.track_editor'](),
      m['navbar.pak_conflict'](),
    ]) {
      expect.soft(names).toContain(label);
    }
    await page.context().close();
  });

  it('the open mobile menu has no axe violations', async () => {
    const page = await openPage(browser, server.origin, '/radio', mobile);
    await page.getByRole('button', { name: m['a11y.open_menu']() }).click();
    await expect.poll(() => page.getByRole('dialog').count()).toBe(1);
    expect(await axeViolations(page)).toEqual([]);
    await page.context().close();
  });

  it('the settings menu with an open select has no axe violations', async () => {
    const page = await openPage(browser, server.origin, '/radio', desktop);
    await page.getByRole('button', { name: m['a11y.settings']() }).click();
    const select = page.getByRole('button', { name: m['settings.site_language']() });
    await select.click();
    await expect.poll(() => select.getAttribute('aria-expanded')).toBe('true');
    expect(await axeViolations(page)).toEqual([]);
    await page.context().close();
  });
});
