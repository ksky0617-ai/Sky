/**
 * Placing an order — the first point at which a customer can affect the system,
 * and therefore the first at which it can be wrong about money.
 *
 * Every store here is a real file. The catalogue, the run log and the order log
 * are the same three files the site build reads.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { Catalog, variant, type ProductInput } from '../../src/catalog/catalog.ts';
import { isId, parseOrderNumber } from '../../src/identity/ids.ts';
import { OrderRejected, placeOrder, type PlacementRequest } from '../../src/order/placement.ts';
import { OrderStore } from '../../src/order/store.ts';
import { PreorderRunStore, type RunInput } from '../../src/preorder/run.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-place-'));
let n = 0;

test.after(() => rmSync(dir, { recursive: true, force: true }));

const product = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  productId: 'PRD_test',
  code: 'OLB-CT-001',
  name: 'Test Coat',
  category: 'CT',
  status: 'PUBLISHED',
  summary: 'A fixture, not a product.',
  variants: [
    variant('OLB-CT-001', 'STN', 'S', { amount: 68000, currency: 'JPY' }),
    variant('OLB-CT-001', 'STN', 'M', { amount: 72000, currency: 'JPY' }),
  ],
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

interface Stores {
  catalog: Catalog;
  runs: PreorderRunStore;
  orders: OrderStore;
}

function stores(options: { product?: ProductInput; run?: Partial<RunInput> | null } = {}): Stores {
  const id = n++;
  const catalog = new Catalog(new FileStorage(resolve(dir, `cat-${id}.jsonl`)));
  catalog.record(options.product ?? product());

  const runs = new PreorderRunStore(new FileStorage(resolve(dir, `runs-${id}.jsonl`)));
  if (options.run !== null) {
    runs.record(runInput(options.run));
    runs.record(runInput({ ...options.run, status: 'OPEN' }));
  }

  return { catalog, runs, orders: new OrderStore(new FileStorage(resolve(dir, `orders-${id}.jsonl`))) };
}

/** The same month as `sample`, at a chosen sequence. */
function seededNumber(sample: string, sequence: number): string {
  return `${sample.slice(0, sample.lastIndexOf('-') + 1)}${String(sequence).padStart(4, '0')}`;
}

