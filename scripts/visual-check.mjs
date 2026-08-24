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
import { IntentStore } from '../src/checkout/intents.ts';
import { HmacWebhookVerifier, SandboxGateway } from '../src/checkout/sandbox.ts';
import { handleRequest } from '../src/http/router.ts';
import { OrderStore } from '../src/order/store.ts';
import { PreorderRunStore } from '../src/preorder/run.ts';
import { build } from '../src/site/build.ts';
import { FileStorage } from '../src/persistence/file-storage.ts';

/** WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA. */
const MIN_TARGET_PX = 24;
/** WCAG 2.1 SC 1.4.3 Contrast (Minimum), Level AA, for large/bold UI text. */
const MIN_CONTRAST = 4.5;

/* Performance budgets — 21_UX_PERFORMANCE_COST_AUDIT.md.
   Deliberately far tighter than the Core Web Vitals thresholds, because this
   site ships no JavaScript, no web fonts and no images: anything approaching
   the public thresholds would mean something had been added that should not
   have been. A budget set at the threshold only fails once the damage is done.
   These are measured on localhost, which removes the network — so they bound
   what the page costs to render, not what a visitor on a slow link experiences.
   That distinction is the reason the budgets are tight rather than generous. */
const LCP_BUDGET_MS = 1_000;
const CLS_BUDGET = 0.02;
const PAYLOAD_BUDGET_BYTES = 120 * 1024;

const shotDir = process.argv[2] ?? resolve(tmpdir(), 'olibana-shots');
if (!existsSync(shotDir)) mkdirSync(shotDir, { recursive: true });

const work = mkdtempSync(resolve(tmpdir(), 'olibana-visual-'));
const catalogPath = resolve(work, 'catalog.jsonl');
const runsPath = resolve(work, 'runs.jsonl');

new Catalog(new FileStorage(catalogPath)).record({
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

const runs = new PreorderRunStore(new FileStorage(runsPath));
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

// The checkout, sandbox and confirmation pages are rendered by the router, not
// by the build, so the server mounts it. Those states are the ones §11 asks for
// and the ones a screenshot has already caught a defect in.
const SANDBOX_SECRET = 'visual-check-sandbox-secret';
const routerOptions = {
  stores: {
    catalog: new Catalog(new FileStorage(catalogPath)),
    runs: new PreorderRunStore(new FileStorage(runsPath)),
    orders: new OrderStore(new FileStorage(resolve(work, 'orders.jsonl'))),
    intents: new IntentStore(new FileStorage(resolve(work, 'intents.jsonl'))),
  },
  gateway: new SandboxGateway(true),
  verifier: new HmacWebhookVerifier(SANDBOX_SECRET),
  sandbox: { enabled: true, secret: SANDBOX_SECRET },
};

const types = { '.html': 'text/html', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  void (async () => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const routed = await handleRequest(routerOptions, new Request(`http://127.0.0.1${req.url}`, {
      method: req.method, headers: new Headers(req.headers), ...(body !== undefined ? { body } : {}),
    }));
    if (routed !== null) {
      res.writeHead(routed.status, Object.fromEntries(routed.headers));
      return res.end(Buffer.from(await routed.arrayBuffer()));
    }
    let p = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = resolve(p, 'index.html');
    if (!existsSync(p)) {
      res.writeHead(404, { 'content-type': 'text/html' });
      return res.end(readFileSync(resolve(root, '404.html')));
    }
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(p));
  })().catch((error) => {
    console.error(error);
    res.writeHead(500).end('error');
  });
});
const port = await new Promise((ok) => server.listen(0, () => ok(server.address().port)));

const { chromium } = await import('playwright-core');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

