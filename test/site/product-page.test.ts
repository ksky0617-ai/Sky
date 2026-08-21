import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { build } from '../../src/site/build.ts';
import { buildRoutes, CATALOG_PATH } from '../../src/site/routes.ts';
import { formatPrice, renderProductBody } from '../../src/site/product-page.ts';
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
