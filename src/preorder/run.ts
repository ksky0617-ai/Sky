/**
 * Pre-order runs — append-only.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 2.2 (PreorderRun),
 *       Part 3 §3.2 (the PREORDER_HELD guards this feeds)
 * ADR-003 — pre-order: nothing is produced before it is paid for, and the
 *       production window is stated before payment.
 *
 * This is the entity that makes the order state machine's guards real. Until
 * now `committedQuantity` and `minimumQuantity` arrived as caller-supplied
 * context, which means a caller could have supplied any pair of numbers and the
 * guard would have agreed. Here both come from recorded facts:
 *
 *   - `minimumQuantity` is the break-even quantity from a supplier quotation.
 *     **There is no quotation, so it is null, and a run with a null minimum
 *     cannot open.** That is not a placeholder waiting to be filled in with a
 *     plausible number; it is the reason no pre-order can open today.
 *
 *   - `committedQuantity` is COUNTED FROM THE ORDER LOG, never stored. A stored
 *     counter is a second encoding of the same fact and will eventually
 *     disagree with the orders it claims to count — the defect removed from
 *     order status in ADR-007's cycle, refused here before it can appear.
 *
 * The close decision follows from those two numbers and is not a choice. A run
 * that missed its minimum cannot be closed as if it had reached it; that would
 * put a garment into production that the business cannot pay for, which is the
 * failure the whole pre-order model exists to prevent.
 */

import { newId } from '../identity/ids.ts';
import { AppendLog, LogCorruptError } from '../persistence/append-log.ts';

export type RunStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'CLOSED_REACHED'
  | 'CLOSED_UNDERSUBSCRIBED'
  | 'IN_PRODUCTION'
  | 'SHIPPED';

/**
 * SPEC Part 2.2 lists the statuses but no transition table, so this encodes
 * only what the pre-order model itself requires: a run opens before it closes,
 * closes one way or the other, and only a run that reached its minimum can go
 * into production. An undersubscribed run is terminal — there is nothing to
 * produce, and reopening it would be a different run with a different promise.
 */
const ALLOWED_RUN_TRANSITIONS: Readonly<Record<RunStatus, readonly RunStatus[]>> = {
  DRAFT: ['OPEN'],
  OPEN: ['CLOSED_REACHED', 'CLOSED_UNDERSUBSCRIBED'],
  CLOSED_REACHED: ['IN_PRODUCTION'],
  CLOSED_UNDERSUBSCRIBED: [],
  IN_PRODUCTION: ['SHIPPED'],
  SHIPPED: [],
};

export interface RunRevision {
  readonly eventId: string;
  readonly runId: string;
  readonly productId: string;
  readonly status: RunStatus;
  readonly opensAt: string;
  readonly closesAt: string;
  /** Break-even quantity. Null until a supplier quotation exists. */
  readonly minimumQuantity: number | null;
  /** What the run aims for. Null when no target has been set. */
  readonly targetQuantity: number | null;
  /** Days from close to dispatch. Null until a supplier quotes it. */
  readonly productionLeadDays: number | null;
  /** The date promised to the customer before payment (ADR-003). */
  readonly promisedShipBy: string | null;
  /** The quotation the minimum came from. Null while none exists. */
  readonly supplierQuoteId: string | null;
  readonly recordedAt: string;
  readonly actor: string;
  readonly reason?: string;
}

export type RunInput = Omit<RunRevision, 'eventId' | 'recordedAt'>;

/**
 * The terms a customer commits under. Once a run is open they are fixed for as
 * long as it exists.
 *
 * Lowering `minimumQuantity` mid-run would let an undersubscribed run be made
 * to "reach" its minimum — producing a garment the quotation says cannot be
 * paid for, which is the single failure the pre-order model exists to prevent.
 * Moving `promisedShipBy` or `closesAt` changes what people were told before
 * they paid, which ADR-003 requires to be stated up front.
 *
 * `targetQuantity` is not here: it is an aspiration, not a promise, and nothing
 * is decided by it.
 */
