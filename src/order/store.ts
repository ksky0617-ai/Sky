/**
 * Append-only order store.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 2 (Event entity),
 *       Part 3 §3.4 (idempotency; rejected transitions must be recorded),
 *       Part 4 (identifiers)
 * SSOT v2.0 §9 — persistence integrity: create → persist → read → reload →
 *       state consistency, with id uniqueness, transition integrity,
 *       append-only records, duplicate prevention and replay safety.
 *
 * Design consequences of those rules:
 *
 *  - The log is the state. Order status is DERIVED by replaying events, never
 *    stored as a mutable field, so there is no second encoding that can drift
 *    from the history (the defect removed from the state machine in ADR-007's
 *    cycle, applied here before it can appear).
 *
 *  - Idempotency is enforced BY THE STORE against its own history, not by a
 *    caller-supplied key set. The previous in-memory proof was recorded as a
 *    standing limitation in VERIFICATION_LOG.md; this closes it.
 *
 *  - Rejected transitions are appended too. §3.4 requires a refused transition
 *    to be recorded rather than dropped, so the log holds what was attempted,
 *    not only what succeeded.
 *
 *  - Nothing is ever mutated or deleted. There is no update and no delete
 *    method, and none can be added without changing this file's contract.
 *
 * Storage is JSON Lines on the filesystem: one dependency-free file per store,
 * readable by any tool, and portable to any host. Mutual exclusion between
 * processes and tolerance of a crash mid-write both live in
 * src/persistence/append-log.ts, which this store and the product catalogue
 * share — the two had the same defects, so they have one fix.
 */

import { AppendLog, LogCorruptError } from '../persistence/append-log.ts';
import { newId } from '../identity/ids.ts';
import {
  applyTransition,
  type OrderStatus,
  type TransitionContext,
  type TransitionRecord,
} from './state-machine.ts';

/** One line of the log. Immutable once written. */
export interface OrderEvent {
  readonly eventId: string;
  readonly orderId: string;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly actor: string;
  readonly reason?: string;
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly accepted: boolean;
  readonly rejectionReason?: string;
  /**
   * The pre-order run this order commits to — SPEC Part 2.2, `Order.preorder_run_id`.
   * Absent for orders that are not pre-orders.
   */
  readonly preorderRunId?: string;
  /**
   * Units this order commits. SPEC puts quantity on OrderItem; until that
   * entity exists this event is its ONLY encoding, so there is nothing here to
   * drift from. When OrderItem lands, this derivation moves there and this
   * field must stop being read — two places holding one quantity is exactly the
   * defect this codebase keeps removing.
   */
  readonly quantity?: number;
  /** Traceability chain — SPEC Part 4.3. Cannot be reconstructed later. */
  readonly sessionId?: string;
  readonly signalId?: string;
}

export interface AppendRequest {
  readonly orderId: string;
  readonly to: OrderStatus;
  readonly actor: string;
  readonly idempotencyKey: string;
  readonly reason?: string;
  readonly context?: TransitionContext;
  readonly sessionId?: string;
  readonly signalId?: string;
  readonly occurredAt?: Date;
  readonly preorderRunId?: string;
  readonly quantity?: number;
}

export type AppendResult =
  | { readonly outcome: 'applied'; readonly status: OrderStatus; readonly event: OrderEvent }
  | { readonly outcome: 'duplicate'; readonly status: OrderStatus; readonly event: OrderEvent }
  | { readonly outcome: 'rejected'; readonly status: OrderStatus; readonly event: OrderEvent };

/** The status an order holds before its first event. */
export const INITIAL_STATUS: OrderStatus = 'CREATED';

/** Re-exported so callers of the store need not know where the log lives. */
export { LogCorruptError };

/** Human-readable name of this log, used in corruption messages. */
const DESCRIBE = 'order log';

/** Derived status: replay the accepted events, in order. */
function deriveStatus(history: readonly OrderEvent[]): OrderStatus {
  return history
    .filter((event) => event.accepted)
    .reduce<OrderStatus>((_, event) => event.to, INITIAL_STATUS);
}

/**
 * Redelivery identity: (orderId, idempotencyKey).
 *
 * SPEC §3.4 gives the key as (order_id, from_status, to_status,
 * idempotency_key). That holds for the pure function, where `from` is an
 * input. In a store it does not: once the first delivery is applied, the
 * order's current `from` has moved, so the tuple can never match again and the
 * guarantee is vacuous — the exact path a redelivered webhook takes. Recorded
 * as docs/adr/ADR-008-idempotency-key-scope.md.
 */
function redeliveryKeyOf(event: Pick<OrderEvent, 'orderId' | 'idempotencyKey'>): string {
  return `${event.orderId}|${event.idempotencyKey}`;
}

export class OrderStore {
  readonly #log: AppendLog<OrderEvent>;

  constructor(path: string) {
    this.#log = new AppendLog<OrderEvent>(path);
  }

  get path(): string {
    return this.#log.path;
  }

  /**
   * Reads the whole log.
   *
   * A malformed line throws rather than being skipped. Silently dropping a
   * line would silently drop an order's history, and a store that quietly
   * loses records is worse than one that refuses to open. The single exception
   * is a final line left incomplete by a crash: that record was never finished,
   * so it was never acknowledged to anyone.
   */
  events(): readonly OrderEvent[] {
    return this.#log.read(DESCRIBE).records;
  }

  eventsFor(orderId: string): readonly OrderEvent[] {
    return this.events().filter((event) => event.orderId === orderId);
  }

