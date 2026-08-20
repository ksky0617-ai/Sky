import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_TRANSITIONS,
  ORDER_STATUSES,
  TERMINAL_STATUSES,
  applyTransition,
  isTerminal,
  isTransitionAllowed,
  transitionKey,
  type OrderStatus,
  type TransitionContext,
} from '../../src/order/state-machine.ts';

const req = (
  from: OrderStatus,
  to: OrderStatus,
  context?: TransitionContext,
  idempotencyKey = 'k1',
) => ({ orderId: 'ORD_test', from, to, actor: 'test', idempotencyKey, context });

/** Every edge in SPEC §3.2, expanded. */
const SPEC_EDGES: ReadonlyArray<readonly [OrderStatus, OrderStatus]> = [
  ['CREATED', 'PAID'],
  ['CREATED', 'PAYMENT_FAILED'],
  ['PAID', 'PREORDER_HELD'],
  ['PAID', 'CANCELLED'],
  ['PREORDER_HELD', 'PRODUCTION_PENDING'],
  ['PREORDER_HELD', 'UNDERSUBSCRIBED'],
  ['PREORDER_HELD', 'CANCELLED'],
  ['PRODUCTION_PENDING', 'IN_PRODUCTION'],
  ['PRODUCTION_PENDING', 'CANCELLED'],
  ['IN_PRODUCTION', 'QC'],
  ['IN_PRODUCTION', 'PRODUCTION_FAILED'],
  ['QC', 'PACKING'],
  ['QC', 'PRODUCTION_FAILED'],
  ['PRODUCTION_FAILED', 'IN_PRODUCTION'],
  ['PRODUCTION_FAILED', 'REFUNDED'],
  ['PACKING', 'SHIPPED'],
  ['SHIPPED', 'IN_TRANSIT'],
  ['IN_TRANSIT', 'DELIVERED'],
  ['UNDERSUBSCRIBED', 'REFUNDED'],
  ['CANCELLED', 'REFUNDED'],
];

test('spec conformance: every declared edge is allowed, and no others exist', () => {
  for (const [from, to] of SPEC_EDGES) {
    assert.ok(isTransitionAllowed(from, to), `spec edge missing: ${from} -> ${to}`);
  }
  const implemented = ORDER_STATUSES.flatMap((from) =>
    ALLOWED_TRANSITIONS[from].map((e) => `${from}->${e.to}`),
  ).sort();
  const declared = SPEC_EDGES.map(([f, t]) => `${f}->${t}`).sort();
  assert.deepEqual(implemented, declared, 'implementation and spec edge sets differ');
  assert.equal(implemented.length, 20, 'expected 20 directed edges');
});

test('every status has a transition entry', () => {
  for (const s of ORDER_STATUSES) {
    assert.ok(Array.isArray(ALLOWED_TRANSITIONS[s]), `no entry for ${s}`);
  }
  assert.equal(Object.keys(ALLOWED_TRANSITIONS).length, ORDER_STATUSES.length);
});

test('terminal states have no outgoing edges, and non-terminal states have at least one', () => {
  for (const s of ORDER_STATUSES) {
    if (TERMINAL_STATUSES.has(s)) {
      assert.equal(ALLOWED_TRANSITIONS[s].length, 0, `${s} is terminal but has edges`);
    } else {
      assert.ok(ALLOWED_TRANSITIONS[s].length > 0, `${s} is a dead end but not terminal`);
    }
  }
});

test('CANCELLED is not terminal — a cancelled order always holds customer money', () => {
  assert.equal(isTerminal('CANCELLED'), false);
  const r = applyTransition(req('CANCELLED', 'REFUNDED'));
  assert.equal(r.outcome, 'applied');
});

test('cancellation is impossible once fabric is cut', () => {
  for (const from of ['IN_PRODUCTION', 'QC', 'PACKING', 'SHIPPED', 'IN_TRANSIT'] as const) {
    const r = applyTransition(req(from, 'CANCELLED'));
    assert.equal(r.outcome, 'rejected', `${from} -> CANCELLED must be rejected`);
  }
});

test('forbidden transitions from SPEC §3.3 are rejected', () => {
  const forbidden: ReadonlyArray<readonly [OrderStatus, OrderStatus]> = [
    ['CREATED', 'PREORDER_HELD'],
    ['CREATED', 'IN_PRODUCTION'],
    ['CREATED', 'DELIVERED'],
    ['PREORDER_HELD', 'IN_PRODUCTION'],
    ['UNDERSUBSCRIBED', 'PRODUCTION_PENDING'],
    ['PACKING', 'DELIVERED'],
    ['SHIPPED', 'DELIVERED'],
    ['DELIVERED', 'IN_TRANSIT'],
    ['DELIVERED', 'REFUNDED'],
    ['REFUNDED', 'IN_PRODUCTION'],
    ['PAYMENT_FAILED', 'PAID'],
    ['QC', 'IN_PRODUCTION'],
  ];
  for (const [from, to] of forbidden) {
    const r = applyTransition(req(from, to));
    assert.equal(r.outcome, 'rejected', `${from} -> ${to} must be rejected`);
  }
});

