import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { build } from '../../src/site/build.ts';
import { buildRoutes, CATALOG_PATH, RUNS_PATH } from '../../src/site/routes.ts';
import { formatPrice, renderProductBody } from '../../src/site/product-page.ts';
import { PreorderRunStore, type RunRevision } from '../../src/preorder/run.ts';
import { Catalog, variant, type ProductInput } from '../../src/catalog/catalog.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-pp-'));
test.after(() => rmSync(dir, { recursive: true, force: true }));

const fixture = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  productId: 'PRD_fix', code: 'OLB-CT-001', name: 'Test Coat', category: 'CT',
  status: 'PUBLISHED', summary: 'A fixture, not a product.',
  variants: [
    variant('OLB-CT-001', 'STN', 'S', { amount: 68000, currency: 'JPY' }),
    variant('OLB-CT-001', 'STN', 'M', { amount: 72000, currency: 'JPY' }),
  ],
  measurements: [{ label: 'Back length', bySize: { S: 92, M: 95 } }],
  naturalRule: null, materials: ['Wool'], productionLeadDays: 60, actor: 'test',
  ...overrides,
});

/** Builds a site against a temporary catalogue containing the given products. */
function siteWith(products: readonly ProductInput[]): { out: string; files: readonly string[] } {
  const stamp = `${products.length}-${Math.random().toString(36).slice(2)}`;
  const catalogPath = resolve(dir, `cat-${stamp}.jsonl`);
  const catalog = new Catalog(catalogPath);
  for (const p of products) catalog.record(p);
  const out = resolve(dir, `out-${stamp}`);
  const result = build({ outDir: out, catalogPath });
  return { out, files: result.files };
}

test('THE CURRENT REPOSITORY publishes no product', () => {
  // Guards the honesty property directly: the real catalogue is empty, so the
  // real build must contain no shop and no product page. If a product is ever
  // recorded, this test changes deliberately — it cannot drift by accident.
  const paths = buildRoutes(CATALOG_PATH).map((r) => r.path);
  assert.ok(!paths.includes('/shop'), '/shop was emitted with an empty catalogue');
  assert.deepEqual(paths.filter((p) => p.startsWith('/products/')), []);
});

test('a published product produces a shop and a product page', () => {
  const { out, files } = siteWith([fixture()]);
  assert.ok(files.includes('shop/index.html'));
  assert.ok(files.includes('products/olb-ct-001/index.html'));
  const page = readFileSync(resolve(out, 'products/olb-ct-001/index.html'), 'utf8');
  assert.match(page, /<h1[^>]*>Test Coat<\/h1>/);
  assert.match(readFileSync(resolve(out, 'shop/index.html'), 'utf8'), /Test Coat/);
});

test('a non-published product reaches neither the shop nor a page', () => {
  const { files } = siteWith([fixture({
    status: 'DRAFT',
    variants: [variant('OLB-CT-001', 'STN', 'M', null)],
    productionLeadDays: null,
  })]);
  assert.ok(!files.includes('shop/index.html'));
  assert.deepEqual(files.filter((f) => f.startsWith('products/')), []);
});

test('the product page answers price, size, material and availability', () => {
  const body = renderProductBody({ ...fixture(), eventId: 'EVT_x', recordedAt: 'now' });
  assert.match(body, /68,000 JPY – 72,000 JPY/);
  assert.match(body, /S · M/);
  assert.match(body, /Wool/);
  assert.match(body, /Pre-order/);
});

test('the pre-order window is stated before the purchase action, not after', () => {
  // ADR-003. The page has no buy button yet, so the check is positional: the
  // disclosure must precede everything below the decision layer.
  const body = renderProductBody({ ...fixture(), eventId: 'EVT_x', recordedAt: 'now' });
  const disclosure = body.indexOf('This is a pre-order');
  const meaning = body.indexOf('<h2>Measurements</h2>');
  assert.ok(disclosure > 0, 'the pre-order disclosure is missing');
  assert.ok(disclosure < meaning, 'the disclosure sits below the fold of the decision layer');
  assert.match(body, /dispatched about 60 days/);
  assert.match(body, /refunded in full/, 'the undersubscribed outcome must be disclosed');
});

