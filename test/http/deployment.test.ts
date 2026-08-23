/**
 * The deployment adapter, driven the way Cloudflare Pages drives it.
 *
 * `onRequest` is called with a real `Request` and a stubbed `ASSETS` binding —
 * the one thing that cannot be anything else, since it is the platform's own
 * static server. Everything downstream is the real router, the real checkout
 * and real files.
 *
 * What this proves: the adapter routes, refuses a bad configuration, and lets
 * the platform serve what it does not own. What it does not prove: that
 * Cloudflare runs it. That needs credentials, and is recorded as a gate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { Catalog, variant } from '../../src/catalog/catalog.ts';
import { signWebhook, type SignedWebhook } from '../../src/checkout/sandbox.ts';
import { EnvironmentInvalid } from '../../src/http/environment.ts';
import { CHECKOUT_PATH, CONFIRMATION_PATH, SANDBOX_PATH, WEBHOOK_PATH } from '../../src/http/router.ts';
import { IntentStore } from '../../src/checkout/intents.ts';
import { OrderStore } from '../../src/order/store.ts';
import { PreorderRunStore } from '../../src/preorder/run.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';

const { onRequest } = await import('../../functions/[[path]].ts');

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-deploy-'));
let n = 0;

test.after(() => rmSync(dir, { recursive: true, force: true }));

const SECRET = 'a-deployment-secret-x';

/** Stands in for the platform's static asset server. */
const ASSETS = {
  fetch: (request: Request) =>
    Promise.resolve(new Response(`static:${new URL(request.url).pathname}`, { status: 200 })),
};