const errors = [];
const motionSeen = new Map();
const layerMotion = new Map();
const silenceSeen = [];
// Every viewport in BOTH light states. The dusk palette had been defined since
// the stylesheet was written and never once rendered, because nothing activated
// it — so its contrast was unknown rather than acceptable. 05_VISUAL_SYSTEM.md
// §4 constraint 3 asks for validation per state, and one state was unreachable.
const viewports = [
  ['desktop', 1280, 900, 'light'], ['tablet', 834, 1112, 'light'], ['mobile', 390, 844, 'light'],
  ['desktop-dark', 1280, 900, 'dark'], ['tablet-dark', 834, 1112, 'dark'], ['mobile-dark', 390, 844, 'dark'],
];
// A checkout is run first so the sandbox and confirmation pages have something
// real to show. These are states, not fixtures: the same code path a customer
// takes produced them.
const checkoutResponse = await handleRequest(routerOptions, new Request(`http://127.0.0.1:${port}/checkout`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    productId: 'PRD_fixture', sku: 'OLB-CT-001-STN-M', quantity: '2', email: 'ada@example.test',
  }).toString(),
}));
const reference = new URL(checkoutResponse.headers.get('location'), 'http://127.0.0.1')
  .searchParams.get('ref');
await handleRequest(routerOptions, new Request(`http://127.0.0.1:${port}/sandbox/pay`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    ref: reference, line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP',
  }).toString(),
}));

const routes = [
  ['product', '/products/olb-ct-001'],
  ['shop', '/shop'],
  ['home', '/'],
  // The Atlas index and a philosophy page carry the list and section motion,
  // so they are where a reveal would strand content if one did.
  ['nature', '/nature'],
  ['philosophy', '/olibana/philosophy'],
  // Deliberately short. A page that cannot scroll leaves every scroll-driven
  // timeline INACTIVE, which is the state a static check cannot reason about
  // and the one most likely to hold an element at its first keyframe.
  ['notfound', '/does-not-exist'],
  ['confirmation', `/order/confirmation?ref=${reference}`],
  ['sandbox', `/sandbox/pay?ref=${reference}`],
];

