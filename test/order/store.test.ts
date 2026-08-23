import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { LogCorruptError, INITIAL_STATUS, OrderStore } from '../../src/order/store.ts';
import { isId } from '../../src/identity/ids.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-store-'));
let n = 0;
const freshStore = (): OrderStore => new OrderStore(new FileStorage(resolve(dir, `log-${n++}.jsonl`)));
const reached = { committedQuantity: 40, minimumQuantity: 30 };

test.after(() => rmSync(dir, { recursive: true, force: true }));

test('an empty store reports the initial status and no events', () => {
  const store = freshStore();
  assert.deepEqual(store.events(), []);
  assert.deepEqual(store.orderIds(), []);
  assert.equal(store.status('ORD_missing'), INITIAL_STATUS);
});

test('create → persist → read → RELOAD → the state is identical', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_a', to: 'PAID', actor: 'stripe', idempotencyKey: 'evt_1' });
  store.append({ orderId: 'ORD_a', to: 'PREORDER_HELD', actor: 'system', idempotencyKey: 'auto_1' });
  assert.equal(store.status('ORD_a'), 'PREORDER_HELD');

  // A different instance over the same file — this is the reload.
  const reloaded = new OrderStore(new FileStorage(store.path));
  assert.equal(reloaded.status('ORD_a'), 'PREORDER_HELD');
  assert.deepEqual(reloaded.events(), store.events());
});

test('status is derived from the log, never stored as a mutable field', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_b', to: 'PAID', actor: 'stripe', idempotencyKey: 'k' });
  const raw = readFileSync(store.path, 'utf8');
  assert.ok(!/"status"/.test(raw), 'a stored status field would be a second encoding of the log');
  assert.equal(store.status('ORD_b'), 'PAID');
});

test('the log is append-only: earlier lines never change', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_c', to: 'PAID', actor: 'stripe', idempotencyKey: '1' });
  const afterFirst = readFileSync(store.path, 'utf8');

  store.append({ orderId: 'ORD_c', to: 'PREORDER_HELD', actor: 'system', idempotencyKey: '2' });
  const afterSecond = readFileSync(store.path, 'utf8');

  assert.ok(afterSecond.startsWith(afterFirst), 'existing bytes were rewritten');
  assert.ok(afterSecond.length > afterFirst.length);
  assert.equal(store.events().length, 2);
});

test('the store exposes no way to mutate or delete a record', () => {
  const store = freshStore();
  const surface = new Set([
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(store)),
    ...Object.getOwnPropertyNames(store),
  ]);
  for (const forbidden of ['update', 'delete', 'remove', 'set', 'patch', 'truncate', 'clear']) {
    assert.ok(!surface.has(forbidden), `store exposes ${forbidden}()`);
  }
});

test('a redelivered webhook is a no-op that writes nothing', () => {
  const store = freshStore();
  const req = { orderId: 'ORD_d', to: 'PAID' as const, actor: 'stripe', idempotencyKey: 'evt_dup' };

  const first = store.append(req);
  assert.equal(first.outcome, 'applied');
  const bytesAfterFirst = readFileSync(store.path, 'utf8').length;

  const second = store.append(req);
  assert.equal(second.outcome, 'duplicate');
  assert.equal(readFileSync(store.path, 'utf8').length, bytesAfterFirst, 'a duplicate wrote a line');
  assert.equal(store.events().length, 1);
  assert.equal(second.event.eventId, first.event.eventId, 'the original record is returned');
});

test('idempotency survives a process restart — the in-memory version could not', () => {
  const store = freshStore();
  const req = { orderId: 'ORD_e', to: 'PAID' as const, actor: 'stripe', idempotencyKey: 'evt_restart' };
  store.append(req);

  // A brand-new instance holds no memory of the first call.
  const afterRestart = new OrderStore(new FileStorage(store.path));
  assert.equal(afterRestart.append(req).outcome, 'duplicate');
  assert.equal(afterRestart.events().length, 1);
});

