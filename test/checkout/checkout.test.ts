/**
 * The checkout boundary: everything up to the payment, and everything after it.
 *
 * The payment itself is not executed here and cannot be — no gateway is
 * configured, and configuring one is a Human Gate. What is verified is that the
 * two halves either side of it are correct, and that the unconfigured gateway
 * refuses instead of pretending.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { Catalog, variant, type ProductInput } from '../../src/catalog/catalog.ts';
import {
  beginCheckout,
  CheckoutUnavailable,
  completeCheckout,
  UnconfiguredGateway,
  type CheckoutIntent,
  type CheckoutStores,
  type CompletedCheckout,
} from '../../src/checkout/checkout.ts';
import { OrderRejected } from '../../src/order/placement.ts';
import { OrderStore } from '../../src/order/store.ts';
import { PreorderRunStore, type RunInput } from '../../src/preorder/run.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-checkout-'));
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

const begin = { productId: 'PRD_test', sku: 'OLB-CT-001-STN-M', quantity: 2, email: 'Ada@Example.test', idempotencyKey: 'chk_1' };

const paid = (intent: CheckoutIntent, overrides: Partial<CompletedCheckout> = {}): CompletedCheckout => ({
  idempotencyKey: intent.idempotencyKey,
  providerRef: 'ref_test_1',
  email: intent.email,
  shippingAddress: { line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP' },
  amountPaid: intent.totalAmount,
  currency: intent.currency,
  ...overrides,
});

// --- before the payment --------------------------------------------------

test('an intent carries the price, the run and the promise', () => {
  const intent = beginCheckout(stores(), begin);
  assert.equal(intent.unitPriceAmount, 72000);
  assert.equal(intent.totalAmount, 144000);
  assert.equal(intent.currency, 'JPY');
  assert.equal(intent.preorderRunId, 'RUN_test');
  assert.equal(intent.promisedShipBy, '2026-12-01T00:00:00.000Z');
  assert.equal(intent.email, 'ada@example.test');
});

test('beginning a checkout places no order and takes no money', () => {
  // An abandoned checkout must leave nothing behind. committedUnits counts
  // orders, so a phantom order would tell a run it can afford fabric.
  const s = stores();
  beginCheckout(s, begin);
  assert.equal(s.orders.placements().length, 0);
  assert.equal(s.orders.committedUnits('RUN_test'), 0);
});

test('an unsellable selection is refused before the customer is sent to pay', () => {
  // Discovering any of this after payment means refunding a mistake that was
  // visible beforehand.
  assert.throws(() => beginCheckout(stores({ product: product({ status: 'DRAFT' }) }), begin), OrderRejected);
  assert.throws(() => beginCheckout(stores({ open: false }), begin), OrderRejected);
  assert.throws(() => beginCheckout(stores(), { ...begin, sku: 'OLB-CT-001-STN-L' }), OrderRejected);
  assert.throws(() => beginCheckout(stores(), { ...begin, quantity: 0 }), OrderRejected);
  assert.throws(() => beginCheckout(stores(), { ...begin, idempotencyKey: '  ' }), OrderRejected);
});

test('no gateway is configured, and the unconfigured one says so', () => {
  const intent = beginCheckout(stores(), begin);
  assert.throws(
    () => new UnconfiguredGateway().createSession(intent),
    (e: unknown) => e instanceof CheckoutUnavailable && /legal entity/.test(String(e)),
  );
});

// --- after the payment ---------------------------------------------------

test('a completed payment places the order and marks it paid', () => {
  const s = stores();
  const intent = beginCheckout(s, begin);
  const { outcome, order } = completeCheckout(s, intent, paid(intent));

  assert.equal(outcome, 'placed');
  assert.equal(s.orders.status(order.orderId), 'PAID');
  assert.equal(order.items[0].quantity, 2);
  assert.equal(order.subtotalAmount, 144000);
  assert.equal(order.shippingAddress.city, 'Kyoto');
  assert.equal(order.promisedShipBy, '2026-12-01T00:00:00.000Z');
});

test('the address comes from the gateway, because hosted checkout collects it', () => {
  const s = stores();
  const intent = beginCheckout(s, begin);
  const { order } = completeCheckout(s, intent, paid(intent, {
    shippingAddress: { line1: '9 Other Road', city: 'Osaka', postalCode: '530-0001', country: 'JP' },
  }));
  assert.equal(order.shippingAddress.line1, '9 Other Road');
});

test('a redelivered payment does not become a second order or a second payment', () => {
  // Payment providers redeliver by design.
  const s = stores();
  const intent = beginCheckout(s, begin);
  const first = completeCheckout(s, intent, paid(intent));
  const second = completeCheckout(s, intent, paid(intent));

  assert.equal(second.outcome, 'duplicate');
  assert.equal(second.order.orderId, first.order.orderId);
  assert.equal(s.orders.placements().length, 1);
  assert.equal(s.orders.eventsFor(first.order.orderId).filter((e) => e.accepted).length, 1);
  assert.equal(s.orders.status(first.order.orderId), 'PAID');
});

test('a payment for the wrong amount is refused rather than reconciled', () => {
  // The money is real either way. This must reach a human, not be silently
  // matched to whatever arrived.
  const s = stores();
  const intent = beginCheckout(s, begin);
  assert.throws(
    () => completeCheckout(s, intent, paid(intent, { amountPaid: 1 })),
    (e: unknown) => e instanceof CheckoutUnavailable && /not the amount/.test(String(e)),
  );
  assert.throws(
    () => completeCheckout(s, intent, paid(intent, { currency: 'USD' })),
    CheckoutUnavailable,
  );
  assert.equal(s.orders.placements().length, 0, 'a mispaid order was recorded anyway');
});

test('a completion carrying someone else key is refused', () => {
  const s = stores();
  const intent = beginCheckout(s, begin);
  assert.throws(
    () => completeCheckout(s, intent, paid(intent, { idempotencyKey: 'chk_other' })),
    CheckoutUnavailable,
  );
  assert.equal(s.orders.placements().length, 0);
});

test('a paid order does not commit to the run until it is held', () => {
  // PAID is the customer's money arriving. PREORDER_HELD is the commitment to
  // produce. Conflating them would let an unheld payment pull a run over its
  // minimum.
  const s = stores();
  const intent = beginCheckout(s, begin);
  const { order } = completeCheckout(s, intent, paid(intent));
  assert.equal(s.orders.committedUnits('RUN_test'), 0);

  s.orders.append({
    orderId: order.orderId, to: 'PREORDER_HELD', actor: 'system', idempotencyKey: `${order.orderId}:held`,
  });
  assert.equal(s.orders.committedUnits('RUN_test'), 2);
});

test('the whole path survives a reload', () => {
  const s = stores();
  const intent = beginCheckout(s, begin);
  const { order } = completeCheckout(s, intent, paid(intent));

  const reloaded = new OrderStore(s.orders.path);
  assert.equal(reloaded.status(order.orderId), 'PAID');
  assert.deepEqual(reloaded.placement(order.orderId), order);
  assert.equal(reloaded.customerByEmail('ada@example.test')?.customerId, order.customer.customerId);
});

test('the order records the price the customer paid, not the price now', () => {
  // The catalogue can change between the customer being shown a price and the
  // gateway confirming their payment. What they agreed to is what they paid.
  const s = stores();
  const intent = beginCheckout(s, begin);
  const completed = paid(intent);

  s.catalog.record(product({
    variants: [variant('OLB-CT-001', 'STN', 'M', { amount: 99000, currency: 'JPY' })],
  }));

  const { order } = completeCheckout(s, intent, completed);
  assert.equal(order.items[0].unitPriceAmount, 72000, 'the order was written at a price nobody paid');
  assert.equal(
    order.subtotalAmount,
    completed.amountPaid,
    'the order total and the money received disagree',
  );
});
