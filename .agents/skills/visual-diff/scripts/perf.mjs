// Usage: node perf.mjs [--base http://localhost:5173] [--out perf.json] [--renderers ortho,three] [--swiftshader]
// Measures the map harness (src/routes/dev/map-harness, busy mock data) per renderer:
//   idle    - frames that issued GL draw calls over 3 s with no input and nothing loading
//   pan     - rAF frame interval stats (mean / p95 / max) over a scripted left-drag
//   zoom    - the same over a burst of wheel events
//   heap    - usedJSHeapSize after the run (Chromium, precise memory info)
// "GPU frames" are counted as rAF intervals containing >= 1 draw/clear call on any WebGL context, which
// is what a DevTools trace's GPU lane shows for these renderers. Needs the dev server (the harness is dev-only).
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { parseArgs } from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const base = typeof flags.base === 'string' ? flags.base : 'http://localhost:5173';
const outFile = typeof flags.out === 'string' ? flags.out : 'perf.json';
const renderers =
  typeof flags.renderers === 'string' ? flags.renderers.split(',') : ['ol', 'three'];

const hook = () => {
  const w = window;
  w.__draws = 0;
  const wrap = (proto, names) => {
    for (const name of names) {
      const orig = proto[name];
      if (!orig) continue;
      proto[name] = function (...args) {
        w.__draws++;
        return orig.apply(this, args);
      };
    }
  };
  const names = [
    'drawArrays',
    'drawElements',
    'drawArraysInstanced',
    'drawElementsInstanced',
    'drawRangeElements',
    'clear',
  ];
  wrap(WebGL2RenderingContext.prototype, names);
  wrap(WebGLRenderingContext.prototype, names);
  w.__frames = [];
  w.__sampling = false;
  let last = 0;
  let lastDraws = 0;
  const tick = (now) => {
    if (w.__sampling) {
      w.__frames.push({ dt: last ? now - last : 0, drew: w.__draws !== lastDraws });
    }
    last = now;
    lastDraws = w.__draws;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const stats = (frames) => {
  const dts = frames
    .map((f) => f.dt)
    .filter((d) => d > 0)
    .sort((a, b) => a - b);
  if (!dts.length) return { frames: 0 };
  const pct = (p) => dts[Math.min(dts.length - 1, Math.floor(dts.length * p))];
  return {
    frames: frames.length,
    drawFrames: frames.filter((f) => f.drew).length,
    meanMs: +(dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(2),
    p95Ms: +pct(0.95).toFixed(2),
    maxMs: +dts[dts.length - 1].toFixed(2),
  };
};

const browser = await chromium.launch({
  args: [
    '--enable-precise-memory-info',
    ...(flags.swiftshader
      ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
      : []),
  ],
});
const result = {};
for (const r of renderers) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(hook);
  const page = await ctx.newPage();
  await page.goto(`${base}/dev/map-harness?r=${r}&at=40&z=2&chrome=0`, {
    waitUntil: 'networkidle',
    timeout: 120_000,
  });
  await page.waitForTimeout(4000);

  const sample = async (ms, action) => {
    await page.evaluate(() => {
      window.__frames = [];
      window.__sampling = true;
    });
    if (action) await action();
    await page.waitForTimeout(ms);
    return page.evaluate(() => {
      window.__sampling = false;
      return window.__frames;
    });
  };

  const idle = await sample(3000);
  await page.mouse.move(640, 400);
  const pan = await sample(0, async () => {
    await page.mouse.down();
    for (let i = 0; i < 90; i++) {
      await page.mouse.move(640 + i * 4, 400 + i * 2);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.waitForTimeout(600);
  });
  const zoom = await sample(0, async () => {
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, i < 20 ? -120 : 120);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(800);
  });
  const settled = await sample(3000);
  const heapMb = await page.evaluate(() => performance.memory.usedJSHeapSize / 1024 / 1024);
  result[r] = {
    idle: stats(idle),
    pan: stats(pan),
    zoom: stats(zoom),
    idleAfterInput: stats(settled),
    heapMb: +heapMb.toFixed(1),
  };
  await ctx.close();
}
await browser.close();
writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