  /** Current status, derived by replaying accepted events in order. */
  status(orderId: string): OrderStatus {
    return deriveStatus(this.eventsFor(orderId));
  }

  orderIds(): readonly string[] {
    return [...new Set(this.events().map((event) => event.orderId))];
  }

  /**
   * Validates a transition against the state machine and appends the outcome.
   *
   * Returns `duplicate` without writing when this exact transition and key are
   * already in the log — a redelivered webhook must be a no-op, never a second
   * effect. The check reads the store's own history, so it holds across process
   * restarts, which an in-memory set cannot.
   *
   * Read and write happen inside one exclusive lock. Without it the check and
   * the write are two syscalls with a gap between them, and two processes
   * delivering the same webhook both pass the check before either writes —
   * measured, not hypothetical: eight deliveries of one key produced two
   * accepted records.
   */
  append(request: AppendRequest): AppendResult {
    return this.#log.withLock<AppendResult>(DESCRIBE, (events) => {
      const history = events.filter((event) => event.orderId === request.orderId);
      const from = deriveStatus(history);

      const key = redeliveryKeyOf(request);
      const existing = history.find((event) => redeliveryKeyOf(event) === key);

      if (existing !== undefined) {
        if (existing.to === request.to) {
          return {
            record: null,
            result: { outcome: 'duplicate', status: from, event: existing },
          };
        }
        // Same key, different destination. That is a caller error, not a
        // redelivery: honouring it would let one key authorise two distinct
        // effects. Recorded rather than dropped, like any other refusal.
        const clash = this.#toEvent(
          {
            orderId: request.orderId,
            from,
            to: request.to,
            actor: request.actor,
            reason: request.reason,
            idempotencyKey: request.idempotencyKey,
            occurredAt: request.occurredAt ?? new Date(),
            accepted: false,
            rejectionReason:
              `idempotency key "${request.idempotencyKey}" was already used for ` +
              `${existing.from} -> ${existing.to}; it cannot authorise ${from} -> ${request.to}`,
          },
          request,
        );
        return { record: clash, result: { outcome: 'rejected', status: from, event: clash } };
      }

      const verdict = applyTransition({
        orderId: request.orderId,
        from,
        to: request.to,
        actor: request.actor,
        reason: request.reason,
        idempotencyKey: request.idempotencyKey,
        context: request.context,
        occurredAt: request.occurredAt,
      });

      if (verdict.outcome === 'duplicate') {
        // Unreachable: no key set is passed to the pure layer. Kept explicit so
        // a future change to that contract fails loudly instead of silently.
        throw new Error('state machine reported a duplicate; idempotency belongs to the store');
      }

      const event = this.#toEvent(verdict.record, request);
      return {
        record: event,
        result:
          verdict.outcome === 'applied'
            ? { outcome: 'applied', status: verdict.status, event }
            : { outcome: 'rejected', status: verdict.status, event },
      };
    });
  }

  #toEvent(record: TransitionRecord, request: AppendRequest): OrderEvent {
    const base = {
      eventId: newId('event'),
      orderId: record.orderId,
      from: record.from,
      to: record.to,
      actor: record.actor,
      idempotencyKey: record.idempotencyKey,
      occurredAt: record.occurredAt.toISOString(),
      accepted: record.accepted,
    };
    // Optional fields are omitted rather than written as undefined, so a
    // round-trip through JSON returns exactly what went in.
    return {
      ...base,
      ...(record.reason !== undefined ? { reason: record.reason } : {}),
      ...(record.rejectionReason !== undefined ? { rejectionReason: record.rejectionReason } : {}),
      ...(request.sessionId !== undefined ? { sessionId: request.sessionId } : {}),
      ...(request.signalId !== undefined ? { signalId: request.signalId } : {}),
      ...(request.preorderRunId !== undefined ? { preorderRunId: request.preorderRunId } : {}),
      ...(request.quantity !== undefined ? { quantity: request.quantity } : {}),
    };
  }

  /**
   * Units currently committed to a pre-order run.
   *
   * COUNTED, never stored. A stored counter is a second encoding of the same
   * fact, and it drifts: a cancellation that forgets to decrement leaves a run
   * believing it can pay for fabric it cannot. Here a cancelled order simply
   * stops being in PREORDER_HELD and stops counting, with no separate step that
   * can be forgotten.
   *
   * An order that reached PREORDER_HELD without a quantity contributes 1 — the
   * order exists, so it commits at least one garment, and treating a missing
   * quantity as 0 would let a run under-count what it owes.
   */
  committedUnits(runId: string): number {
    const held = this.orderIds().filter((orderId) => this.status(orderId) === 'PREORDER_HELD');
    return held.reduce((total, orderId) => {
      const commitment = this.eventsFor(orderId)
        .filter((event) => event.accepted && event.preorderRunId === runId)
        .at(-1);
      return commitment === undefined ? total : total + (commitment.quantity ?? 1);
    }, 0);
  }
}

/**
 * Concurrency.
 *
 * Multiple processes may append at once. Mutual exclusion comes from the
 * lockfile in AppendLog, so the idempotency check and the write it authorises
 * are one critical section. Verified by test/order/durability.test.ts, which
 * spawns real processes rather than simulating contention.
 *
 * The lock is filesystem-scoped: it holds for writers sharing a filesystem, and
 * would not hold across machines writing to different mounts of the same data.
 * That case does not exist here and must not be introduced without replacing
 * this mechanism.
 */
export const CONCURRENCY_LIMIT = 'single-filesystem' as const;