for (const [name, path] of routes) {
  for (const [size, width, height, scheme] of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme });
    const id = `${name}/${size}`;
    page.on('pageerror', (e) => errors.push(`${id}: ${e.message}`));
    // The 404 document is REQUESTED with an address that does not exist, so its
    // own 404 is the correct answer and not a defect. Anything else it pulls in
    // still has to succeed.
    page.on('response', (r) => {
      const expected404 = name === 'notfound' && new URL(r.url()).pathname === path;
      if (r.status() >= 400 && !expected404) errors.push(`${id}: ${r.status()} ${r.url()}`);
    });
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
      // SC 2.5.8 has an explicit Inline exception: "the target is in a
      // sentence, or its size is otherwise constrained by the line-height of
      // non-target text". A link inside a paragraph of prose cannot be given a
      // 24px hit area without breaking the line it sits in, and the success
      // criterion says so. Applying the floor to it reported a conformance
      // failure that is not one — which is worse than missing a real failure,
      // because the fix would have damaged the typography to satisfy a rule
      // that never applied.
      const inSentence = (el) => {
        const parent = el.parentElement;
        if (parent === null) return false;
        if (!['P', 'LI', 'TD', 'BLOCKQUOTE', 'DD', 'FIGCAPTION'].includes(parent.tagName)) return false;
        // Only when there is other text around it. A paragraph containing
        // nothing but the link is a block target, and the exception is spent.
        const own = (el.textContent || '').trim();
        const surrounding = (parent.textContent || '').trim();
        return surrounding.length > own.length;
      };

      const small = [...document.querySelectorAll('a, button, select, input[type="number"], input[type="email"]')]
        .filter((el) => !inSentence(el))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.height > 0 && x.r.height < minTarget)
        .map((x) => `${x.el.tagName.toLowerCase()}"${(x.el.innerText || '').trim().slice(0, 18)}"@${Math.round(x.r.height)}px`);

      /* 05_VISUAL_SYSTEM.md §4 constraint 3: "All three states pass WCAG AA.
         Validated per state in CI." Only the purchase button was ever measured,
         and only in whichever state the browser happened to be in — which for
         the whole life of this project was daylight, because nothing activated
         another one.

         So: every element that paints text of its own, against the background
         actually behind it. Walking up for the background matters, because a
         transparent element inherits whatever it sits on, and it was exactly a
         resolved-to-inherited colour that produced the 1:1 button once. */
      // Returns null when no element in the chain paints an opaque background.
      // That happens when a page leaves the canvas to the browser, and the
      // honest answer is then "not determinable from CSS" — NOT a guess. The
      // first version fell back to the body's own transparent value, which
      // parses as black, so every dark-on-canvas page reported a 1:1 ratio and
      // a site-wide failure that did not exist. Inventing a background to
      // finish a calculation is the same error as inventing a measurement.
      const effectiveBackground = (el) => {
        for (let node = el; node !== null; node = node.parentElement) {
          const bg = getComputedStyle(node).backgroundColor;
          const parts = bg.match(/[\d.]+/g);
          if (parts !== null && (parts[3] === undefined || Number(parts[3]) > 0)) return bg;
        }
        return null;
      };

      const ownText = (el) => [...el.childNodes]
        .filter((n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0).length > 0;

      const lowContrast = [...document.querySelectorAll('main *, header *, footer *')]
        .filter((el) => ownText(el) && el.getClientRects().length > 0)
        .map((el) => {
          const style = getComputedStyle(el);
          const size = parseFloat(style.fontSize);
          const bold = Number(style.fontWeight) >= 700;
          // SC 1.4.3: large text is 18.66px bold or 24px, and needs 3:1.
          const large = size >= 24 || (bold && size >= 18.66);
          const background = effectiveBackground(el);
          return {
            what: `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`,
            ratio: background === null ? null : Number(contrast(style.color, background).toFixed(2)),
            required: large ? 3 : 4.5,
          };
        })
        .filter((x) => x.ratio !== null && x.ratio < x.required)
        .map((x) => `${x.what} ${x.ratio}:1 (needs ${x.required}:1)`);

      const button = document.querySelector('form.order button');
      return {
        /* The silence budget — 02_BRAND_EXPERIENCE_SYSTEM.md §5.
           Seven numeric thresholds, of which one (nav items) was checked. §5
           calls them "review thresholds, not laws of physics: exceeding one
           requires a written reason". A threshold nobody measures cannot be
           exceeded deliberately, which is the opposite of what §5 asks for —
           so they are measured, and any exception is written down against a
           number rather than an impression. */
        silence: (() => {
          const visible = (el) => el.getClientRects().length > 0 && (el.textContent || '').trim() !== '';
          const sizes = new Set();
          for (const el of document.querySelectorAll('main *')) {
            if (visible(el) && ownText(el)) sizes.add(getComputedStyle(el).fontSize);
          }
          // §5: ">= 40% of viewport" empty on Layer 1. Approximated as the
          // share of the first screen not covered by a box that paints text,
          // sampled on a grid — an exact areal measure would need the
          // compositor, and this is a threshold, not a physical constant.
          const step = 16;
          let covered = 0;
          let total = 0;
          const boxes = [...document.querySelectorAll('main *, header *, footer *')]
            .filter((el) => visible(el) && ownText(el))
            .map((el) => el.getBoundingClientRect());
          for (let y = 0; y < innerHeight; y += step) {
            for (let x = 0; x < innerWidth; x += step) {
              total += 1;
              if (boxes.some((b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom)) covered += 1;
            }
          }
          const buttons = [...document.querySelectorAll('button, form.order button, a.cta')].filter(visible);

          /* 02 §2 makes Precision enforceable: "No arbitrary values. Spacing,
             duration, and type sizes come from the scale or they do not ship."
             The scale is read off the document's own custom properties, so this
             is correct at every viewport without restating the breakpoint
             overrides here — and it caught `code { font-size: 0.9em }`
             resolving to 14.4px, a size on no scale and reachable by no token.
             A relative value that lands off the scale is an arbitrary value
             wearing a ratio. */
          const root = getComputedStyle(document.documentElement);
          const probe = document.createElement('div');
          document.body.appendChild(probe);
          const scale = new Set();
          for (const token of ['--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl']) {
            probe.style.fontSize = root.getPropertyValue(token).trim();
            scale.add(getComputedStyle(probe).fontSize);
          }
          probe.remove();
          const offScale = [...sizes].filter((size) => !scale.has(size));

          return {
            offScale,
            scale: [...scale],
            typeSizes: [...sizes].sort(),
            emptyShare: total === 0 ? 1 : Number((1 - covered / total).toFixed(3)),
            callsToAction: buttons.length,
            statementWords: [...document.querySelectorAll('.statement')]
              .map((el) => (el.textContent || '').trim().split(/\s+/).length),
          };
        })(),
        lowContrast: [...new Set(lowContrast)],
        contrastUndetermined: [...document.querySelectorAll('main *, header *, footer *')]
          .filter((el) => ownText(el) && el.getClientRects().length > 0)
          .filter((el) => effectiveBackground(el) === null).length,
        // Every element carrying text, not just main's direct children.
        //
        // This is the check a static analyser cannot make. The motion system is
        // scroll-driven: if a `view()` timeline is INACTIVE — a page too short
        // to scroll, a container with no overflow — the browser decides what an
        // animation with `fill-mode: both` renders, and the answer is not
        // something the CSS says out loud. The specification's own promise is
        // "unsupported -> static final state, site fully functional", and the
        // only way to know whether that holds is to ask a browser what it
        // painted. An earlier build failed exactly here and only a screenshot
        // caught it.
        //
        // Measured at rest, with no scrolling performed, because that is the
        // state a reader arrives in.
        invisible: [...main.querySelectorAll('*')]
          .filter((el) => (el.textContent || '').trim().length > 0)
          .filter((el) => el.getClientRects().length > 0)
          .filter((el) => {
            const style = getComputedStyle(el);
            return Number(style.opacity) < 0.99 || style.visibility === 'hidden';
          })
          .map((el) => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}` +
                       `@opacity=${getComputedStyle(el).opacity}`)
          .slice(0, 8),
        // Whether this page can scroll at all. A page that cannot is the case
        // that puts a scroll-driven timeline into its inactive state, so the
        // run says which pages actually exercised it rather than assuming all
        // of them did.
        scrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        layer: document.body.dataset.layer ?? '',
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

    // Performance, measured rather than assumed (§13). LCP and CLS come from
    // the browser's own observers; the payload numbers come from the responses
    // it actually fetched. INP needs a real interaction from a real person and
    // is not measurable here — that is stated, not approximated.
    const perf = await page.evaluate(() => new Promise((done) => {
      let lcp = 0;
      let cls = 0;
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = Math.max(lcp, entry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) cls += entry.value;
        }).observe({ type: 'layout-shift', buffered: true });
      } catch { /* an observer this browser lacks is not a page defect */ }

      setTimeout(() => {
        const resources = performance.getEntriesByType('resource');
        const nav = performance.getEntriesByType('navigation')[0];
        done({
          lcp: Math.round(lcp),
          cls: Number(cls.toFixed(4)),
          ttfb: nav ? Math.round(nav.responseStart) : 0,
          bytes: resources.reduce((total, r) => total + (r.transferSize || 0), 0) +
                 (nav ? nav.transferSize || 0 : 0),
          scripts: resources.filter((r) => r.initiatorType === 'script').length,
        });
      }, 400);
    }));

    if (perf.lcp > LCP_BUDGET_MS) errors.push(`${id}: LCP ${perf.lcp}ms, over the ${LCP_BUDGET_MS}ms budget`);
    if (perf.cls > CLS_BUDGET) errors.push(`${id}: CLS ${perf.cls}, over the ${CLS_BUDGET} budget`);
    if (perf.bytes > PAYLOAD_BUDGET_BYTES) {
      errors.push(`${id}: ${(perf.bytes / 1024).toFixed(1)}KB transferred, over the ${PAYLOAD_BUDGET_BYTES / 1024}KB budget`);
    }
    if (perf.scripts > 0) errors.push(`${id}: ${perf.scripts} scripts loaded on a site that ships none`);

    const btn = m.button === null ? 'none' : `${m.button.height}px contrast=${m.button.contrast}`;
    console.log(
      `${id.padEnd(17)} text=${String(m.textLen).padStart(5)} overflow=${m.overflow} ` +
      `LCP=${String(perf.lcp).padStart(4)}ms CLS=${perf.cls} ${(perf.bytes / 1024).toFixed(1).padStart(5)}KB ` +
      `js=${perf.scripts} scroll=${m.scrollable ? 'yes' : 'NO'} ` +
      `button=${btn} small=${m.small.join(', ') || 'none'}`,
    );

    if (m.overflow) errors.push(`${id}: the page scrolls horizontally`);
    if (m.hidden > 0) errors.push(`${id}: ${m.hidden} top-level children at opacity 0`);
    if (m.invisible.length > 0) {
      // Motion has become load-bearing: a reader who does not scroll cannot
      // read this. 04_MOTION_LANGUAGE.md §7 Q6 rejects it outright.
      errors.push(`${id}: ${m.invisible.length} element(s) with text are not fully painted at rest — ${m.invisible.join(', ')}`);
    }
    if (m.textLen < 60) errors.push(`${id}: only ${m.textLen} visible characters`);
    if (m.small.length > 0) errors.push(`${id}: below the ${MIN_TARGET_PX}px AA target minimum — ${m.small.join(', ')}`);
    if (m.lowContrast.length > 0) {
      errors.push(`${id}: WCAG 1.4.3 contrast failures — ${m.lowContrast.join(', ')}`);
    }
    // §5 thresholds, reported for every route and failed only where §5 states a
    // hard limit. The rest are printed so an exception is a written decision
    // against a measured number rather than something nobody looked at.
    const layerOfRoute = m.layer;
    if (m.silence.callsToAction > 2) {
      errors.push(`${id}: ${m.silence.callsToAction} calls to action, over §5's 1 primary + 1 secondary`);
    }
    for (const words of m.silence.statementWords) {
      if (words > 25) errors.push(`${id}: a statement block runs to ${words} words, over §5's 25`);
    }
    if (layerOfRoute === '1' && m.silence.emptyShare < 0.4) {
      errors.push(`${id}: ${(m.silence.emptyShare * 100).toFixed(0)}% empty on a Layer 1 screen, under §5's 40%`);
    }
    if (m.silence.offScale.length > 0) {
      // A hard failure, unlike the count below: §2 states this as a lint rule,
      // not a review threshold.
      errors.push(
        `${id}: type size(s) ${m.silence.offScale.join(', ')} are not on the scale ` +
        `(${m.silence.scale.join(', ')}) — 02 §2 Precision`,
      );
    }
    silenceSeen.push(`${id} types=${m.silence.typeSizes.length}[${m.silence.typeSizes.join(',')}] empty=${(m.silence.emptyShare * 100).toFixed(0)}% cta=${m.silence.callsToAction}`);

    if (m.contrastUndetermined > 0) {
      // Not a pass. A page whose text sits on the browser's canvas rather than
      // a colour it declares has a contrast ratio nobody here can compute, and
      // "could not check" is not "fine".
      errors.push(`${id}: ${m.contrastUndetermined} element(s) paint text on an undeclared background, so their contrast is UNVERIFIABLE`);
    }
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

    // Does the motion actually RUN, and does it actually stop?
    //
    // Every check above answers "does the page still work". None of them
    // answers "is the specified motion present" — a stylesheet whose rules all
    // silently fail to match would pass each one of them, and the site would
    // be exactly the static page the motion language was written to replace.
    // Measured once per route, at the widest viewport.
    if (size === 'desktop' || size === 'desktop-dark') {
      for (const [preference, expectation] of [['no-preference', 'some'], ['reduce', 'none']]) {
        const probe = await browser.newPage({ viewport: { width, height }, colorScheme: scheme, reducedMotion: preference });
        await probe.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'load' });
        const running = await probe.evaluate(() => document.getAnimations().map((a) => ({
          name: a.animationName ?? 'unnamed',
          timeline: a.timeline?.constructor?.name ?? 'none',
        })));
        const layer = await probe.evaluate(() => document.body.dataset.layer ?? '');
        await probe.close();

        if (expectation === 'none' && running.length > 0) {
          // 04_MOTION_LANGUAGE.md §6. A reader who asked for stillness got motion.
          errors.push(`${id}: ${running.length} animation(s) still run under prefers-reduced-motion: reduce`);
        }
        if (expectation === 'some') {
          motionSeen.set(name, running);
          layerMotion.set(name, { layer: Number(layer), count: running.length });
          // A time-based timeline on a reveal is the old defect returning: it
          // means the rule lost its `animation-timeline` and now runs on a
          // clock, which no static check on the source would notice.
          for (const animation of running) {
            if (animation.name !== 'wind-drift' && animation.timeline !== 'ViewTimeline') {
              errors.push(`${id}: ${animation.name} runs on ${animation.timeline}, not a scroll timeline`);
            }
          }
        }
      }
    }
  }
}