const FROZEN_ONCE_OPEN = [
  'minimumQuantity',
  'promisedShipBy',
  'productionLeadDays',
  'supplierQuoteId',
  'opensAt',
  'closesAt',
] as const satisfies readonly (keyof RunInput)[];

export class RunIntegrityError extends Error {}
export { LogCorruptError };

const DESCRIBE = 'pre-order run log';

/**
 * The two dates a customer is owed before paying (ADR-003), with no nulls left
 * in them.
 *
 * The page that shows these must not carry a "what if there is no date" branch:
 * such a branch cannot be reached through an open run, so it would be untested
 * code standing between a customer and a promise. Narrowing happens here
 * instead, once, where it can be exercised.
 */
export interface PreorderWindow {
  readonly closesAt: string;
  readonly promisedShipBy: string;
}

export function preorderWindow(run: RunRevision): PreorderWindow | null {
  return run.promisedShipBy === null
    ? null
    : { closesAt: run.closesAt, promisedShipBy: run.promisedShipBy };
}

/** Statuses in which a run is offered to customers. */
export function isOpen(status: RunStatus): boolean {
  return status === 'OPEN';
}

export function isTerminalRun(status: RunStatus): boolean {
  return ALLOWED_RUN_TRANSITIONS[status].length === 0;
}

/**
 * What closing a run must produce, given what it committed and what it needed.
 *
 * Pure, and separate from the store, because it is the one rule in the
 * pre-order model that decides whether money gets spent on fabric.
 */
export function closeOutcome(
  committedQuantity: number,
  minimumQuantity: number | null,
): { status: 'CLOSED_REACHED' | 'CLOSED_UNDERSUBSCRIBED' } | { status: null; reason: string } {
  if (minimumQuantity === null) {
    return {
      status: null,
      reason:
        'the run has no minimum quantity, so there is nothing to compare the commitments ' +
        'against. The minimum comes from a supplier quotation; without one, closing the run ' +
        'either way would be a guess about whether the garment can be paid for.',
    };
  }
  return {
    status: committedQuantity >= minimumQuantity ? 'CLOSED_REACHED' : 'CLOSED_UNDERSUBSCRIBED',
  };
}

function assertOpenable(input: RunInput): void {
  if (!isOpen(input.status)) return;

  const missing: string[] = [];
  if (input.minimumQuantity === null) missing.push('minimumQuantity (from a supplier quotation)');
  if (input.productionLeadDays === null) missing.push('productionLeadDays');
  if (input.promisedShipBy === null) missing.push('promisedShipBy');
  if (input.supplierQuoteId === null) missing.push('supplierQuoteId');

  if (missing.length > 0) {
    throw new RunIntegrityError(
      `${input.runId} cannot be OPEN: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} ` +
        'missing. An open run takes money for a garment that does not exist yet; every one of ' +
        'these is part of what the customer is told before they pay (ADR-003).',
    );
  }
}

function assertWellFormed(input: RunInput): void {
  const opens = Date.parse(input.opensAt);
  const closes = Date.parse(input.closesAt);
  if (Number.isNaN(opens) || Number.isNaN(closes)) {
    throw new RunIntegrityError(`${input.runId}: opensAt and closesAt must be ISO timestamps`);
  }
  if (closes <= opens) {
    throw new RunIntegrityError(
      `${input.runId}: the run closes at or before it opens (${input.opensAt} → ${input.closesAt})`,
    );
  }
  if (input.promisedShipBy !== null) {
    const ship = Date.parse(input.promisedShipBy);
    if (Number.isNaN(ship)) {
      throw new RunIntegrityError(`${input.runId}: promisedShipBy must be an ISO timestamp`);
    }
    if (ship <= closes) {
      throw new RunIntegrityError(
        `${input.runId}: the promised ship date (${input.promisedShipBy}) is not after the run ` +
          `closes (${input.closesAt}). Production starts at close, so this promise cannot be kept.`,
      );
    }
  }
  for (const [field, value] of [
    ['minimumQuantity', input.minimumQuantity],
    ['targetQuantity', input.targetQuantity],
    ['productionLeadDays', input.productionLeadDays],
  ] as const) {
    if (value === null) continue;
    if (!Number.isInteger(value) || value <= 0) {
      throw new RunIntegrityError(`${input.runId}: ${field} must be a positive integer, got ${value}`);
    }
  }
}