function environment(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> & { ASSETS: typeof ASSETS } {
  const id = n++;
  const catalogPath = resolve(dir, `cat-${id}.jsonl`);
  const runsPath = resolve(dir, `runs-${id}.jsonl`);

  new Catalog(new FileStorage(catalogPath)).record({
    productId: 'PRD_deploy', code: 'OLB-CT-001', name: 'Deploy Coat', category: 'CT',
    status: 'PUBLISHED', summary: 'A fixture, not a product.',
    variants: [variant('OLB-CT-001', 'STN', 'M', { amount: 72000, currency: 'JPY' })],
    measurements: [], naturalRule: null, materials: ['Wool'],
    productionLeadDays: 60, actor: 'test',
  });

  const runs = new PreorderRunStore(new FileStorage(runsPath));
  const run = {
    runId: 'RUN_deploy', productId: 'PRD_deploy',
    opensAt: '2026-09-01T00:00:00.000Z', closesAt: '2026-09-30T00:00:00.000Z',
    minimumQuantity: 20, targetQuantity: 40, productionLeadDays: 60,
    promisedShipBy: '2026-12-01T00:00:00.000Z', supplierQuoteId: 'QUOTE_fixture', actor: 'test',
  } as const;
  runs.record({ ...run, status: 'DRAFT' });
  runs.record({ ...run, status: 'OPEN' });

  return {
    ASSETS,
    OLIBANA_CATALOG: catalogPath,
    OLIBANA_RUNS: runsPath,
    OLIBANA_ORDERS: resolve(dir, `orders-${id}.jsonl`),
    OLIBANA_INTENTS: resolve(dir, `intents-${id}.jsonl`),
    ...overrides,
  };
}

const get = (path: string) => new Request(`https://olibana.test${path}`);
const post = (path: string, fields: Record<string, string>) =>
  new Request(`https://olibana.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });

const selection = {
  productId: 'PRD_deploy', sku: 'OLB-CT-001-STN-M', quantity: '1', email: 'ada@example.test',
};

test('anything the router does not own is handed to the platform', async () => {
  const env = environment();
  const response = await onRequest({ request: get('/products/olb-ct-001'), env });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'static:/products/olb-ct-001');
});

test('with no configuration the deployment is closed, and says so', async () => {
  const env = environment();
  const response = await onRequest({ request: post(CHECKOUT_PATH, selection), env });
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Nothing has been charged/);
  assert.equal(new OrderStore(new FileStorage(env.OLIBANA_ORDERS as string)).placements().length, 0);
});

test('a half-configured deployment refuses to serve rather than serving half', async () => {
  // Serving in whichever half was configured is the silent failure this exists
  // to prevent, so the adapter throws instead of falling back to closed.
  const env = environment({ OLIBANA_MODE: 'live' });
  await assert.rejects(
    () => onRequest({ request: get('/'), env }),
    EnvironmentInvalid,
  );
});

test('the sandbox is unreachable unless the deployment is a sandbox', async () => {
  const env = environment();
  const response = await onRequest({ request: get(`${SANDBOX_PATH}?ref=anything`), env });
  const body = await response.text();

  assert.equal(response.status, 404, 'a closed deployment exposed the sandbox');
  // A status alone would pass if the page rendered under a 404. What must not
  // exist is the page that records payments nobody made.
  assert.ok(!/Nothing is charged here/.test(body), 'the sandbox page rendered under a 404');
  assert.ok(!/<form/.test(body), 'a payment form was served by a closed deployment');
});

test('live mode still refuses to invent a checkout URL', async () => {
  // The signature mechanism is done. The provider-specific gateway is the one
  // thing a human must supply, and until they do, this must not guess.
  const env = environment({ OLIBANA_MODE: 'live', OLIBANA_WEBHOOK_SECRET: SECRET });
  const response = await onRequest({ request: post(CHECKOUT_PATH, selection), env });
  const body = await response.text();

  assert.equal(response.status, 503);
  assert.match(body, /Nothing has been charged/, 'the refusal did not say what happened');
  assert.ok(!/location/i.test([...response.headers.keys()].join(',')), 'a customer was redirected somewhere');
  assert.equal(
    new OrderStore(new FileStorage(env.OLIBANA_ORDERS as string)).placements().length, 0,
    'an order was recorded by a deployment that cannot take payment',
  );
});

test('live mode verifies webhook signatures', async () => {
  const env = environment({ OLIBANA_MODE: 'live', OLIBANA_WEBHOOK_SECRET: SECRET });
  const unsigned = new Request(`https://olibana.test${WEBHOOK_PATH}`, { method: 'POST', body: '{}' });
  const response = await onRequest({ request: unsigned, env });

  assert.equal(response.status, 400);
  assert.equal(await response.text(), 'unverified');
  // The status is not the point. The point is that nothing downstream ran.
  assert.equal(
    new OrderStore(new FileStorage(env.OLIBANA_ORDERS as string)).placements().length, 0,
    'an unsigned payload reached order placement',
  );
});

test('SANDBOX: selection to payment to confirmation, through the deployed adapter', async () => {
  const env = environment({
    OLIBANA_MODE: 'sandbox',
    OLIBANA_WEBHOOK_SECRET: SECRET,
    OLIBANA_ORIGIN: 'http://localhost:8788',
  });

  // 1. The form post is accepted and sent to the gateway.
  const redirect = await onRequest({ request: post(CHECKOUT_PATH, selection), env });
  assert.equal(redirect.status, 303);
  const location = redirect.headers.get('location') ?? '';
  assert.match(location, new RegExp(`${SANDBOX_PATH}\\?`), 'the customer was not sent to pay');

  // 2. The gateway's page exists and names what is being paid for.
  const reference = new URL(location, 'http://localhost:8788').searchParams.get('ref') as string;
  const payPage = await onRequest({ request: get(`${SANDBOX_PATH}?ref=${reference}`), env });
  assert.equal(payPage.status, 200);
  const payBody = await payPage.text();
  assert.match(payBody, /Nothing is charged here/);
  assert.match(payBody, /72,000 JPY/);

  // 3. Paying signs a webhook and takes the same verified path a provider would.
  const paid = await onRequest({
    request: post(SANDBOX_PATH, {
      ref: reference, line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP',
    }),
    env,
  });
  assert.equal(paid.status, 303);
  assert.match(paid.headers.get('location') ?? '', new RegExp(`^${CONFIRMATION_PATH}\\?ref=`));

  // 4. The order is on disk, paid, at the agreed price.
  const orders = new OrderStore(new FileStorage(env.OLIBANA_ORDERS as string));
  const order = orders.placements()[0];
  assert.equal(orders.placements().length, 1);
  assert.equal(orders.status(order.orderId), 'PAID');
  assert.equal(order.subtotalAmount, 72000);
  assert.equal(order.shippingAddress.city, 'Kyoto');

  // 5. The customer sees it.
  const confirmation = await onRequest({ request: get(`${CONFIRMATION_PATH}?ref=${reference}`), env });
  assert.equal(confirmation.status, 200);
  assert.match(await confirmation.text(), new RegExp(order.number));
});

