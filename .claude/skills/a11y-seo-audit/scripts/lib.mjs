import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Indexable routes, read from the single source of truth the sitemap uses. */
export function sitemapPaths() {
  const src = readFileSync('src/lib/data/site.ts', 'utf8');
  const block = /sitemapPaths\s*=\s*\[([\s\S]*?)\]/.exec(src)?.[1] ?? '';
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[a.slice(2)] = true;
      else flags[a.slice(2)] = argv[++i];
    } else positional.push(a);
  }
  return { positional, flags };
}

export const list = (value, fallback) =>
  typeof value === 'string' ? value.split(',').filter(Boolean) : fallback;

const AXE_VERSION = '4.10.2';

/** axe-core source, installed once into the OS temp dir (it is not a project dependency). */
export function axeSource() {
  const dir = join(tmpdir(), `amc-axe-core-${AXE_VERSION}`);
  const file = join(dir, 'node_modules', 'axe-core', 'axe.min.js');
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    execFileSync('npm', ['install', '--silent', '--prefix', dir, `axe-core@${AXE_VERSION}`], {
      stdio: 'inherit',
    });
  }
  return readFileSync(file, 'utf8');
}

/** A browser context matching how screenshots/audits should look: fixed theme, no animation. */
export async function newContext(browser, { width, theme = 'light' }) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: 'reduce',
    colorScheme: theme,
  });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
  return ctx;
}

export async function open(ctx, url) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1000);
  return page;
}
