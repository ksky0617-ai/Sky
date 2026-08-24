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
import { EnvironmentInvalid, validateEnvironment } from '../../src/http/environment.ts';
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

/**
 * Stands in for the platform's static asset server.
 *
 * Counts what it was asked for, so a test can assert the site was NOT served —
 * a refusal that still hands the request to the asset server has refused
 * nothing.
 */
const ASSETS = {
  calls: 0,
  fetch(request: Request) {
    ASSETS.calls += 1;
    return Promise.resolve(new Response(`static:${new URL(request.url).pathname}`, { status: 200 }));
  },
};

function environment(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> & { ASSETS: typeof ASSETS } {
  ASSETS.calls = 0;
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
  // to prevent. `validateEnvironment` still throws — that has not changed.
  //
  // What changed is where the throw lands. This test used to assert that
  // `onRequest` REJECTS, and that was the weaker requirement: an exception
  // escaping the function does not refuse the request, it delegates the refusal
  // to Cloudflare, which answers with its own error page — no security headers,
  // no `referrer-policy`, and content this project does not control on a domain
  // carrying its name. A half-configured deploy is the most likely state of a
  // first deployment, so that was not a remote path.
  //
  // The requirement is that it does not serve the site. That is asserted
  // directly now, and the refusal is one this system emits.
  const env = environment({ OLIBANA_MODE: 'live' });
  const response = await onRequest({ request: get('/'), env });
  const body = await response.text();

  assert.equal(response.status, 500);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(env.ASSETS.calls, 0, 'a half-configured deployment served the site');
  assert.ok(!body.includes('OLIBANA_'), 'the page named a configuration variable');
  assert.ok(!/EnvironmentInvalid|webhook|secret/i.test(body), 'the page leaked the reason');

  // And the underlying refusal is unchanged: the validator still throws.
  assert.throws(() => validateEnvironment(env), EnvironmentInvalid);
});

test('the boundary catches everything, not merely the errors it expects', async () => {
  // A boundary that re-throws some errors is a boundary with a hole, and the
  // one thing known about an unexpected error is that nobody predicted its
  // shape. Driven through the platform binding, which is the layer the
  // function cannot control.
  const env = environment();
  const exploding = {
    ...env,
    ASSETS: { fetch(): never { throw new TypeError('platform binding failed: /var/secret/path'); } },
  };
  const response = await onRequest({ request: get('/nature'), env: exploding });
  const body = await response.text();

  assert.equal(response.status, 500);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.ok(!body.includes('/var/secret/path'), 'an exception message reached the visitor');
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
