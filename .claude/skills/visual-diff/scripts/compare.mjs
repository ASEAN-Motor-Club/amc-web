// Usage: node compare.mjs <dirA> <dirB> <outDir> [--threshold 16]
// Pixel-diffs same-named PNGs (A = baseline, B = candidate) in a headless browser canvas — no image
// dependencies. Prints changed pixels + bounding box and writes side-by-side A|B images for changes.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { parseArgs } from './lib.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const [dirA, dirB, out] = positional;
if (!dirA || !dirB || !out) {
  console.error('usage: node compare.mjs <dirA> <dirB> <outDir>');
  process.exit(2);
}
const threshold = Number(flags.threshold ?? 16);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
const dataUrl = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;

let changed = 0;
for (const name of readdirSync(dirA)
  .filter((f) => f.endsWith('.png'))
  .sort()) {
  const fileB = join(dirB, name);
  if (!existsSync(fileB)) {
    console.log(`${name.padEnd(32)} missing in B`);
    changed++;
    continue;
  }
  const result = await page.evaluate(
    async ({ a, b, threshold }) => {
      const load = (src) =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.max(ia.width, ib.width);
      const h = Math.max(ia.height, ib.height);
      const pixels = (img) => {
        const c = new OffscreenCanvas(w, h);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };
      const pa = pixels(ia);
      const pb = pixels(ib);
      let count = 0;
      let [x0, y0, x1, y1] = [w, h, -1, -1];
      for (let i = 0; i < pa.length; i += 4) {
        const d = Math.max(
          Math.abs(pa[i] - pb[i]),
          Math.abs(pa[i + 1] - pb[i + 1]),
          Math.abs(pa[i + 2] - pb[i + 2]),
        );
        if (d > threshold) {
          count++;
          const p = i / 4;
          const x = p % w;
          const y = (p - x) / w;
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
      if (!count) return { count, sizeChanged: ia.width !== ib.width || ia.height !== ib.height };
      const gap = 10;
      const side = document.createElement('canvas');
      side.width = w * 2 + gap;
      side.height = h;
      const sctx = side.getContext('2d');
      sctx.fillStyle = 'red';
      sctx.fillRect(0, 0, side.width, h);
      sctx.drawImage(ia, 0, 0);
      sctx.drawImage(ib, w + gap, 0);
      sctx.strokeStyle = 'magenta';
      sctx.lineWidth = 3;
      for (const dx of [0, w + gap]) sctx.strokeRect(dx + x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
      return { count, bbox: [x0, y0, x1, y1], png: side.toDataURL('image/png') };
    },
    { a: dataUrl(join(dirA, name)), b: dataUrl(fileB), threshold },
  );

  if (result.count || result.sizeChanged) changed++;
  console.log(
    `${name.padEnd(32)} ${result.count ? `changed_px=${result.count} bbox=${result.bbox.join(',')}` : result.sizeChanged ? 'size changed' : 'identical'}`,
  );
  if (result.png) writeFileSync(join(out, name), Buffer.from(result.png.split(',')[1], 'base64'));
}
await browser.close();
console.log(
  changed
    ? `\n${changed} screenshot(s) differ — side-by-sides (A left, B right) in ${out}`
    : '\nall identical',
);