test('the decision layer precedes the natural rule', () => {
  // 21_UX_PERFORMANCE_COST_AUDIT.md §13: brand story and buying facts competed
  // for the same vertical space, and the facts won.
  const body = renderProductBody({
    ...fixture({ naturalRule: { atlas: 'River Atlas', observation: 'meander curvature', translation: 'hem follows a continuous curve' } }),
    eventId: 'EVT_x', recordedAt: 'now',
  });
  assert.ok(body.indexOf('<dt>Price</dt>') < body.indexOf('The natural rule'));
  assert.match(body, /River Atlas/);
});

test('an absent natural rule leaves the section out rather than filling it', () => {
  const body = renderProductBody({ ...fixture({ naturalRule: null }), eventId: 'EVT_x', recordedAt: 'now' });
  assert.ok(!/The natural rule/.test(body));
});

test('unrecorded measurements are disclosed, never invented', () => {
  const body = renderProductBody({ ...fixture({ measurements: [] }), eventId: 'EVT_x', recordedAt: 'now' });
  assert.match(body, /have not been recorded yet/);
  assert.ok(!/\d+ cm/.test(body), 'a measurement appeared without data');
});

test('an unmeasured size shows a dash, not a number', () => {
  const body = renderProductBody({
    ...fixture({ measurements: [{ label: 'Back length', bySize: { M: 95 } }] }),
    eventId: 'EVT_x', recordedAt: 'now',
  });
  assert.match(body, /<td>—<\/td>/, 'the unmeasured size was filled in');
  assert.match(body, /95 cm/);
});

test('prices render in the right unit for the currency', () => {
  assert.equal(formatPrice(68000, 'JPY'), '68,000 JPY');
  assert.equal(formatPrice(6800, 'USD'), '68.00 USD');
});

test('product content is escaped', () => {
  const body = renderProductBody({
    ...fixture({ name: '<script>x</script>', summary: 'a & b' }),
    eventId: 'EVT_x', recordedAt: 'now',
  });
  assert.ok(!body.includes('<script>'));
  assert.match(body, /a &amp; b/);
});

test('a product page passes the same structural checks as every other page', () => {
  const { out } = siteWith([fixture()]);
  const page = readFileSync(resolve(out, 'products/olb-ct-001/index.html'), 'utf8');
  assert.match(page, /^<!doctype html>/i);
  assert.equal((page.match(/<h1[ >]/g) ?? []).length, 1);
  assert.ok(!/<script/i.test(page));
  assert.match(page, /<link rel="canonical" href="\/products\/olb-ct-001">/);
});

// --- the page and the pre-order run -------------------------------------

/** A run whose terms exist. Fixture only — no run has ever been opened. */
const runFixture = (overrides: Partial<RunRevision> = {}): RunRevision => ({
  eventId: 'EVT_run',
  runId: 'RUN_fixture',
  productId: 'PRD_fixture',
  status: 'OPEN',
  opensAt: '2026-09-01T00:00:00.000Z',
  closesAt: '2026-09-30T00:00:00.000Z',
  minimumQuantity: 20,
  targetQuantity: 40,
  productionLeadDays: 60,
  promisedShipBy: '2026-12-01T00:00:00.000Z',
  supplierQuoteId: 'QUOTE_fixture',
  recordedAt: '2026-08-22T00:00:00.000Z',
  actor: 'test',
  ...overrides,
});

test('with an open run the page states real dates, not an approximate number of days', () => {
  const body = renderProductBody(
    { ...fixture(), eventId: 'EVT_x', recordedAt: 'now' },
    runFixture(),
  );
  assert.match(body, /Closes 30 September 2026/);
  assert.match(body, /1 December 2026/);
  assert.ok(
    !/about 60 days/.test(body),
    'an approximation was shown alongside a date the run actually promises',
  );
});