test('rejections are recorded, never silently dropped', () => {
  const r = applyTransition(req('IN_PRODUCTION', 'CANCELLED'));
  assert.equal(r.outcome, 'rejected');
  if (r.outcome !== 'rejected') return;
  assert.equal(r.record.accepted, false);
  assert.ok(r.record.rejectionReason);
  assert.equal(r.record.orderId, 'ORD_test');
  assert.equal(r.record.actor, 'test');
  assert.ok(r.record.occurredAt instanceof Date);
  assert.equal(r.status, 'IN_PRODUCTION', 'state must not move on rejection');
});

test('undersubscription guard: run outcome follows committed vs minimum', () => {
  const reached = applyTransition(
    req('PREORDER_HELD', 'PRODUCTION_PENDING', { committedQuantity: 50, minimumQuantity: 30 }),
  );
  assert.equal(reached.outcome, 'applied');

  const short = applyTransition(
    req('PREORDER_HELD', 'PRODUCTION_PENDING', { committedQuantity: 12, minimumQuantity: 30 }),
  );
  assert.equal(short.outcome, 'rejected', 'must not produce below break-even');

  const under = applyTransition(
    req('PREORDER_HELD', 'UNDERSUBSCRIBED', { committedQuantity: 12, minimumQuantity: 30 }),
  );
  assert.equal(under.outcome, 'applied');

  const notUnder = applyTransition(
    req('PREORDER_HELD', 'UNDERSUBSCRIBED', { committedQuantity: 50, minimumQuantity: 30 }),
  );
  assert.equal(notUnder.outcome, 'rejected');
});

test('boundary: committed exactly equals minimum counts as reached', () => {
  const r = applyTransition(
    req('PREORDER_HELD', 'PRODUCTION_PENDING', { committedQuantity: 30, minimumQuantity: 30 }),
  );
  assert.equal(r.outcome, 'applied');
  const u = applyTransition(
    req('PREORDER_HELD', 'UNDERSUBSCRIBED', { committedQuantity: 30, minimumQuantity: 30 }),
  );
  assert.equal(u.outcome, 'rejected');
});

test('unknown run quantities block the decision rather than guessing it', () => {
  const r = applyTransition(req('PREORDER_HELD', 'PRODUCTION_PENDING', {}));
  assert.equal(r.outcome, 'rejected');
  if (r.outcome !== 'rejected') return;
  assert.match(r.record.rejectionReason ?? '', /unknown/i);
});

test('duplicate delivery is a no-op, not a second effect', () => {
  const first = applyTransition(req('CREATED', 'PAID'));
  assert.equal(first.outcome, 'applied');

  const applied = new Set([transitionKey(req('CREATED', 'PAID'))]);
  const second = applyTransition(req('CREATED', 'PAID'), applied);
  assert.equal(second.outcome, 'duplicate');
  assert.equal(second.status, 'PAID');
});

test('a different idempotency key is a different transition', () => {
  const applied = new Set([transitionKey(req('CREATED', 'PAID', undefined, 'k1'))]);
  const other = applyTransition(req('CREATED', 'PAID', undefined, 'k2'), applied);
  assert.equal(other.outcome, 'applied');
});

test('every non-terminal status is reachable from CREATED', () => {
  const seen = new Set<OrderStatus>(['CREATED']);
  const queue: OrderStatus[] = ['CREATED'];
  while (queue.length > 0) {
    const s = queue.shift() as OrderStatus;
    for (const edge of ALLOWED_TRANSITIONS[s]) {
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  const unreachable = ORDER_STATUSES.filter((s) => !seen.has(s));
  assert.deepEqual(unreachable, [], `unreachable states: ${unreachable.join(', ')}`);
});

test('happy path: a subscribed pre-order reaches DELIVERED', () => {
  const ctx = { committedQuantity: 40, minimumQuantity: 30 };
  const path: OrderStatus[] = [
    'CREATED', 'PAID', 'PREORDER_HELD', 'PRODUCTION_PENDING',
    'IN_PRODUCTION', 'QC', 'PACKING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED',
  ];
  let current = path[0] as OrderStatus;
  for (let i = 1; i < path.length; i += 1) {
    const next = path[i] as OrderStatus;
    const r = applyTransition(req(current, next, ctx, `k${i}`));
    assert.equal(r.outcome, 'applied', `${current} -> ${next} failed`);
    current = r.status;
  }
  assert.equal(current, 'DELIVERED');
  assert.ok(isTerminal(current));
});

test('undersubscribed path: refund is reachable and terminal', () => {
  const ctx = { committedQuantity: 5, minimumQuantity: 30 };
  const held = applyTransition(req('PAID', 'PREORDER_HELD', ctx, 'a'));
  assert.equal(held.outcome, 'applied');
  const under = applyTransition(req('PREORDER_HELD', 'UNDERSUBSCRIBED', ctx, 'b'));
  assert.equal(under.outcome, 'applied');
  const refunded = applyTransition(req('UNDERSUBSCRIBED', 'REFUNDED', ctx, 'c'));
  assert.equal(refunded.outcome, 'applied');
  assert.ok(isTerminal('REFUNDED'));
});
