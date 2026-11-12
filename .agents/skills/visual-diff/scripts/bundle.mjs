// Usage: node bundle.mjs <buildDir> [--routes /map,/] [--port 4180] [--out bundle.json]
// Serves a production build and reports, per route, what a cold visit downloads before the page is idle:
// JS/CSS bytes (raw and gzip), request count, and first-contentful-paint. Run it on the build of the
// revision you want to compare (main vs branch) and diff the JSON.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { list, parseArgs } from './lib.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const dir = positional[0] ?? 'build';
const port = Number(flags.port ?? 4180);
const routes = list(flags.routes, ['/map', '/']);
const outFile = typeof flags.out === 'string' ? flags.out : 'bundle.json';
const here = new URL('.', import.meta.url).pathname;

const server = spawn('node', [`${here}serve.mjs`, dir, String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const browser = await chromium.launch();
const result = {};
for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const bytes = { js: 0, jsGzip: 0, css: 0, cssGzip: 0, requests: 0 };
  const pending = [];
  page.on('response', (res) => {
    const type = res.request().resourceType();
    bytes.requests++;
    if (type !== 'script' && type !== 'stylesheet') return;
    pending.push(
      res
        .body()
        .then((body) => {
          const key = type === 'script' ? 'js' : 'css';
          bytes[key] += body.length;
          bytes[`${key}Gzip`] += gzipSync(body).length;
        })
        .catch(() => {}),
    );
  });
  await page.goto(`http://localhost:${port}${route}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await Promise.all(pending);
  const fcp = await page.evaluate(
    () => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
  );
  result[route] = { ...bytes, fcpMs: fcp === null ? null : Math.round(fcp) };
  await ctx.close();
}
await browser.close();
server.kill();
writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
