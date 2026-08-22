/**
 * Renders the site in a real browser at three widths and measures what a
 * reader actually gets.
 *
 * This exists because two defects reached the page that the whole unit suite
 * could not see:
 *
 *   - the purchase button's label was painted in its own background colour
 *     (an undefined custom property fell back to the inherited value), a 1:1
 *     contrast ratio on the one control that completes a purchase
 *   - navigation and footer links rendered 18px and 15px tall, under the
 *     WCAG 2.2 SC 2.5.8 (AA) minimum target size of 24x24 CSS px
 *
 * Both are geometry and colour AFTER layout. No amount of reading the source
 * finds them. A screenshot does.
 *
 * A fixture product and an open run are built into a temporary directory, so
 * the commerce pages exist to be measured without publishing a garment that
 * does not exist.
 *
 * Run with:
 *   npm i --no-save playwright-core
 *   node --experimental-strip-types scripts/visual-check.mjs [outDir]
 */
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, statSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, extname } from 'node:path';

import { Catalog, variant } from '../src/catalog/catalog.ts';
import { PreorderRunStore } from '../src/preorder/run.ts';
import { build } from '../src/site/build.ts';

/** WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA. */
const MIN_TARGET_PX = 24;
/** WCAG 2.1 SC 1.4.3 Contrast (Minimum), Level AA, for large/bold UI text. */
const MIN_CONTRAST = 4.5;

const shotDir = process.argv[2] ?? resolve(tmpdir(), 'olibana-shots');
if (!existsSync(shotDir)) mkdirSync(shotDir, { recursive: true });

const work = mkdtempSync(resolve(tmpdir(), 'olibana-visual-'));
const catalogPath = resolve(work, 'catalog.jsonl');
const runsPath = resolve(work, 'runs.jsonl');

new Catalog(catalogPath).record({
  productId: 'PRD_fixture', code: 'OLB-CT-001', name: 'Fixture Coat', category: 'CT',
  status: 'PUBLISHED',
  summary: 'A rendering fixture. No such garment exists, and nothing here is published.',
  variants: [
    variant('OLB-CT-001', 'STN', 'S', { amount: 68000, currency: 'JPY' }),
    variant('OLB-CT-001', 'STN', 'M', { amount: 72000, currency: 'JPY' }),
    variant('OLB-CT-001', 'STN', 'L', { amount: 72000, currency: 'JPY' }),
  ],
  measurements: [
    { label: 'Back length', bySize: { S: 92, M: 95 } },
    { label: 'Chest', bySize: { S: 58, M: 60, L: 62 } },
  ],
  naturalRule: null, materials: ['Wool', 'Cupro lining'], productionLeadDays: 60, actor: 'fixture',
});

const runs = new PreorderRunStore(runsPath);
const run = {
  runId: 'RUN_fixture', productId: 'PRD_fixture',
  opensAt: '2026-09-01T00:00:00.000Z', closesAt: '2026-09-30T00:00:00.000Z',
  minimumQuantity: 20, targetQuantity: 40, productionLeadDays: 60,
  promisedShipBy: '2026-12-01T00:00:00.000Z', supplierQuoteId: 'QUOTE_fixture', actor: 'fixture',
};
runs.record({ ...run, status: 'DRAFT' });
runs.record({ ...run, status: 'OPEN' });

const root = resolve(work, 'site');
build({ outDir: root, catalogPath, runsPath });

const types = { '.html': 'text/html', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  let p = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = resolve(p, 'index.html');
  if (!existsSync(p)) {
    res.writeHead(404, { 'content-type': 'text/html' });
    return res.end(readFileSync(resolve(root, '404.html')));
  }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
const port = await new Promise((ok) => server.listen(0, () => ok(server.address().port)));

const { chromium } = await import('playwright-core');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

const errors = [];
const viewports = [['desktop', 1280, 900], ['tablet', 834, 1112], ['mobile', 390, 844]];
const routes = [['product', '/products/olb-ct-001'], ['shop', '/shop'], ['home', '/']];

for (const [name, path] of routes) {
  for (const [size, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    const id = `${name}/${size}`;
    page.on('pageerror', (e) => errors.push(`${id}: ${e.message}`));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${id}: ${r.status()} ${r.url()}`); });
    await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'load' });

    const m = await page.evaluate((minTarget) => {
      const luminance = (rgb) => {
        const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => {
          const c = Number(v) / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrast = (a, b) => {
        const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
      };
      const main = document.querySelector('main');
      const small = [...document.querySelectorAll('a, button, select, input[type="number"], input[type="email"]')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.height > 0 && x.r.height < minTarget)
        .map((x) => `${x.el.tagName.toLowerCase()}"${(x.el.innerText || '').trim().slice(0, 18)}"@${Math.round(x.r.height)}px`);

      const button = document.querySelector('form.order button');
      return {
        textLen: (main.innerText || '').trim().length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        hidden: [...main.children].filter((el) => getComputedStyle(el).opacity === '0').length,
        small: [...new Set(small)],
        button: button === null ? null : {
          text: (button.innerText || '').trim(),
          height: Math.round(button.getBoundingClientRect().height),
          contrast: Number(contrast(getComputedStyle(button).color, getComputedStyle(button).backgroundColor).toFixed(2)),
        },
      };
    }, MIN_TARGET_PX);

    const btn = m.button === null ? 'none' : `${m.button.height}px contrast=${m.button.contrast}`;
    console.log(`${id.padEnd(17)} text=${String(m.textLen).padStart(5)} overflow=${m.overflow} hidden=${m.hidden} button=${btn} small=${m.small.join(', ') || 'none'}`);

    if (m.overflow) errors.push(`${id}: the page scrolls horizontally`);
    if (m.hidden > 0) errors.push(`${id}: ${m.hidden} top-level children at opacity 0`);
    if (m.textLen < 60) errors.push(`${id}: only ${m.textLen} visible characters`);
    if (m.small.length > 0) errors.push(`${id}: below the ${MIN_TARGET_PX}px AA target minimum — ${m.small.join(', ')}`);
    if (name === 'product') {
      if (m.button === null) errors.push(`${id}: the product page offers no way to buy`);
      else {
        if (m.button.text === '') errors.push(`${id}: the purchase button has no label`);
        if (m.button.contrast < MIN_CONTRAST) {
          errors.push(`${id}: purchase button contrast ${m.button.contrast}:1, below ${MIN_CONTRAST}:1`);
        }
      }
    }

    await page.screenshot({ path: resolve(shotDir, `${name}-${size}.png`), fullPage: true });
    await page.close();
  }
}

await browser.close();
server.close();
rmSync(work, { recursive: true, force: true });

console.log(errors.length > 0
  ? `\nERRORS:\n${errors.join('\n')}`
  : `\nno overflow, no hidden content, no undersized targets, purchase button legible.\nscreenshots: ${shotDir}`);
process.exit(errors.length > 0 ? 1 : 0);