test('SANDBOX: paying twice for one checkout produces one order', async () => {
  const env = environment({
    OLIBANA_MODE: 'sandbox', OLIBANA_WEBHOOK_SECRET: SECRET, OLIBANA_ORIGIN: 'http://localhost:8788',
  });
  const redirect = await onRequest({ request: post(CHECKOUT_PATH, selection), env });
  const reference = new URL(redirect.headers.get('location') as string, 'http://localhost:8788')
    .searchParams.get('ref') as string;

  const pay = () => onRequest({
    request: post(SANDBOX_PATH, {
      ref: reference, line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP',
    }),
    env,
  });
  await pay();
  const second = await pay();

  assert.equal(second.status, 303, 'a repeat payment errored instead of resolving to the same order');
  assert.equal(new OrderStore(new FileStorage(env.OLIBANA_ORDERS as string)).placements().length, 1);
});

test('SANDBOX: an abandoned checkout leaves an intent and no order', async () => {
  // committedUnits counts orders. An abandoned checkout that became an order
  // would tell a run it can afford fabric it cannot.
  const env = environment({
    OLIBANA_MODE: 'sandbox', OLIBANA_WEBHOOK_SECRET: SECRET, OLIBANA_ORIGIN: 'http://localhost:8788',
  });
  await onRequest({ request: post(CHECKOUT_PATH, selection), env });

  assert.equal(new IntentStore(new FileStorage(env.OLIBANA_INTENTS as string)).all().length, 1);
  assert.equal(new OrderStore(new FileStorage(env.OLIBANA_ORDERS as string)).placements().length, 0);
  assert.equal(new OrderStore(new FileStorage(env.OLIBANA_ORDERS as string)).committedUnits('RUN_deploy'), 0);
});

test('a forged webhook cannot manufacture an order in any mode', async () => {
  for (const mode of ['sandbox', 'live'] as const) {
    const env = environment({
      OLIBANA_MODE: mode, OLIBANA_WEBHOOK_SECRET: SECRET, OLIBANA_ORIGIN: 'http://localhost:8788',
    });
    await onRequest({ request: post(CHECKOUT_PATH, selection), env });
    const reference = new IntentStore(new FileStorage(env.OLIBANA_INTENTS as string)).all()[0].reference;

    const payload: SignedWebhook = {
      reference, providerRef: 'forged', email: 'attacker@example.test',
      shippingAddress: { line1: 'x', city: 'x', postalCode: 'x', country: 'JP' },
      amountPaid: 72000, currency: 'JPY',
    };
    const body = JSON.stringify(payload);
    const forged = new Request(`https://olibana.test${WEBHOOK_PATH}`, {
      method: 'POST',
      headers: { 'x-olibana-signature': await signWebhook('the-wrong-secret-xx', body) },
      body,
    });

    const response = await onRequest({ request: forged, env });
    assert.equal(response.status, 400, `${mode} accepted a forged signature`);
    assert.equal(new OrderStore(new FileStorage(env.OLIBANA_ORDERS as string)).placements().length, 0);
  }
});