export class PreorderRunStore {
  readonly #log: AppendLog<RunRevision>;

  constructor(path: string) {
    this.#log = new AppendLog<RunRevision>(path);
  }

  get path(): string {
    return this.#log.path;
  }

  revisions(): readonly RunRevision[] {
    return this.#log.read(DESCRIBE).records;
  }

  /** Latest revision of every run, in first-recorded order. */
  runs(): readonly RunRevision[] {
    const latest = new Map<string, RunRevision>();
    for (const revision of this.revisions()) latest.set(revision.runId, revision);
    return [...latest.values()];
  }

  run(runId: string): RunRevision | null {
    return this.runs().find((r) => r.runId === runId) ?? null;
  }

  open(): readonly RunRevision[] {
    return this.runs().filter((r) => isOpen(r.status));
  }

  /** The open run for a product, if any. At most one may exist — see `record`. */
  openRunFor(productId: string): RunRevision | null {
    return this.open().find((r) => r.productId === productId) ?? null;
  }

  /**
   * Records a revision. Validated before the write and again against the log
   * inside the lock, because the two rules that need history — a legal status
   * transition, and one open run per product — cannot be checked without it.
   */
  record(input: RunInput): RunRevision {
    assertWellFormed(input);
    assertOpenable(input);

    return this.#log.withLock<RunRevision>(DESCRIBE, (revisions) => {
      const latest = revisions.filter((r) => r.runId === input.runId).at(-1) ?? null;

      if (latest === null) {
        if (input.status !== 'DRAFT') {
          throw new RunIntegrityError(
            `${input.runId} cannot begin at ${input.status}. A run starts as DRAFT so that what ` +
              'it promises is recorded before it is offered.',
          );
        }
      } else if (latest.status !== input.status) {
        if (!ALLOWED_RUN_TRANSITIONS[latest.status].includes(input.status)) {
          throw new RunIntegrityError(
            `${input.runId}: ${latest.status} -> ${input.status} is not a permitted run ` +
              `transition${isTerminalRun(latest.status) ? ` (${latest.status} is terminal)` : ''}`,
          );
        }
      }

      if (latest !== null && latest.status !== 'DRAFT') {
        const changed = FROZEN_ONCE_OPEN.filter((field) => input[field] !== latest[field]);
        if (changed.length > 0) {
          throw new RunIntegrityError(
            `${input.runId} is ${latest.status}; ${changed.join(', ')} cannot change now. ` +
              'These are the terms people commit under, and one of them decides whether the ' +
              'garment goes into production at all.',
          );
        }
      }

      if (latest !== null && input.productId !== latest.productId) {
        throw new RunIntegrityError(
          `${input.runId} was recorded against ${latest.productId} and cannot be moved to ` +
            `${input.productId}. A run is a promise about one garment.`,
        );
      }

      if (isOpen(input.status)) {
        const other = revisions
          .filter((r) => r.runId !== input.runId)
          .reduce<Map<string, RunRevision>>((map, r) => map.set(r.runId, r), new Map());
        const clash = [...other.values()].find(
          (r) => isOpen(r.status) && r.productId === input.productId,
        );
        if (clash !== undefined) {
          throw new RunIntegrityError(
            `${clash.runId} is already open for ${input.productId}. Two open runs for one garment ` +
              'would offer two different ship dates for the same thing.',
          );
        }
      }

      const revision: RunRevision = {
        ...input,
        eventId: newId('event'),
        recordedAt: new Date().toISOString(),
      };
      return { record: revision, result: revision };
    });
  }
}
