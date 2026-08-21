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
 * readable by any tool, and portable to any host. It suits a single writer at
 * the scale this business is at. It is NOT safe for concurrent writers across
 * processes — see `Concurrency` below — and that limit is stated rather than
 * papered over.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

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
}

export type AppendResult =
  | { readonly outcome: 'applied'; readonly status: OrderStatus; readonly event: OrderEvent }
  | { readonly outcome: 'duplicate'; readonly status: OrderStatus; readonly event: OrderEvent }
  | { readonly outcome: 'rejected'; readonly status: OrderStatus; readonly event: OrderEvent };

/** The status an order holds before its first event. */
export const INITIAL_STATUS: OrderStatus = 'CREATED';

export class CorruptLogError extends Error {}

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
  readonly #path: string;

  constructor(path: string) {
    this.#path = path;
    const directory = dirname(path);
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  }

  get path(): string {
    return this.#path;
  }

  /**
   * Reads the whole log.
   *
   * A malformed line throws rather than being skipped. Silently dropping a
   * line would silently drop an order's history, and a store that quietly
   * loses records is worse than one that refuses to open.
   */
  events(): readonly OrderEvent[] {
    if (!existsSync(this.#path)) return [];
    const raw = readFileSync(this.#path, 'utf8');
    const lines = raw.split('\n').filter((line) => line.trim() !== '');
    return lines.map((line, index) => {
      try {
        return JSON.parse(line) as OrderEvent;
      } catch (cause) {
        throw new CorruptLogError(
          `${this.#path}: line ${index + 1} is not valid JSON. The log is append-only and ` +
            'must not be edited by hand; restore it from history rather than repairing it in place.',
          { cause },
        );
      }
    });
  }

  eventsFor(orderId: string): readonly OrderEvent[] {
    return this.events().filter((event) => event.orderId === orderId);
  }

  /** Current status, derived by replaying accepted events in order. */
  status(orderId: string): OrderStatus {
    return this.eventsFor(orderId)
      .filter((event) => event.accepted)
      .reduce<OrderStatus>((_, event) => event.to, INITIAL_STATUS);
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
   */
  append(request: AppendRequest): AppendResult {
    const history = this.eventsFor(request.orderId);
    const from = history
      .filter((event) => event.accepted)
      .reduce<OrderStatus>((_, event) => event.to, INITIAL_STATUS);

    const key = redeliveryKeyOf(request);
    const existing = history.find((event) => redeliveryKeyOf(event) === key);

    if (existing !== undefined) {
      if (existing.to === request.to) {
        return { outcome: 'duplicate', status: this.status(request.orderId), event: existing };
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
      appendFileSync(this.#path, `${JSON.stringify(clash)}\n`, 'utf8');
      return { outcome: 'rejected', status: this.status(request.orderId), event: clash };
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
      // Unreachable: no key set is passed to the pure layer. Kept explicit so a
      // future change to that contract fails loudly instead of silently.
      throw new Error('state machine reported a duplicate; idempotency belongs to the store');
    }

    const event = this.#toEvent(verdict.record, request);
    appendFileSync(this.#path, `${JSON.stringify(event)}\n`, 'utf8');

    return verdict.outcome === 'applied'
      ? { outcome: 'applied', status: verdict.status, event }
      : { outcome: 'rejected', status: verdict.status, event };
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
    };
  }
}

/**
 * Concurrency.
 *
 * `appendFileSync` opens with O_APPEND, so a single line written by one process
 * lands atomically on the platforms this runs on. Two processes appending at
 * once will not corrupt a line, but they CAN both pass the idempotency check
 * before either writes, producing two records for one key.
 *
 * That is a real limit, not a theoretical one, and it is unverified here — no
 * concurrency test exists. At current scale there is one writer. Before a
 * second writer exists, this needs a lock or a store with a unique constraint.
 */
export const CONCURRENCY_LIMIT = 'single-writer' as const;