test('a different idempotency key is a different delivery, judged on its own merits', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_f', to: 'PAID', actor: 'stripe', idempotencyKey: 'a' });
  // Key 'b' is not a redelivery, so it reaches the state machine — where
  // PAID -> PAID is not a permitted transition and is refused.
  const second = store.append({ orderId: 'ORD_f', to: 'PAID', actor: 'stripe', idempotencyKey: 'b' });
  assert.equal(second.outcome, 'rejected');
  assert.match(second.event.rejectionReason ?? '', /not permitted/);
  assert.equal(store.status('ORD_f'), 'PAID');
});

test('one idempotency key cannot authorise two different transitions', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_k', to: 'PAID', actor: 'stripe', idempotencyKey: 'shared' });
  const reused = store.append({ orderId: 'ORD_k', to: 'PREORDER_HELD', actor: 'system', idempotencyKey: 'shared' });
  assert.equal(reused.outcome, 'rejected');
  assert.match(reused.event.rejectionReason ?? '', /already used for/);
  assert.equal(store.status('ORD_k'), 'PAID', 'the reused key must not advance the order');
});

test('redelivery is detected however far the order has since moved', () => {
  // The defect this replaced: keying on the CURRENT from-status meant that
  // once an order advanced, the original delivery could never be matched and
  // a redelivered webhook was processed a second time.
  const store = freshStore();
  store.append({ orderId: 'ORD_far', to: 'PAID', actor: 'stripe', idempotencyKey: 'evt_pay' });
  store.append({ orderId: 'ORD_far', to: 'PREORDER_HELD', actor: 'system', idempotencyKey: 'auto' });
  store.append({ orderId: 'ORD_far', to: 'PRODUCTION_PENDING', actor: 'system', idempotencyKey: 'close', context: reached });

  const late = store.append({ orderId: 'ORD_far', to: 'PAID', actor: 'stripe', idempotencyKey: 'evt_pay' });
  assert.equal(late.outcome, 'duplicate', 'a late redelivery must still be a no-op');
  assert.equal(store.status('ORD_far'), 'PRODUCTION_PENDING', 'state must not regress');
  assert.equal(store.eventsFor('ORD_far').length, 3, 'nothing was written');
});

test('an invalid transition is rejected AND recorded — never silently dropped', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_g', to: 'PAID', actor: 'stripe', idempotencyKey: '1' });

  const bad = store.append({ orderId: 'ORD_g', to: 'DELIVERED', actor: 'operator:me', idempotencyKey: '2' });
  assert.equal(bad.outcome, 'rejected');
  assert.equal(bad.event.accepted, false);
  assert.ok(bad.event.rejectionReason);

  assert.equal(store.status('ORD_g'), 'PAID', 'a rejected transition must not move the state');
  assert.equal(store.eventsFor('ORD_g').length, 2, 'the attempt must be in the log');
  assert.equal(store.eventsFor('ORD_g').filter((e) => !e.accepted).length, 1);
});

test('rejected events do not participate in state derivation', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_h', to: 'PAID', actor: 'x', idempotencyKey: '1' });
  store.append({ orderId: 'ORD_h', to: 'SHIPPED', actor: 'x', idempotencyKey: '2' }); // rejected
  store.append({ orderId: 'ORD_h', to: 'PREORDER_HELD', actor: 'x', idempotencyKey: '3' });
  assert.equal(store.status('ORD_h'), 'PREORDER_HELD');
});

test('a full pre-order lifecycle persists and replays to DELIVERED', () => {
  const store = freshStore();
  const steps: Array<[string, Record<string, unknown>?]> = [
    ['PAID'], ['PREORDER_HELD'], ['PRODUCTION_PENDING', reached], ['IN_PRODUCTION'],
    ['QC'], ['PACKING'], ['SHIPPED'], ['IN_TRANSIT'], ['DELIVERED'],
  ];
  steps.forEach(([to, context], i) => {
    const r = store.append({
      orderId: 'ORD_life', to: to as never, actor: 'system',
      idempotencyKey: `s${i}`, context: context as never,
    });
    assert.equal(r.outcome, 'applied', `${to} failed`);
  });
  assert.equal(store.status('ORD_life'), 'DELIVERED');
  assert.equal(new OrderStore(new FileStorage(store.path)).status('ORD_life'), 'DELIVERED');
});