await browser.close();
server.close();
rmSync(work, { recursive: true, force: true });

// The motion language is only implemented if it is observably running. A route
// where nothing animates is reported, not assumed to be intentional.
const homeMotion = motionSeen.get('home') ?? [];
if (homeMotion.length === 0) errors.push('home: no motion runs at all — the motion language is not in effect');
console.log(`\nmotion observed on home: ${homeMotion.map((a) => a.name).join(', ') || 'none'}`);

/* 02_BRAND_EXPERIENCE_SYSTEM.md §8: "Motion budget provably decreases from
   Layer 1 to Layer 3." PROVABLY is the word that matters — a comment in a
   stylesheet saying the budget descends is not a proof of anything, and until
   this ran, every page from the home portal to the purchase form carried
   identical motion while the specification said otherwise.

   So the budget is read back off the running animations, grouped by the layer
   the page declares, and required to be non-increasing. Counted per route and
   reported as a maximum per layer, because two routes in a layer can honestly
   differ (a page with no list has no list reveal) — what may not happen is a
   deeper layer moving more than a shallower one. */
const byLayer = new Map();
for (const [route, { layer, count }] of layerMotion) {
  const seen = byLayer.get(layer) ?? { max: 0, routes: [] };
  seen.routes.push(`${route}=${count}`);
  byLayer.set(layer, { max: Math.max(seen.max, count), routes: seen.routes });
}
const layers = [...byLayer.keys()].sort((a, b) => a - b);
console.log(`motion budget by layer: ${layers.map((l) => `L${l} max=${byLayer.get(l).max} (${byLayer.get(l).routes.join(' ')})`).join('  ')}`);
for (let i = 1; i < layers.length; i += 1) {
  const shallower = byLayer.get(layers[i - 1]).max;
  const deeper = byLayer.get(layers[i]).max;
  if (deeper > shallower) {
    errors.push(
      `motion budget does not descend: layer ${layers[i]} runs ${deeper} animation(s) against ` +
      `layer ${layers[i - 1]}'s ${shallower} — 02 §3 requires the interface to quieten toward purchase`,
    );
  }
}
if (layers.length < 2) errors.push('only one layer was measured, so a descending budget is UNVERIFIED');

console.log(`\nsilence budget (02 §5): ${silenceSeen.join(' | ')}`);

console.log(errors.length > 0
  ? `\nERRORS:\n${errors.join('\n')}`
  : `\nno overflow, no hidden content, no undersized targets, purchase button legible.\nscreenshots: ${shotDir}`);
process.exit(errors.length > 0 ? 1 : 0);
