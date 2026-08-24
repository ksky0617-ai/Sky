/**
 * The HTTP layer, exercised with real `Request` objects against real files.
 *
 * Nothing is stubbed except the payment gateway itself, which cannot be
 * anything else: taking money is a Human Gate. Both the unconfigured gateway
 * and a recording one are used, so the refusal path and the success path are
 * each measured rather than assumed from the other.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { Catalog, variant, type ProductInput } from '../../src/catalog/catalog.ts';
import {
  beginCheckout,
  UnconfiguredGateway,
  type CheckoutIntent,
  type CheckoutStores,
  type CompletedCheckout,
  type PaymentGateway,
} from '../../src/checkout/checkout.ts';
import {
  CONFIRMATION_PATH,
  CHECKOUT_PATH,
  handleRequest,
  submissionKey,
  UnconfiguredVerifier,
  WEBHOOK_PATH,
  type RouterOptions,
  type WebhookVerifier,
} from '../../src/http/router.ts';
import { IntentStore } from '../../src/checkout/intents.ts';
import { HmacWebhookVerifier, signWebhook, type SignedWebhook } from '../../src/checkout/sandbox.ts';
import { OrderStore } from '../../src/order/store.ts';
import { PreorderRunStore, type RunInput } from '../../src/preorder/run.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';
import type { LogStorage } from '../../src/persistence/storage.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-http-'));
let n = 0;

test.after(() => rmSync(dir, { recursive: true, force: true }));

const product = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  productId: 'PRD_test',
  code: 'OLB-CT-001',
  name: 'Test Coat',
  category: 'CT',
  status: 'PUBLISHED',
  summary: 'A fixture, not a product.',
  variants: [variant('OLB-CT-001', 'STN', 'M', { amount: 72000, currency: 'JPY' })],
  measurements: [],
  naturalRule: null,
  materials: ['Wool'],
  productionLeadDays: 60,
  actor: 'test',
  ...overrides,
});

const runInput = (overrides: Partial<RunInput> = {}): RunInput => ({
  runId: 'RUN_test',
  productId: 'PRD_test',
  status: 'DRAFT',
  opensAt: '2026-09-01T00:00:00.000Z',
  closesAt: '2026-09-30T00:00:00.000Z',
  minimumQuantity: 20,
  targetQuantity: 40,
  productionLeadDays: 60,
  promisedShipBy: '2026-12-01T00:00:00.000Z',
  supplierQuoteId: 'QUOTE_fixture',
  actor: 'test',
  ...overrides,
});

function stores(options: { product?: ProductInput; open?: boolean } = {}): CheckoutStores {
  const id = n++;
  const catalog = new Catalog(new FileStorage(resolve(dir, `cat-${id}.jsonl`)));
  catalog.record(options.product ?? product());
  const runs = new PreorderRunStore(new FileStorage(resolve(dir, `runs-${id}.jsonl`)));
  runs.record(runInput());
  if (options.open !== false) runs.record(runInput({ status: 'OPEN' }));
  return {
    catalog, runs,
    orders: new OrderStore(new FileStorage(resolve(dir, `orders-${id}.jsonl`))),
    intents: new IntentStore(new FileStorage(resolve(dir, `intents-${id}.jsonl`))),
  };
}

/** A gateway that records what it was asked to charge, and charges nothing. */
class RecordingGateway implements PaymentGateway {
  readonly seen: CheckoutIntent[] = [];
  createSession(intent: CheckoutIntent): { url: string } {
    this.seen.push(intent);
    return { url: `https://gateway.test/session/${encodeURIComponent(intent.idempotencyKey)}` };
  }
}

function options(overrides: Partial<RouterOptions> = {}): RouterOptions {
  const s = overrides.stores ?? stores();
  return {
    stores: s,
    gateway: overrides.gateway ?? new UnconfiguredGateway(),
    verifier: overrides.verifier ?? new UnconfiguredVerifier(),
  };
}

