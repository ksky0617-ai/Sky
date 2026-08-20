/**
 * Order state machine — pre-order model.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 3
 * ADR:  docs/adr/ADR-003-inventory-model.md (pre-order)
 *
 * This module is pure. It has no I/O, no persistence, and no dependencies.
 * Persistence and webhook handling sit above it and are not implemented yet.
 */

export type OrderStatus =
  | 'CREATED'
  | 'PAID'
  | 'PREORDER_HELD'
  | 'PRODUCTION_PENDING'
  | 'IN_PRODUCTION'
  | 'QC'
  | 'PACKING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'UNDERSUBSCRIBED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PAYMENT_FAILED'
  | 'PRODUCTION_FAILED';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'CREATED', 'PAID', 'PREORDER_HELD', 'PRODUCTION_PENDING', 'IN_PRODUCTION',
  'QC', 'PACKING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED',
  'UNDERSUBSCRIBED', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED', 'PRODUCTION_FAILED',
] as const;

/**
 * Terminal states have no outgoing transition.
 *
 * CANCELLED is deliberately NOT terminal. The spec diagram (§3.1) marks it
 * terminal while the transition table (§3.2) allows CANCELLED → REFUNDED.
 * The table governs: cancellation is only reachable from PAID, PREORDER_HELD
 * and PRODUCTION_PENDING, all of which are post-payment, so a cancelled order
 * always holds customer money. Treating it as terminal would strand funds.
 * Recorded in docs/adr/ADR-007-spec-conflict-cancelled-terminal.md.
 */
export const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'DELIVERED',
  'REFUNDED',
  'PAYMENT_FAILED',
]);

/** Context a guarded transition needs in order to be evaluated. */
export interface TransitionContext {
  /** Units committed to the pre-order run at close. */
  readonly committedQuantity?: number;
  /** Break-even quantity derived from the supplier quotation. */
  readonly minimumQuantity?: number;
}

type Guard = (ctx: TransitionContext) => { ok: true } | { ok: false; reason: string };

interface Edge {
  readonly to: OrderStatus;
  readonly guard?: Guard;
}

/**
 * Allowed transitions, transcribed from SPEC §3.2.
 * The table's final row lists three sources for CANCELLED; it is expanded here.
 * Total directed edges: 20.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly Edge[]>> = {
  CREATED: [{ to: 'PAID' }, { to: 'PAYMENT_FAILED' }],

  PAID: [{ to: 'PREORDER_HELD' }, { to: 'CANCELLED' }],

  PREORDER_HELD: [
    {
      to: 'PRODUCTION_PENDING',
      guard: (ctx) =>
        ctx.committedQuantity === undefined || ctx.minimumQuantity === undefined
          ? { ok: false, reason: 'run quantities unknown — cannot decide subscription' }
          : ctx.committedQuantity >= ctx.minimumQuantity
            ? { ok: true }
            : { ok: false, reason: 'committed < minimum — run is undersubscribed' },
    },
    {
      to: 'UNDERSUBSCRIBED',
      guard: (ctx) =>
        ctx.committedQuantity === undefined || ctx.minimumQuantity === undefined
          ? { ok: false, reason: 'run quantities unknown — cannot decide subscription' }
          : ctx.committedQuantity < ctx.minimumQuantity
            ? { ok: true }
            : { ok: false, reason: 'committed >= minimum — run reached its minimum' },
    },
    { to: 'CANCELLED' },
  ],

  PRODUCTION_PENDING: [{ to: 'IN_PRODUCTION' }, { to: 'CANCELLED' }],

  // No CANCELLED edge from here on: fabric is cut (SPEC §3.3).
  IN_PRODUCTION: [{ to: 'QC' }, { to: 'PRODUCTION_FAILED' }],
  QC: [{ to: 'PACKING' }, { to: 'PRODUCTION_FAILED' }],
  PRODUCTION_FAILED: [{ to: 'IN_PRODUCTION' }, { to: 'REFUNDED' }],
  PACKING: [{ to: 'SHIPPED' }],
  SHIPPED: [{ to: 'IN_TRANSIT' }],
  IN_TRANSIT: [{ to: 'DELIVERED' }],

  UNDERSUBSCRIBED: [{ to: 'REFUNDED' }],
  CANCELLED: [{ to: 'REFUNDED' }],

  DELIVERED: [],
  REFUNDED: [],
  PAYMENT_FAILED: [],
} as const;

export interface TransitionRequest {
  readonly orderId: string;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly actor: string;
  readonly reason?: string;
  readonly idempotencyKey: string;
  readonly context?: TransitionContext;
  readonly occurredAt?: Date;
}

export interface TransitionRecord {
  readonly orderId: string;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly actor: string;
  readonly reason?: string;
  readonly idempotencyKey: string;
  readonly occurredAt: Date;
  readonly accepted: boolean;
  /** Present when accepted === false. */
  readonly rejectionReason?: string;
}

export type TransitionResult =
  | { readonly outcome: 'applied'; readonly status: OrderStatus; readonly record: TransitionRecord }
  /** Duplicate delivery of a transition already applied. Not an error (SPEC §3.4). */
  | { readonly outcome: 'duplicate'; readonly status: OrderStatus }
  | { readonly outcome: 'rejected'; readonly status: OrderStatus; readonly record: TransitionRecord };

/** Pure predicate. Ignores guards — use `evaluateTransition` when context matters. */
export function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].some((edge) => edge.to === to);
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

function evaluateTransition(
  from: OrderStatus,
  to: OrderStatus,
  context: TransitionContext,
): { ok: true } | { ok: false; reason: string } {
  if (isTerminal(from)) {
    return { ok: false, reason: `${from} is terminal — no outgoing transition` };
  }
  const edge = ALLOWED_TRANSITIONS[from].find((e) => e.to === to);
  if (!edge) {
    return { ok: false, reason: `transition ${from} -> ${to} is not permitted` };
  }
  return edge.guard ? edge.guard(context) : { ok: true };
}

/**
 * Applies a transition.
 *
 * Rejections are returned with a record rather than thrown: SPEC §3.4 requires
 * that a refused transition be recorded, not silently dropped.
 *
 * Idempotency is keyed on (orderId, from, to, idempotencyKey). A duplicate
 * webhook must be a no-op, never a second effect.
 */
export function applyTransition(
  request: TransitionRequest,
  appliedKeys: ReadonlySet<string> = new Set(),
): TransitionResult {
  const occurredAt = request.occurredAt ?? new Date();
  const key = transitionKey(request);

  if (appliedKeys.has(key)) {
    return { outcome: 'duplicate', status: request.to };
  }

  const verdict = evaluateTransition(request.from, request.to, request.context ?? {});

  const base = {
    orderId: request.orderId,
    from: request.from,
    to: request.to,
    actor: request.actor,
    reason: request.reason,
    idempotencyKey: request.idempotencyKey,
    occurredAt,
  };

  if (!verdict.ok) {
    return {
      outcome: 'rejected',
      status: request.from,
      record: { ...base, accepted: false, rejectionReason: verdict.reason },
    };
  }

  return {
    outcome: 'applied',
    status: request.to,
    record: { ...base, accepted: true },
  };
}

export function transitionKey(
  request: Pick<TransitionRequest, 'orderId' | 'from' | 'to' | 'idempotencyKey'>,
): string {
  return `${request.orderId}|${request.from}|${request.to}|${request.idempotencyKey}`;
}