test('without a run the page falls back to the approximate window, never to a made-up date', () => {
  const body = renderProductBody({ ...fixture(), eventId: 'EVT_x', recordedAt: 'now' }, null);
  assert.match(body, /about 60 days after the order window closes/);
  assert.ok(!/Closes /.test(body), 'a close date was stated with no run to promise it');
});

test('the refund promise survives whether or not a run is open', () => {
  // If the run misses its minimum nothing is produced, so this sentence is the
  // one that has to be true in both states.
  for (const run of [null, runFixture()]) {
    const body = renderProductBody({ ...fixture(), eventId: 'EVT_x', recordedAt: 'now' }, run);
    assert.match(body, /refunded in full/);
  }
});

test('a built page carries the run\'s dates — the wiring, not the renderer', () => {
  // The renderer tests above pass a run in by hand. This one records a real run
  // in a real file and reads the emitted HTML, which is the only way to catch
  // the build forgetting to look the run up at all.
  const stamp = Math.random().toString(36).slice(2);
  const catalogPath = resolve(dir, `wired-cat-${stamp}.jsonl`);
  const runsPath = resolve(dir, `wired-runs-${stamp}.jsonl`);
  new Catalog(catalogPath).record(fixture());

  const runs = new PreorderRunStore(runsPath);
  const input = {
    runId: 'RUN_wired',
    productId: fixture().productId,
    opensAt: '2026-09-01T00:00:00.000Z',
    closesAt: '2026-09-30T00:00:00.000Z',
    minimumQuantity: 20,
    targetQuantity: 40,
    productionLeadDays: 60,
    promisedShipBy: '2026-12-01T00:00:00.000Z',
    supplierQuoteId: 'QUOTE_fixture',
    actor: 'test',
  };
  runs.record({ ...input, status: 'DRAFT' as const });
  runs.record({ ...input, status: 'OPEN' as const });

  const out = resolve(dir, `wired-out-${stamp}`);
  build({ outDir: out, catalogPath, runsPath });
  const html = readFileSync(resolve(out, 'products/olb-ct-001/index.html'), 'utf8');

  assert.match(html, /Closes 30 September 2026/, 'the build did not read the open run');
  assert.match(html, /dispatched by 1 December 2026/);
  assert.ok(!/about 60 days/.test(html), 'an approximation survived alongside a real promise');
});

test('a closed run is not shown as if it were open', () => {
  const stamp = Math.random().toString(36).slice(2);
  const catalogPath = resolve(dir, `closed-cat-${stamp}.jsonl`);
  const runsPath = resolve(dir, `closed-runs-${stamp}.jsonl`);
  new Catalog(catalogPath).record(fixture());

  const runs = new PreorderRunStore(runsPath);
  const input = {
    runId: 'RUN_closed',
    productId: fixture().productId,
    opensAt: '2026-09-01T00:00:00.000Z',
    closesAt: '2026-09-30T00:00:00.000Z',
    minimumQuantity: 20,
    targetQuantity: 40,
    productionLeadDays: 60,
    promisedShipBy: '2026-12-01T00:00:00.000Z',
    supplierQuoteId: 'QUOTE_fixture',
    actor: 'test',
  };
  runs.record({ ...input, status: 'DRAFT' as const });
  runs.record({ ...input, status: 'OPEN' as const });
  runs.record({ ...input, status: 'CLOSED_UNDERSUBSCRIBED' as const });

  const out = resolve(dir, `closed-out-${stamp}`);
  build({ outDir: out, catalogPath, runsPath });
  const html = readFileSync(resolve(out, 'products/olb-ct-001/index.html'), 'utf8');

  assert.ok(!/Closes 30 September 2026/.test(html), 'a closed run was offered as an open window');
  assert.match(html, /about 60 days after the order window closes/);
});

test('THE CURRENT REPOSITORY has no open run', () => {
  // Same honesty guard as the catalogue: no run exists, so no page can state a
  // window. Changing this requires recording a run, deliberately.
  assert.equal(new PreorderRunStore(RUNS_PATH).open().length, 0);
});

