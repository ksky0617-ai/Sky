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
  CHECKOUT_PATH,
  handleRequest,
  submissionKey,
  UnconfiguredVerifier,
  WEBHOOK_PATH,
  type RouterOptions,
  type WebhookVerifier,
} from '../../src/http/router.ts';
import { OrderStore } from '../../src/order/store.ts';
import { PreorderRunStore, type RunInput } from '../../src/preorder/run.ts';

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
  const catalog = new Catalog(resolve(dir, `cat-${id}.jsonl`));
  catalog.record(options.product ?? product());
  const runs = new PreorderRunStore(resolve(dir, `runs-${id}.jsonl`));
  runs.record(runInput());
  if (options.open !== false) runs.record(runInput({ status: 'OPEN' }));
  return { catalog, runs, orders: new OrderStore(resolve(dir, `orders-${id}.jsonl`)) };
}

/** A gateway that records what it was asked to charge, and charges nothing. */
class RecordingGateway implements PaymentGateway {
  readonly seen: CheckoutIntent[] = [];
  createSession(intent: CheckoutIntent): { url: string } {
    this.seen.push(intent);
    return { url: `https://gateway.test/session/${encodeURIComponent(intent.idempotencyKey)}` };
  }
}

/**
 * A verifier that accepts a body it can parse. Stands in for a signature
 * check — what it proves here is that everything downstream of verification is
 * correct, not that any signature was ever validated.
 */
class TestVerifier implements WebhookVerifier {
  readonly #source: CheckoutStores;
  constructor(source: CheckoutStores) { this.#source = source; }
  verify(body: string): { intent: CheckoutIntent; completed: CompletedCheckout } | null {
    const parsed = JSON.parse(body) as { begin: Parameters<typeof beginCheckout>[1]; completed: Partial<CompletedCheckout> };
    const intent = beginCheckout(this.#source, parsed.begin);
    return {
      intent,
      completed: {
        idempotencyKey: intent.idempotencyKey,
        providerRef: 'ref_1',
        email: intent.email,
        shippingAddress: { line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP' },
        amountPaid: intent.totalAmount,
        currency: intent.currency,
        ...parsed.completed,
      },
    };
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
  const response = await handleRequest(options(), new Request(`https://olibana.test${WEBHOOK_PATH}`));
  assert.equal(response?.status, 405);
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

// --- the webhook ---------------------------------------------------------

const webhook = (body: unknown): Request =>
  new Request(`https://olibana.test${WEBHOOK_PATH}`, { method: 'POST', body: JSON.stringify(body) });

test('an unverified webhook is refused before anything downstream reads it', async () => {
  // Everything after verification is trusted: the amount, the address, the key.
  const s = stores();
  const response = await handleRequest(
    options({ stores: s }),
    webhook({ begin: { ...selection, quantity: 1, idempotencyKey: 'k' }, completed: {} }),
  );
  assert.equal(response?.status, 400);
  assert.equal(await response!.text(), 'unverified');
  assert.equal(s.orders.placements().length, 0, 'an unverified payload created an order');
});

test('a verified payment places the order and marks it paid', async () => {
  const s = stores();
  const response = await handleRequest(
    options({ stores: s, verifier: new TestVerifier(s) }),
    webhook({ begin: { ...selection, quantity: 1, idempotencyKey: submissionKey(new URLSearchParams(selection)) }, completed: {} }),
  );

  assert.equal(response?.status, 200);
  assert.match(await response!.text(), /^placed OLB-/);
  const order = s.orders.placements()[0];
  assert.equal(s.orders.status(order.orderId), 'PAID');
  assert.equal(order.customer.email, 'ada@example.test');
});

test('a redelivered webhook answers 200 and creates nothing further', async () => {
  // A provider that receives an error redelivers. Redelivering something we
  // recorded is noise; redelivering something we failed to record is the point.
  const s = stores();
  const o = options({ stores: s, verifier: new TestVerifier(s) });
  const body = { begin: { ...selection, quantity: 1, idempotencyKey: submissionKey(new URLSearchParams(selection)) }, completed: {} };

  await handleRequest(o, webhook(body));
  const second = await handleRequest(o, webhook(body));

  assert.equal(second?.status, 200);
  assert.match(await second!.text(), /^duplicate OLB-/);
  assert.equal(s.orders.placements().length, 1);
});

test('a payment for the wrong amount is refused with a status that stops retries', async () => {
  const s = stores();
  const response = await handleRequest(
    options({ stores: s, verifier: new TestVerifier(s) }),
    webhook({
      begin: { ...selection, quantity: 1, idempotencyKey: 'k' },
      completed: { amountPaid: 1 },
    }),
  );
  assert.equal(response?.status, 422, 'a mismatched payment was answered with a retryable status');
  assert.match(await response!.text(), /refused:/);
  assert.equal(s.orders.placements().length, 0);
});

// --- the whole path ------------------------------------------------------

test('form post to paid order, end to end, on real files', async () => {
  const s = stores();
  const gateway = new RecordingGateway();
  const o = options({ stores: s, gateway, verifier: new TestVerifier(s) });

  const redirect = await handleRequest(o, form({ ...selection, quantity: '3' }));
  assert.equal(redirect?.status, 303);

  const intent = gateway.seen[0];
  const paid = await handleRequest(o, webhook({
    begin: { productId: intent.productId, sku: intent.sku, quantity: intent.quantity, email: intent.email, idempotencyKey: intent.idempotencyKey },
    completed: {},
  }));
  assert.equal(paid?.status, 200);

  const reloaded = new OrderStore(s.orders.path);
  const order = reloaded.placements()[0];
  assert.equal(order.items[0].quantity, 3);
  assert.equal(order.subtotalAmount, 216000);
  assert.equal(reloaded.status(order.orderId), 'PAID');
  assert.equal(reloaded.committedUnits('RUN_test'), 0, 'a paid order counted before being held');
});
