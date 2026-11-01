// Usage: node screens.mjs <baseUrl> <outDir> [--routes /,/radio] [--widths 412,1440] [--theme light|dark] [--only name1,name2]
// Screenshots every route at each width plus interaction states, for compare.mjs.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { list, newContext, open, parseArgs, sitemapPaths } from './lib.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const [base = 'http://localhost:4174', out = 'shots'] = positional;
const routes = list(flags.routes, sitemapPaths());
const widths = list(flags.widths, ['412', '1440']).map(Number);
const theme = flags.theme === 'dark' ? 'dark' : 'light';
const only = list(flags.only, null);

// The navbar label is rendered twice (an invisible bold copy reserves width); target the visible one.
const navLabel = (text) => `nav span.absolute:text-is("${text}")`;
// Works for the Select trigger whether or not the input sits inside the button.
const selectTrigger = (name) =>
  `div.group:has(input[name="${name}"]) > button, button:has(input[name="${name}"])`;

/** [name, width, route, action] — interaction states worth a screenshot. */
const interactions = [
  ['nav-map-hover', 1440, '/radio', (p) => p.hover(navLabel('Map'))],
  ['nav-tools-hover', 1440, '/radio', (p) => p.hover(navLabel('Tools'))],
  ['nav-mobile-open', 412, '/radio', (p) => p.click('nav button >> nth=0')],
  ['settings-open', 1440, '/radio', (p) => p.click('nav button.ml-auto')],
  [
    'settings-select-open',
    1440,
    '/radio',
    async (p) => {
      await p.click('nav button.ml-auto');
      await p.waitForTimeout(400);
      await p.locator(selectTrigger('siteLocale')).first().click({ force: true });
    },
  ],
  [
    'housing-sort-open',
    1440,
    '/housing',
    (p) => p.locator(selectTrigger('sort')).first().click({ force: true }),
  ],
  ['skip-link-focus', 1440, '/radio', (p) => p.keyboard.press('Tab')],
];

const shots = [
  ...routes.flatMap((route) =>
    widths.map((width) => [
      `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-${width}`,
      width,
      route,
      null,
    ]),
  ),
  ...interactions,
].filter(([name]) => !only || only.includes(name));

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [name, width, route, action] of shots) {
  const ctx = await newContext(browser, { width, theme });
  const page = await open(ctx, base + route);
  if (action) {
    try {
      await action(page);
      await page.waitForTimeout(800);
    } catch (e) {
      console.log(`! ${name}: action failed — ${e.message.split('\n')[0]}`);
    }
  }
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(`${name}.png`);
  await ctx.close();
}
await browser.close();
