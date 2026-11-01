// Helpers for the e2e smoke suite (`pnpm test:e2e`): serve the static build the way production
// does and drive it with Playwright. Nothing here is bundled into the app.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import type { Browser, Page } from 'playwright';

export const buildDir = resolve('build');

export const readBuildFile = (path: string) => readFileSync(join(buildDir, path), 'utf8');

export const buildFileExists = (path: string) => existsSync(join(buildDir, path));

const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

/** Static server over `build/` with the SPA fallback, on a free port. */
export async function serveBuild() {
  if (!existsSync(join(buildDir, 'index.html'))) {
    throw new Error('No build found — run `pnpm build` before `pnpm test:e2e`.');
  }
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    for (const candidate of [
      pathname,
      `${pathname}.html`,
      join(pathname, 'index.html'),
      '/fallback.html',
    ]) {
      const file = join(buildDir, candidate);
      if (file.startsWith(buildDir) && existsSync(file) && statSync(file).isFile()) {
        res.writeHead(200, {
          'content-type': contentTypes[extname(file)] ?? 'application/octet-stream',
        });
        createReadStream(file).pipe(res);
        return;
      }
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${String(port)}`,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}

const LOAD_SETTLE_MS = 1500;

export interface PageOptions {
  theme?: 'light' | 'dark';
  /** Emulated `prefers-contrast` */
  contrast?: 'more' | 'no-preference';
}

/**
 * A page at the given width with reduced motion and, by default, the light theme. Every request
 * off the local server is aborted: the live API, radio stream and Discord widget would make results
 * depend on the network and on whatever data is live, so pages render their loading/empty states.
 */
export async function openPage(
  browser: Browser,
  origin: string,
  path: string,
  width: number,
  { theme = 'light', contrast = 'no-preference' }: PageOptions = {},
) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: 'reduce',
    colorScheme: theme,
    contrast,
  });
  await context.addInitScript((value) => localStorage.setItem('theme', value), theme);
  await context.route(
    (url) => url.origin !== origin,
    (route) => route.abort(),
  );
  const page = await context.newPage();
  // Not 'networkidle': aborted API/SSE requests retry and the home video loops, so it never settles.
  await page.goto(origin + path, { waitUntil: 'load' });
  await page.waitForTimeout(LOAD_SETTLE_MS);
  return page;
}

const axeSource = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
);

export interface AxeViolation {
  id: string;
  help: string;
  targets: string[];
}

export interface AxeOptions {
  /** Also require 7:1 text contrast (WCAG AAA `color-contrast-enhanced`) */
  enhancedContrast?: boolean;
}

/** axe-core (WCAG 2.1 A/AA + best-practice) — the engine behind Lighthouse's accessibility score. */
export async function axeViolations(
  page: Page,
  { enhancedContrast = false }: AxeOptions = {},
): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (enhanced) => {
    const { axe } = window as unknown as {
      axe: {
        run: (
          context: Document,
          options: object,
        ) => Promise<{
          violations: { id: string; help: string; nodes: { target: string[] }[] }[];
        }>;
      };
    };
    const result = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
      rules: { 'color-contrast-enhanced': { enabled: enhanced } },
    });
    return result.violations.map((v) => ({
      id: v.id,
      help: v.help,
      targets: v.nodes.map((n) => n.target.join(' ')),
    }));
  }, enhancedContrast);
}

export interface FocusStop {
  /** Accessible name (simplified: aria-labelledby, aria-label, <label>, content, title) */
  name: string;
  placeholder: string;
  html: string;
}

/** Presses Tab up to `max` times and records each focused element. */
export async function tabThrough(page: Page, max: number): Promise<FocusStop[]> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  const stops: FocusStop[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      // innerText skips visibility:hidden content, e.g. NavbarText's invisible width-reserving copy.
      const text = (node: Element | null) =>
        (node instanceof HTMLElement ? node.innerText : (node?.textContent ?? '')).trim();
      const byIds = (ids: string | null) =>
        (ids ?? '')
          .split(/\s+/)
          .map((id) => text(document.getElementById(id)))
          .join(' ')
          .trim();
      const labels =
        'labels' in el && el.labels ? [...(el.labels as NodeListOf<HTMLLabelElement>)] : [];
      const name =
        byIds(el.getAttribute('aria-labelledby')) ||
        el.getAttribute('aria-label') ||
        labels.map(text).join(' ') ||
        (el.matches('input, select, textarea') ? '' : text(el)) ||
        el.getAttribute('title') ||
        '';
      return {
        name: name.replace(/\s+/g, ' ').trim(),
        placeholder: el.getAttribute('placeholder') ?? '',
        html: el.outerHTML.slice(0, 200),
      };
    });
    if (!stop) break;
    stops.push(stop);
  }
  return stops;
}
