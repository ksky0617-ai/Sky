/**
 * The health endpoint.
 *
 * It exists to answer one question from outside a deployment: did this actually
 * come up? Three things have failed here that it would have caught —
 * the function could not load on Workers at all, a half-configuration would
 * have served in whichever half was set, and storage is the open question in
 * PCQ-004.
 *
 * It is unauthenticated, so everything it returns is public. Half of these
 * tests are about what it must NOT say.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { Catalog, variant, type ProductInput } from '../../src/catalog/catalog.ts';
import { UnconfiguredGateway } from '../../src/checkout/checkout.ts';
import { IntentStore } from '../../src/checkout/intents.ts';
import { HEALTH_PATH, handleRequest, UnconfiguredVerifier, type RouterOptions } from '../../src/http/router.ts';
import { OrderStore } from '../../src/order/store.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';
import { UnavailableStorage } from '../../src/persistence/storage.ts';
import { PreorderRunStore, type RunInput } from '../../src/preorder/run.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-health-'));
let n = 0;

test.after(() => rmSync(dir, { recursive: true, force: true }));

const SECRET = 'a-health-test-secret';

const product = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  productId: 'PRD_test', code: 'OLB-CT-001', name: 'Test Coat', category: 'CT',
  status: 'PUBLISHED', summary: 'A fixture, not a product.',
  variants: [variant('OLB-CT-001', 'STN', 'M', { amount: 72000, currency: 'JPY' })],
  measurements: [], naturalRule: null, materials: ['Wool'],
  productionLeadDays: 60, actor: 'test',
  ...overrides,
});

const runInput = (overrides: Partial<RunInput> = {}): RunInput => ({
  runId: 'RUN_test', productId: 'PRD_test', status: 'DRAFT',
  opensAt: '2026-09-01T00:00:00.000Z', closesAt: '2026-09-30T00:00:00.000Z',
  minimumQuantity: 20, targetQuantity: 40, productionLeadDays: 60,
  promisedShipBy: '2026-12-01T00:00:00.000Z', supplierQuoteId: 'QUOTE_fixture', actor: 'test',
  ...overrides,
});

interface Options { product?: ProductInput | null; open?: boolean; storage?: 'file' | 'unavailable'; sandbox?: boolean; ordersPath?: string }

function options(o: Options = {}): RouterOptions {
  const id = n++;
  const storageFor = (name: string) =>
    o.storage === 'unavailable'
      ? new UnavailableStorage(name)
      : new FileStorage(resolve(dir, `${name}-${id}.jsonl`));

  const catalog = new Catalog(storageFor('catalog'));
  // Storage that refuses writes cannot be seeded — which is the point of it.
  if (o.storage !== 'unavailable' && o.product !== null) catalog.record(o.product ?? product());

  const runs = new PreorderRunStore(storageFor('runs'));
  if (o.storage !== 'unavailable' && o.open !== false) {
    runs.record(runInput());
    runs.record(runInput({ status: 'OPEN' }));
  }

  return {
    stores: {
      catalog,
      runs,
      orders: new OrderStore(
        o.ordersPath !== undefined ? new FileStorage(o.ordersPath) : storageFor('orders'),
      ),
      intents: new IntentStore(storageFor('intents')),
    },
    gateway: new UnconfiguredGateway(),
    verifier: new UnconfiguredVerifier(),
    ...(o.sandbox === true ? { sandbox: { enabled: true as const, secret: SECRET } } : {}),
  };
}

const ask = (o: RouterOptions, method = 'GET') =>
  handleRequest(o, new Request(`https://olibana.test${HEALTH_PATH}`, { method }));

// --- what it reports -----------------------------------------------------

test('a healthy deployment answers 200 and says what it holds', async () => {
  const response = await ask(options({ sandbox: true }));
  const body = JSON.parse(await response!.text()) as Record<string, unknown>;

  assert.equal(response?.status, 200);
  assert.equal(body.build, 'unknown', 'with no platform variable the build must not be invented');
  assert.equal(body.status, 'ok');
  assert.equal(body.storage, 'available');
  assert.equal(body.published, 1);
  assert.equal(body.openRuns, 1);
  assert.equal(body.accepting, true);
});

test('a deployment that cannot write is degraded, not ok', async () => {
  // The failure worth catching: reads succeed, so the site looks fine, but an
  // order would be accepted and lost.
  const response = await ask(options({ storage: 'unavailable' }));
  const body = JSON.parse(await response!.text()) as Record<string, unknown>;

  assert.equal(response?.status, 503, 'a deployment that loses orders reported itself healthy');
  assert.equal(body.status, 'degraded');
  assert.equal(body.storage, 'unavailable');
  assert.equal(body.accepting, false);
});

test('a corrupt log reports unreadable rather than merely unavailable', async () => {
  // Different cause, different remedy: one needs configuration, the other needs
  // the log restored from history.
  const ordersPath = resolve(dir, `corrupt-${n++}.jsonl`);
  writeFileSync(ordersPath, '{not json}\n', 'utf8');
  const response = await ask(options({ ordersPath }));
  const body = JSON.parse(await response!.text()) as Record<string, unknown>;

  assert.equal(response?.status, 503);
  assert.equal(body.storage, 'unreadable');
});

test('a deployment with nothing to sell says it is not accepting', async () => {
  // The repository's real state. Reporting "ok, accepting" here would be the
  // health check lying about a shop with no shop in it.
  const response = await ask(options({ product: null, open: false }));
  const body = JSON.parse(await response!.text()) as Record<string, unknown>;

  assert.equal(response?.status, 200, 'a closed shop is healthy, just not selling');
  assert.equal(body.published, 0);
  assert.equal(body.openRuns, 0);
  assert.equal(body.accepting, false);
});

test('an open run with no published product is not accepting either', async () => {
  const response = await ask(options({ product: null }));
  const body = JSON.parse(await response!.text()) as Record<string, unknown>;
  assert.equal(body.openRuns, 1);
  assert.equal(body.accepting, false, 'accepting was claimed with nothing to buy');
});

// --- what it must not report --------------------------------------------

test('it leaks no secret, no path and no identifier', async () => {
  // Unauthenticated by nature, so everything here is public.
  const withSecret = options({ sandbox: true });
  const body = await (await ask(withSecret))!.text();

  assert.ok(!body.includes(SECRET), 'the webhook secret appeared in the health response');
  assert.ok(!/\/(tmp|home|var)\//.test(body), 'a filesystem path appeared in the health response');
  assert.ok(!/PRD_|RUN_|ORD_|EVT_|CUS_/.test(body), 'an internal identifier appeared');
  assert.ok(!/OLB-CT/.test(body), 'a product code appeared');

  // Only the keys that were designed to be public. `build` is deliberately
  // among them: it is a commit SHA of a repository that is already public, and
  // knowing which build is serving is the entire point of the marker. Every
  // other key is a count or a state that the site itself already shows.
  assert.deepEqual(
    Object.keys(JSON.parse(body) as object).sort(),
    ['accepting', 'build', 'openRuns', 'published', 'status', 'storage'],
  );
});

test('it carries the same security headers as every other response', async () => {
  const response = await ask(options());
  assert.equal(response?.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response?.headers.get('cache-control'), 'no-store');
  assert.match(response?.headers.get('content-type') ?? '', /application\/json/);
});

test('it answers GET only', async () => {
  const o = options();
  const response = await ask(o, 'POST');
  assert.equal(response?.status, 405);
  assert.equal(await response!.text(), 'method not allowed');
});

test('checking health writes nothing', async () => {
  // It probes the write path to know whether writes work. That probe must not
  // itself leave a record, or every health check would grow the order log.
  const o = options();
  await ask(o);
  await ask(o);
  assert.equal(o.stores.orders.placements().length, 0);
  assert.equal(o.stores.orders.events().length, 0);
});
