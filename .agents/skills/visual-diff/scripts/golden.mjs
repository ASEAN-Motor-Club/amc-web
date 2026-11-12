// Usage: node golden.mjs capture <outDir> [--base http://localhost:5173] [--view ortho|three] [--dpr 1,1.5]
//        node golden.mjs compare <goldenDir> <candidateDir> [--out diffDir] [--max 0.005] [--dpr 1,1.5]
// Regression gate for the map renderer. Renders the dev-only harness (src/routes/dev/map-harness, fixed-seed
// mock data, no API calls) in a fixed set of scenes, and diffs two captures made on different revisions:
//   dots-*     every dot palette (delivery, resident, job source/dest, house vacant/occupied/severe, player,
//              pin, teleport) with labels off, in the normal, hover, selected states and at a wider zoom;
//   full-*     everything on, at several zooms;
//   <layer>-*  each layer alone (dots, labels, zones, delivery lines, area names/bounds, picker pointer).
// `compare` allows 1 px of anti-alias drift and reports the share of changed pixels per scene (exit 1 over --max).
// Typical use: capture on main (a worktree), capture on the branch, compare - see SKILL.md.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { compareInPage, dataUrl } from './diff.mjs';
import { list, parseArgs } from './lib.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const [mode, ...dirs] = positional;
const base = typeof flags.base === 'string' ? flags.base : 'http://localhost:5173';
const view = flags.view === 'three' ? 'three' : 'ortho';
const dprs = list(flags.dpr, ['1', '1.5']).map(Number);
const size = { width: 1000, height: 700 };
const CONCURRENCY = 4;

/** mapState keys the scenes toggle (everything else stays at the harness defaults). */
const ALL_KEYS = [
  'delivery',
  'house',
  'player',
  'playerName',
  'pins',
  'pinLabels',
  'teleport',
  'teleportLabels',
  'shortcutZone',
  'shortcutZoneLabels',
  'areaName',
  'areaBound',
  'houseLabels',
];
const DOT_LABELS_OFF =
  'playerName,pinLabels,teleportLabels,shortcutZone,shortcutZoneLabels,areaName,houseLabels';
/** CSS px of a delivery dot in the `at=1&z=5` view (deterministic mock data). */
const HOVER_AT = [304, 452];
const ZOOMS = [1.5, 3, 5];

const only = (keys) =>
  `off=${ALL_KEYS.filter((k) => !keys.includes(k)).join(',')}&on=${keys.join(',')}`;

/** name, query, optional hover point. */
const scenes = [
  ['dots-normal', `at=1&z=5&off=${DOT_LABELS_OFF}`],
  ['dots-hover', `at=1&z=5&off=${DOT_LABELS_OFF}`, HOVER_AT],
  ['dots-selected', `at=1&z=5&sel=1&off=${DOT_LABELS_OFF}`],
  ['dots-wide', `at=1&z=3&off=${DOT_LABELS_OFF}`],
  ...[1.5, 3, 5, 6.5].map((z) => [`full-z${z}`, `at=1&z=${z}`]),
  ...ZOOMS.flatMap((z) =>
    [
      ['delivery', only(['delivery'])],
      ['house', only(['house'])],
      ['house-labels', only(['house', 'houseLabels'])],
      ['players', only(['player'])],
      ['player-names', only(['player', 'playerName'])],
      ['pins', only(['pins', 'pinLabels'])],
      ['teleports', only(['teleport', 'teleportLabels'])],
      ['shortcut-zones', only(['shortcutZone', 'shortcutZoneLabels'])],
      ['area-names', only(['areaName'])],
      ['area-bounds', only(['areaBound'])],
      ['delivery-lines', `${only(['delivery'])}&line=34`],
      ['pick-marker', `${only([])}&pick=anchor&pickmode=1`],
    ].map(([name, query]) => [`${name}-z${z}`, `at=1&z=${z}&${query}`]),
  ),
];

async function stable(page) {
  let png = await page.screenshot();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(600);
    const next = await page.screenshot();
    const same = next.equals(png);
    png = next;
    if (same) break;
  }
  return png;
}

async function capture(outDir) {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    args: flags.swiftshader
      ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
      : [],
  });
  const jobs = dprs.flatMap((dpr) => scenes.map((scene) => ({ dpr, scene })));
  let next = 0;
  async function worker() {
    for (let job = jobs[next++]; job; job = jobs[next++]) {
      const [name, query, hover] = job.scene;
      const ctx = await browser.newContext({
        viewport: size,
        deviceScaleFactor: job.dpr,
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      await page.goto(`${base}/dev/map-harness?r=${view}&chrome=0&${query}`, {
        waitUntil: 'networkidle',
        timeout: 120_000,
      });
      await page.waitForTimeout(3000);
      // Park the pointer on the map edge so a stray hover never leaks into the other scenes.
      await page.mouse.move(hover ? hover[0] : 5, hover ? hover[1] : 5);
      writeFileSync(join(outDir, `${name}-dpr${job.dpr}.png`), await stable(page));
      await ctx.close();
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();
}

async function compare(goldenDir, candidateDir, outDir) {
  mkdirSync(outDir, { recursive: true });
  const max = Number(flags.max ?? 0.005);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let failed = 0;
  for (const dpr of dprs) {
    for (const [name] of scenes) {
      const file = `${name}-dpr${dpr}.png`;
      const res = await compareInPage(page, {
        shots: [
          dataUrl(readFileSync(join(goldenDir, file))),
          dataUrl(readFileSync(join(candidateDir, file))),
        ],
        radius: 1,
        tolerance: 24,
      });
      writeFileSync(
        join(outDir, file.replace('.png', '-diff.png')),
        Buffer.from(res.diff.split(',')[1], 'base64'),
      );
      const over = res.score > max;
      if (over) failed++;
      console.log(
        `${file.padEnd(40)} ${(res.score * 100).toFixed(3)}% changed ${over ? 'FAIL' : 'ok'}`,
      );
    }
  }
  await browser.close();
  if (failed) process.exit(1);
}

if (mode === 'capture' && dirs[0]) await capture(dirs[0]);
else if (mode === 'compare' && dirs[1])
  await compare(dirs[0], dirs[1], typeof flags.out === 'string' ? flags.out : 'golden-diff');
else {
  console.error(
    'usage: golden.mjs capture <outDir> | golden.mjs compare <goldenDir> <candidateDir>',
  );
  process.exit(2);
}