// --- the purchase action -------------------------------------------------

test('an open run puts a real purchase form on the page', () => {
  const body = renderProductBody(
    { ...fixture(), eventId: 'EVT_x', recordedAt: 'now' },
    runFixture(),
  );
  assert.match(body, /<form class="order" method="post" action="\/checkout">/);
  assert.match(body, /name="sku"/);
  assert.match(body, /name="quantity"/);
  assert.match(body, /name="email"/);
  assert.match(body, /<button type="submit">/);
});

test('the form posts SKUs the catalogue holds, not strings built in the browser', () => {
  const body = renderProductBody(
    { ...fixture(), eventId: 'EVT_x', recordedAt: 'now' },
    runFixture(),
  );
  for (const v of fixture().variants) {
    assert.ok(body.includes(`value="${v.sku}"`), `${v.sku} is not offered`);
  }
});

test('no run, no purchase form — a button that cannot complete is worse than none', () => {
  const body = renderProductBody({ ...fixture(), eventId: 'EVT_x', recordedAt: 'now' }, null);
  assert.ok(!/<form/.test(body), 'the page offered a purchase with nothing to promise');
});

test('an unpriced variant is never offered for sale', () => {
  const unpriced = {
    ...fixture({ variants: [variant('OLB-CT-001', 'STN', 'M', null)] }),
    eventId: 'EVT_x', recordedAt: 'now',
  };
  const body = renderProductBody(unpriced, runFixture());
  assert.ok(!/<form/.test(body), 'a variant with no price was offered');
});

test('the form does not ask for an address it would then ignore', () => {
  // ADR-004 hosted checkout collects the address. Asking here and discarding it
  // is a form that lies about what it does with an answer.
  const body = renderProductBody(
    { ...fixture(), eventId: 'EVT_x', recordedAt: 'now' },
    runFixture(),
  );
  assert.ok(!/name="line1"|name="postalCode"|name="address"/.test(body));
  assert.match(body, /address is collected at payment/);
});

test('the built page carries the form, not just the renderer', () => {
  const stamp = Math.random().toString(36).slice(2);
  const catalogPath = resolve(dir, `form-cat-${stamp}.jsonl`);
  const runsPath = resolve(dir, `form-runs-${stamp}.jsonl`);
  new Catalog(catalogPath).record(fixture());

  const runs = new PreorderRunStore(runsPath);
  const input = {
    runId: 'RUN_form', productId: fixture().productId,
    opensAt: '2026-09-01T00:00:00.000Z', closesAt: '2026-09-30T00:00:00.000Z',
    minimumQuantity: 20, targetQuantity: 40, productionLeadDays: 60,
    promisedShipBy: '2026-12-01T00:00:00.000Z', supplierQuoteId: 'QUOTE_fixture', actor: 'test',
  };
  runs.record({ ...input, status: 'DRAFT' as const });
  runs.record({ ...input, status: 'OPEN' as const });

  const out = resolve(dir, `form-out-${stamp}`);
  build({ outDir: out, catalogPath, runsPath });
  const html = readFileSync(resolve(out, 'products/olb-ct-001/index.html'), 'utf8');
  assert.match(html, /action="\/checkout"/, 'the build emitted no purchase form');
});

test('the page still ships no JavaScript', () => {
  // The form works without any. If a script ever appears here it is because
  // something stopped working without one.
  const stamp = Math.random().toString(36).slice(2);
  const catalogPath = resolve(dir, `js-cat-${stamp}.jsonl`);
  new Catalog(catalogPath).record(fixture());
  const out = resolve(dir, `js-out-${stamp}`);
  build({ outDir: out, catalogPath });
  for (const file of ['index.html', 'products/olb-ct-001/index.html']) {
    const html = readFileSync(resolve(out, file), 'utf8');
    assert.ok(!/<script/i.test(html), `${file} ships JavaScript`);
    assert.ok(!/ on[a-z]+=/i.test(html), `${file} carries an inline event handler`);
  }
});