test('the undersubscribed branch persists to REFUNDED', () => {
  const store = freshStore();
  const short = { committedQuantity: 5, minimumQuantity: 30 };
  store.append({ orderId: 'ORD_u', to: 'PAID', actor: 'stripe', idempotencyKey: '1' });
  store.append({ orderId: 'ORD_u', to: 'PREORDER_HELD', actor: 'system', idempotencyKey: '2' });
  const blocked = store.append({ orderId: 'ORD_u', to: 'PRODUCTION_PENDING', actor: 'system', idempotencyKey: '3', context: short });
  assert.equal(blocked.outcome, 'rejected', 'must not produce below break-even');
  store.append({ orderId: 'ORD_u', to: 'UNDERSUBSCRIBED', actor: 'system', idempotencyKey: '4', context: short });
  store.append({ orderId: 'ORD_u', to: 'REFUNDED', actor: 'system', idempotencyKey: '5' });
  assert.equal(new OrderStore(new FileStorage(store.path)).status('ORD_u'), 'REFUNDED');
});

test('orders are isolated from one another', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_x', to: 'PAID', actor: 'a', idempotencyKey: '1' });
  store.append({ orderId: 'ORD_y', to: 'PAID', actor: 'a', idempotencyKey: '1' }); // same key, other order
  store.append({ orderId: 'ORD_x', to: 'PREORDER_HELD', actor: 'a', idempotencyKey: '2' });
  assert.equal(store.status('ORD_x'), 'PREORDER_HELD');
  assert.equal(store.status('ORD_y'), 'PAID');
  assert.deepEqual([...store.orderIds()].sort(), ['ORD_x', 'ORD_y']);
});

test('every event carries a unique, well-formed id', () => {
  const store = freshStore();
  for (let i = 0; i < 50; i += 1) {
    store.append({ orderId: `ORD_${i}`, to: 'PAID', actor: 'a', idempotencyKey: 'k' });
  }
  const ids = store.events().map((e) => e.eventId);
  assert.equal(new Set(ids).size, 50, 'event id collision');
  for (const id of ids) assert.ok(isId('event', id), `malformed event id: ${id}`);
});

test('traceability fields round-trip, and absent ones stay absent', () => {
  const store = freshStore();
  store.append({
    orderId: 'ORD_t', to: 'PAID', actor: 'stripe', idempotencyKey: '1',
    sessionId: 'sess_1', signalId: 'pin_42', reason: 'checkout completed',
  });
  const [event] = new OrderStore(new FileStorage(store.path)).eventsFor('ORD_t');
  assert.equal(event?.sessionId, 'sess_1');
  assert.equal(event?.signalId, 'pin_42');
  assert.equal(event?.reason, 'checkout completed');

  store.append({ orderId: 'ORD_t2', to: 'PAID', actor: 'stripe', idempotencyKey: '1' });
  const [plain] = store.eventsFor('ORD_t2');
  assert.ok(!('sessionId' in (plain as object)), 'absent field was written as undefined');
});

test('replay is deterministic — reading twice yields identical events', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_r', to: 'PAID', actor: 'a', idempotencyKey: '1' });
  store.append({ orderId: 'ORD_r', to: 'PREORDER_HELD', actor: 'a', idempotencyKey: '2' });
  assert.deepEqual(store.events(), store.events());
  assert.deepEqual(new OrderStore(new FileStorage(store.path)).events(), store.events());
});

test('a corrupt line fails loudly rather than losing history silently', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_z', to: 'PAID', actor: 'a', idempotencyKey: '1' });
  writeFileSync(store.path, `${readFileSync(store.path, 'utf8')}{not json}\n`, 'utf8');
  assert.throws(() => store.events(), LogCorruptError);
});

test('blank lines are tolerated; they carry no record', () => {
  const store = freshStore();
  store.append({ orderId: 'ORD_bl', to: 'PAID', actor: 'a', idempotencyKey: '1' });
  writeFileSync(store.path, `${readFileSync(store.path, 'utf8')}\n\n`, 'utf8');
  assert.equal(store.events().length, 1);
});
