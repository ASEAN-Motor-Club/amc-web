// Usage: node audit.mjs <baseUrl> [--routes /,/radio] [--widths 412,1440] [--theme light|dark] [--tabs 25] [--verbose]
// axe-core (WCAG 2 A/AA + best-practice) per route and width, plus a keyboard pass. Exits 1 on violations.
import { chromium } from 'playwright';
import { axeSource, list, newContext, open, parseArgs, sitemapPaths } from './lib.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const base = positional[0] ?? 'http://localhost:4174';
const routes = list(flags.routes, sitemapPaths());
const widths = list(flags.widths, ['412', '1440']).map(Number);
const theme = flags.theme === 'dark' ? 'dark' : 'light';
const tabs = Number(flags.tabs ?? 25);
const axe = axeSource();

const browser = await chromium.launch();
let total = 0;

for (const route of routes) {
  for (const width of widths) {
    const ctx = await newContext(browser, { width, theme });
    const page = await open(ctx, base + route);
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 200) })),
      }));
    });

    // Keyboard pass: focus order and focusable elements without an accessible name.
    await page.evaluate(() => document.activeElement?.blur());
    const order = [];
    const unnamed = [];
    const placeholderOnly = [];
    for (let i = 0; i < tabs; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const text = (node) => (node?.textContent ?? '').trim();
        const byIds = (ids) =>
          (ids ?? '')
            .split(/\s+/)
            .map((id) => text(document.getElementById(id)))
            .join(' ');
        const labels = el.labels ? [...el.labels].map(text).join(' ') : '';
        // Simplified accessible-name order: aria-labelledby, aria-label, <label>, content, title.
        const name = (
          byIds(el.getAttribute('aria-labelledby')) ||
          el.getAttribute('aria-label') ||
          labels ||
          (el.matches('input, select, textarea') ? '' : text(el)) ||
          el.getAttribute('title') ||
          ''
        ).trim();
        return {
          name: name.replace(/\s+/g, ' ').slice(0, 30),
          placeholder: el.getAttribute('placeholder') ?? '',
          html: el.outerHTML.slice(0, 160),
        };
      });
      if (!info) break;
      order.push(info.name || info.placeholder || '∅');
      if (!info.name && info.placeholder) placeholderOnly.push(info.html);
      else if (!info.name) unnamed.push(info.html);
    }

    total += violations.length + unnamed.length;
    const status = violations.length || unnamed.length ? '✗' : '✓';
    console.log(`${status} ${route} @${width}px ${theme}`);
    for (const v of violations) {
      console.log(`    ${v.id} [${v.impact}] ${v.help} (${v.nodes.length})`);
      for (const n of flags.verbose ? v.nodes : v.nodes.slice(0, 2)) {
        console.log(`      ${n.target}${flags.verbose ? `\n        ${n.html}` : ''}`);
      }
    }
    for (const html of unnamed) console.log(`    focusable without a name: ${html}`);
    // axe accepts a placeholder as a name, but it vanishes on input and is announced inconsistently.
    for (const html of placeholderOnly)
      console.log(`    warning — named only by placeholder: ${html}`);
    if (flags.verbose) console.log(`    tab order: ${order.join(' → ')}`);
    await ctx.close();
  }
}

await browser.close();
console.log(total ? `\n${total} problem(s) found` : '\nno violations');
process.exit(total ? 1 : 0);