const request = (overrides: Partial<PlacementRequest> = {}): PlacementRequest => ({
  email: 'ada@example.test',
  name: 'Ada',
  productId: 'PRD_test',
  sku: 'OLB-CT-001-STN-M',
  quantity: 1,
  shippingAddress: { line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP' },
  idempotencyKey: 'key-1',
  reference: `ref-${Math.random().toString(36).slice(2)}`,
  ...overrides,
});

test('an order is placed, numbered, and persisted', () => {
  const s = stores();
  const { outcome, order } = placeOrder(s, request());

  assert.equal(outcome, 'placed');
  assert.ok(isId('order', order.orderId));
  assert.ok(parseOrderNumber(order.number) !== null, `${order.number} is not an order number`);
  assert.equal(order.preorderRunId, 'RUN_test');

  const reloaded = new OrderStore(new FileStorage(s.orders.path));
  assert.deepEqual(reloaded.placement(order.orderId), order);
});

test('a placed order starts at CREATED — placement is not payment', () => {
  const s = stores();
  const { order } = placeOrder(s, request());
  assert.equal(s.orders.status(order.orderId), 'CREATED');
  assert.equal(s.orders.eventsFor(order.orderId).length, 0);
});

test('the price is copied from the catalogue, not referenced', () => {
  // SPEC Part 2.2: referencing would let a later price change rewrite what a
  // past customer was charged.
  const s = stores();
  const { order } = placeOrder(s, request({ quantity: 2 }));
  assert.equal(order.items[0].unitPriceAmount, 72000);
  assert.equal(order.subtotalAmount, 144000);

  s.catalog.record(product({
    variants: [
      variant('OLB-CT-001', 'STN', 'S', { amount: 68000, currency: 'JPY' }),
      variant('OLB-CT-001', 'STN', 'M', { amount: 99000, currency: 'JPY' }),
    ],
  }));

  const stored = new OrderStore(new FileStorage(s.orders.path)).placement(order.orderId);
  assert.equal(stored?.items[0].unitPriceAmount, 72000, 'a past order was repriced');
  assert.equal(stored?.subtotalAmount, 144000);
});

test('the SKU is snapshotted alongside the price', () => {
  const s = stores();
  const { order } = placeOrder(s, request());
  assert.equal(order.items[0].sku, 'OLB-CT-001-STN-M');
  assert.equal(order.items[0].size, 'M');
  assert.equal(order.items[0].colour, 'STN');
});

test('the promised ship date is copied, so changing the run cannot move it', () => {
  const s = stores();
  const { order } = placeOrder(s, request());
  assert.equal(order.promisedShipBy, '2026-12-01T00:00:00.000Z');

  // The run's terms are frozen while open, so the only way it moves is a new
  // run after this one closes. The promise made to this customer must not.
  s.runs.record(runInput({ status: 'CLOSED_UNDERSUBSCRIBED' }));
  assert.equal(
    new OrderStore(new FileStorage(s.orders.path)).placement(order.orderId)?.promisedShipBy,
    '2026-12-01T00:00:00.000Z',
  );
});

test('the same idempotency key returns the same order, and writes nothing', () => {
  const s = stores();
  const first = placeOrder(s, request());
  const second = placeOrder(s, request());

  assert.equal(second.outcome, 'duplicate');
  assert.equal(second.order.orderId, first.order.orderId);
  assert.equal(s.orders.placements().length, 1, 'a resubmitted form became a second order');
});

test('a different key from the same customer is a second order', () => {
  const s = stores();
  placeOrder(s, request({ idempotencyKey: 'key-1' }));
  placeOrder(s, request({ idempotencyKey: 'key-2' }));
  assert.equal(s.orders.placements().length, 2);
});

test('order numbers run in sequence without repeating', () => {
  const s = stores();
  const numbers = ['a', 'b', 'c'].map(
    (k) => placeOrder(s, request({ idempotencyKey: k })).order.number,
  );
  assert.equal(new Set(numbers).size, 3, 'two orders share a customer-facing number');
  const sequences = numbers.map((num) => parseOrderNumber(num)?.sequence);
  assert.deepEqual(sequences, [1, 2, 3]);
});

test('an order number already in the log is never reissued', () => {
  // Continuing from the highest number used, rather than counting records, is
  // what makes this hold. A log can arrive with numbers already in it — from a
  // restore, or from any other writer — and a count would hand the next
  // customer one that is already on someone's receipt.
  const s = stores();
  const first = placeOrder(s, request({ idempotencyKey: 'a' })).order;
  s.orders.recordPlacement(() => ({
    record: { ...first, eventId: 'EVT_seed', orderId: 'ORD_seed', idempotencyKey: 'seed', number: seededNumber(first.number, 9) },
    result: null,
  }));

  const next = placeOrder(s, request({ idempotencyKey: 'b' })).order;
  assert.equal(parseOrderNumber(next.number)?.sequence, 10, 'a used order number was reissued');
});

test('one email is one customer, however many orders they place', () => {
  const s = stores();
  const first = placeOrder(s, request({ idempotencyKey: 'a' })).order;
  const second = placeOrder(s, request({ idempotencyKey: 'b', email: 'ADA@Example.test  ' })).order;

  assert.equal(second.customer.customerId, first.customer.customerId, 'one person became two');
  assert.equal(s.orders.customers().length, 1);
  assert.equal(s.orders.customerByEmail('ada@example.test')?.customerId, first.customer.customerId);
});

test('a customer id is not guessable from another customer id', () => {
  // SPEC Part 4: customers use UUIDv4, not the sortable id used internally.
  // A sortable customer id is an enumerable customer list.
  const s = stores();
  const a = placeOrder(s, request({ idempotencyKey: 'a', email: 'a@example.test' })).order;
  const b = placeOrder(s, request({ idempotencyKey: 'b', email: 'b@example.test' })).order;
  for (const id of [a.customer.customerId, b.customer.customerId]) {
    assert.match(id, /^CUS_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
  assert.notEqual(a.customer.customerId, b.customer.customerId);
});

// --- refusals ------------------------------------------------------------

test('an unpublished product cannot be ordered', () => {
  // The variants and their prices are left intact, so the only thing that can
  // refuse this order is the status. An earlier version of this test used a
  // product with no variants and passed for the wrong reason.
  const s = stores({ product: product({ status: 'DRAFT' }) });
  assert.throws(
    () => placeOrder(s, request()),
    (e: unknown) => e instanceof OrderRejected && /DRAFT, not published/.test(String(e)),
  );
  assert.equal(s.orders.placements().length, 0);
});

test('a SKU that is not on the product cannot be ordered', () => {
  const s = stores();
  assert.throws(() => placeOrder(s, request({ sku: 'OLB-CT-001-STN-L' })), OrderRejected);
});

test('a product with no open run cannot be ordered', () => {
  // Without a run there is no window to promise, so nothing may be taken.
  const s = stores({ run: null });
  assert.throws(
    () => placeOrder(s, request()),
    (e: unknown) => e instanceof OrderRejected && /no open pre-order run/.test(String(e)),
  );
  assert.equal(s.orders.placements().length, 0);
});

test('a closed run cannot take orders', () => {
  const s = stores();
  s.runs.record(runInput({ status: 'CLOSED_UNDERSUBSCRIBED' }));
  assert.throws(() => placeOrder(s, request()), OrderRejected);
});

test('quantity must be a positive whole number of garments', () => {
  const s = stores();
  for (const quantity of [0, -1, 1.5]) {
    assert.throws(() => placeOrder(s, request({ quantity })), OrderRejected);
  }
  assert.equal(s.orders.placements().length, 0);
});

test('an address that cannot be delivered to is refused at the door', () => {
  // A pre-order ships months later. An unusable address fails long after the
  // customer could have fixed it.
  const s = stores();
  assert.throws(
    () => placeOrder(s, request({ shippingAddress: { line1: '1 Test Street' } })),
    (e: unknown) => e instanceof OrderRejected && /city, postalCode, country/.test(String(e)),
  );
});

test('an unusable email is refused', () => {
  const s = stores();
  for (const email of ['', 'ada', 'ada@', '@example.test', 'a b@example.test']) {
    assert.throws(() => placeOrder(s, request({ email })), OrderRejected);
  }
});

test('an order with no reference is refused', () => {
  // Without one the customer cannot reach their confirmation, and an empty
  // reference would match any lookup that also had nothing to go on.
  const s = stores();
  for (const reference of ['', '  ']) {
    assert.throws(() => placeOrder(s, request({ reference })), OrderRejected);
  }
  assert.equal(s.orders.placements().length, 0);
  assert.equal(s.orders.placementByReference(''), null);
});

test('a refused order leaves nothing behind', () => {
  const s = stores();
  assert.throws(() => placeOrder(s, request({ quantity: 0 })), OrderRejected);
  assert.equal(s.orders.placements().length, 0);
  assert.equal(s.orders.customers().length, 0);
  assert.equal(s.orders.orderIds().length, 0);
});

// --- the shape of what is stored ----------------------------------------

test('the total says what it includes, and does not invent a shipping price', () => {
  // Shipping and duty are unresolved (R-06, R-07). A zero would read as free.
  const s = stores();
  const { order } = placeOrder(s, request({ quantity: 2 }));
  assert.equal(order.subtotalAmount, 144000);
  assert.equal(order.totalAmount, order.subtotalAmount);
  assert.equal(order.currency, 'JPY');
});

test('the order log holds placements and transitions without confusing them', () => {
  const s = stores();
  const { order } = placeOrder(s, request());
  s.orders.append({
    orderId: order.orderId, to: 'PAID', actor: 'stripe', idempotencyKey: 'paid-1',
  });

  const reloaded = new OrderStore(new FileStorage(s.orders.path));
  assert.equal(reloaded.placements().length, 1);
  assert.equal(reloaded.events().length, 1);
  assert.equal(reloaded.status(order.orderId), 'PAID');
  assert.equal(reloaded.orderIds().length, 1, 'one order was counted twice');
});

test('an order that was never paid does not count toward a run', () => {
  const s = stores();
  placeOrder(s, request({ quantity: 5 }));
  assert.equal(
    s.orders.committedUnits('RUN_test'),
    0,
    'an unpaid order was counted as a commitment to produce',
  );
});