function form(fields: Record<string, string>): Request {
  return new Request(`https://olibana.test${CHECKOUT_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
}

const selection = { productId: 'PRD_test', sku: 'OLB-CT-001-STN-M', quantity: '1', email: 'ada@example.test' };

// --- routing -------------------------------------------------------------

test('a path the router does not own is left to the static site', async () => {
  const response = await handleRequest(options(), new Request('https://olibana.test/products/olb-ct-001'));
  assert.equal(response, null);
});

test('arriving at the checkout by GET sends you home rather than erroring', async () => {
  // A bookmark or a back button, not a customer part-way through anything.
  const response = await handleRequest(options(), new Request(`https://olibana.test${CHECKOUT_PATH}`));
  assert.equal(response?.status, 303);
  assert.equal(response?.headers.get('location'), '/');
});

test('the webhook rejects anything that is not a POST', async () => {
  const o = options();
  const response = await handleRequest(o, new Request(`https://olibana.test${WEBHOOK_PATH}`));

  assert.equal(response?.status, 405);
  assert.equal(await response!.text(), 'method not allowed');
  assert.equal(o.stores.orders.placements().length, 0, 'a GET to the webhook created something');
});

// --- the form post -------------------------------------------------------

test('a valid submission is sent to the gateway and nothing is written yet', async () => {
  const s = stores();
  const gateway = new RecordingGateway();
  const response = await handleRequest(options({ stores: s, gateway }), form(selection));

  assert.equal(response?.status, 303);
  assert.match(response?.headers.get('location') ?? '', /^https:\/\/gateway\.test\/session\//);
  assert.equal(gateway.seen[0].totalAmount, 72000);
  assert.equal(gateway.seen[0].preorderRunId, 'RUN_test');
  assert.equal(s.orders.placements().length, 0, 'an order was written before anyone paid');
});

test('with no gateway the customer is told plainly, and nothing is charged', async () => {
  const s = stores();
  const response = await handleRequest(options({ stores: s }), form(selection));
  const body = await response!.text();

  assert.equal(response?.status, 503);
  assert.match(body, /not connected/);
  assert.match(body, /Nothing has been charged/);
  assert.equal(s.orders.placements().length, 0);
});

test('a refused selection explains itself to the person it was refused for', async () => {
  const s = stores({ open: false });
  const response = await handleRequest(options({ stores: s, gateway: new RecordingGateway() }), form(selection));
  const body = await response!.text();

  assert.equal(response?.status, 422);
  assert.match(body, /no open pre-order run/);
  assert.match(body, /<html/, 'a browser posting a form was answered with something other than a page');
});

test('a malformed submission is refused, not guessed at', async () => {
  const gateway = new RecordingGateway();
  for (const bad of [
    { ...selection, quantity: 'many' },
    { ...selection, quantity: '0' },
    { ...selection, sku: 'OLB-CT-001-STN-XXL' },
    { ...selection, email: 'not-an-address' },
    {},
  ]) {
    const response = await handleRequest(options({ gateway }), form(bad as Record<string, string>));
    assert.equal(response?.status, 422, `${JSON.stringify(bad)} was not refused`);
  }
  assert.equal(gateway.seen.length, 0, 'a malformed selection reached the gateway');
});

test('an error page is not indexed and not cached', async () => {
  const response = await handleRequest(options(), form(selection));
  assert.equal(response?.headers.get('cache-control'), 'no-store');
  assert.match(await response!.text(), /name="robots" content="noindex"/);
});

test('the submission key is stable for one selection and different for another', async () => {
  const key = (fields: Record<string, string>) => submissionKey(new URLSearchParams(fields));
  assert.equal(key(selection), key({ ...selection, email: '  ADA@Example.test ' }));
  assert.notEqual(key(selection), key({ ...selection, email: 'bea@example.test' }));
  assert.notEqual(key(selection), key({ ...selection, quantity: '2' }));
  assert.notEqual(key(selection), key({ ...selection, sku: 'OLB-CT-001-STN-S' }));
});

test('a double-clicked form reaches the gateway with one key, not two', async () => {
  const gateway = new RecordingGateway();
  const s = stores();
  await handleRequest(options({ stores: s, gateway }), form(selection));
  await handleRequest(options({ stores: s, gateway }), form(selection));
  assert.equal(new Set(gateway.seen.map((i) => i.idempotencyKey)).size, 1);
});

// --- the webhook, with a real signature -----------------------------------

const SECRET = 'a-test-secret-long-enough';

/** The payload a gateway posts back, signed the way a gateway signs it. */
async function signedWebhook(
  overrides: Partial<SignedWebhook> & Pick<SignedWebhook, 'reference'>,
  timestamp?: number,
): Promise<Request> {
  const payload: SignedWebhook = {
    providerRef: 'ref_1',
    email: 'ada@example.test',
    shippingAddress: { line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP' },
    amountPaid: 72000,
    currency: 'JPY',
    ...overrides,
  };
  const body = JSON.stringify(payload);
  return new Request(`https://olibana.test${WEBHOOK_PATH}`, {
    method: 'POST',
    headers: { 'x-olibana-signature': await signWebhook(SECRET, body, timestamp) },
    body,
  });
}

/** Runs a checkout so an intent exists, and returns its reference. */
async function checkedOut(o: RouterOptions, fields = selection): Promise<string> {
  await handleRequest(o, form(fields));
  return o.stores.intents.all().at(-1)!.reference;
}

function signing(overrides: Partial<RouterOptions> = {}): RouterOptions {
  return options({ gateway: new RecordingGateway(), verifier: new HmacWebhookVerifier(SECRET), ...overrides });
}

test('an unsigned webhook is refused before anything downstream reads it', async () => {
  const o = signing();
  const reference = await checkedOut(o);
  const response = await handleRequest(
    o,
    new Request(`https://olibana.test${WEBHOOK_PATH}`, { method: 'POST', body: JSON.stringify({ reference }) }),
  );
  assert.equal(response?.status, 400);
  assert.equal(o.stores.orders.placements().length, 0, 'an unsigned payload created an order');
});

test('a webhook signed with the wrong secret is refused', async () => {
  const o = signing();
  const reference = await checkedOut(o);
  const body = JSON.stringify({ reference });
  const response = await handleRequest(o, new Request(`https://olibana.test${WEBHOOK_PATH}`, {
    method: 'POST',
    headers: { 'x-olibana-signature': await signWebhook('a-different-secret-x', body) },
    body,
  }));
  assert.equal(response?.status, 400);
  assert.equal(o.stores.orders.placements().length, 0);
});

test('a correctly signed but stale webhook is refused, so a captured one cannot be replayed', async () => {
  const o = signing();
  const reference = await checkedOut(o);
  const hourAgo = Math.floor(Date.now() / 1000) - 3600;
  const response = await handleRequest(o, await signedWebhook({ reference }, hourAgo));
  assert.equal(response?.status, 400);
  assert.equal(o.stores.orders.placements().length, 0);
});

test('a signed webhook for an unknown checkout is refused rather than invented', async () => {
  const o = signing();
  await checkedOut(o);
  const response = await handleRequest(o, await signedWebhook({ reference: 'EVT_nonexistent' }));
  assert.equal(response?.status, 404);
  assert.equal(o.stores.orders.placements().length, 0);
});

test('a verified payment places the order and marks it paid', async () => {
  const o = signing();
  const reference = await checkedOut(o);
  const response = await handleRequest(o, await signedWebhook({ reference }));

  assert.equal(response?.status, 200);
  assert.match(await response!.text(), /^placed OLB-/);
  const order = o.stores.orders.placements()[0];
  assert.equal(o.stores.orders.status(order.orderId), 'PAID');
  assert.equal(order.customer.email, 'ada@example.test');
  assert.equal(order.reference, reference);
});

test('a redelivered webhook answers 200 and creates nothing further', async () => {
  // A provider that receives an error redelivers. Redelivering something we
  // recorded is noise; redelivering something we failed to record is the point.
  const o = signing();
  const reference = await checkedOut(o);
  await handleRequest(o, await signedWebhook({ reference }));
  const second = await handleRequest(o, await signedWebhook({ reference }));

  assert.equal(second?.status, 200);
  assert.match(await second!.text(), /^duplicate OLB-/);
  assert.equal(o.stores.orders.placements().length, 1);
});

test('the amount comes from the recorded agreement, not from the payload', async () => {
  // A signed message still must not be able to define what was owed.
  const o = signing();
  const reference = await checkedOut(o);
  const response = await handleRequest(o, await signedWebhook({ reference, amountPaid: 1 }));

  assert.equal(response?.status, 422, 'a payload defined its own price');
  assert.match(await response!.text(), /refused:/);
  assert.equal(o.stores.orders.placements().length, 0);
});

// --- the confirmation page ----------------------------------------------

test('the confirmation page shows the order to whoever holds its reference', async () => {
  const o = signing();
  const reference = await checkedOut(o);
  await handleRequest(o, await signedWebhook({ reference }));

  const response = await handleRequest(
    o,
    new Request(`https://olibana.test${CONFIRMATION_PATH}?ref=${reference}`),
  );
  const body = await response!.text();
  assert.equal(response?.status, 200);
  assert.match(body, /Order OLB-/);
  assert.match(body, /72,000 JPY/);
  assert.match(body, /1 December 2026/);
  assert.match(body, /refunded in full/);
});

test('a confirmation reference that names nothing shows no one else order', async () => {
  const o = signing();
  const reference = await checkedOut(o);
  await handleRequest(o, await signedWebhook({ reference }));

  for (const ref of ['', 'EVT_guess', reference.slice(0, -1)]) {
    const response = await handleRequest(
      o,
      new Request(`https://olibana.test${CONFIRMATION_PATH}?ref=${ref}`),
    );
    const body = await response!.text();
    assert.equal(response?.status, 202, `${ref || '(empty)'} resolved to an order`);
    assert.ok(!/OLB-\d/.test(body), 'an order number leaked to a wrong reference');
  }
});

test('a customer whose order cannot be looked up is not shown a 500, and is not told it is fine', async () => {
  // Found by the deployment auditor, not by this suite: against a deployment
  // whose order log cannot be read, `/health` degraded honestly while this
  // route threw — so the person who had just paid got an unhandled 500.
  //
  // The 202 "still being recorded" page would be worse than the 500, not
  // better: it asserts the order is on its way, and an unreadable log is
  // exactly the state in which nobody knows that.
  class Unreadable implements LogStorage {
    readonly location = 'a store that cannot be read';
    read(): never { throw new Error('storage is gone'); }
    append(): never { throw new Error('storage is gone'); }
    truncate(): never { throw new Error('storage is gone'); }
    withLock<R>(work: () => R): R { return work(); }
  }
  const o = options({ stores: { ...stores(), orders: new OrderStore(new Unreadable()) } });

  const response = await handleRequest(
    o,
    new Request(`https://olibana.test${CONFIRMATION_PATH}?ref=EVT_whatever`),
  );
  const body = await response!.text();

  assert.equal(response?.status, 503, 'an unreadable order log reached the customer as a 500');
  assert.match(body, /cannot read the order records/);
  assert.ok(!/still being recorded/.test(body), 'it claimed the order was on its way');
  assert.ok(!/OLB-\d/.test(body), 'an order number appeared from a store that cannot be read');
});

test('a customer arriving before the webhook is told the truth, not shown an error', async () => {
  const o = signing();
  const reference = await checkedOut(o);
  const response = await handleRequest(
    o,
    new Request(`https://olibana.test${CONFIRMATION_PATH}?ref=${reference}`),
  );
  assert.equal(response?.status, 202);
  assert.match(await response!.text(), /Payment received/);
});

// --- the whole path ------------------------------------------------------

test('form post to paid order to confirmation, end to end, on real files', async () => {
  const o = signing();
  const reference = await checkedOut(o, { ...selection, quantity: '3' });

  const paid = await handleRequest(o, await signedWebhook({ reference, amountPaid: 216000 }));
  assert.equal(paid?.status, 200);

  const reloaded = new OrderStore(new FileStorage(o.stores.orders.path));
  const order = reloaded.placements()[0];
  assert.equal(order.items[0].quantity, 3);
  assert.equal(order.subtotalAmount, 216000);
  assert.equal(reloaded.status(order.orderId), 'PAID');
  assert.equal(reloaded.committedUnits('RUN_test'), 0, 'a paid order counted before being held');

  const confirmed = await handleRequest(
    o,
    new Request(`https://olibana.test${CONFIRMATION_PATH}?ref=${reference}`),
  );
  assert.equal(confirmed?.status, 200);
  assert.match(await confirmed!.text(), new RegExp(order.number));
});
