/**
 * Closing a pre-order run.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 2.2 (PreorderRun),
 *       Part 3 §3.2 (PREORDER_HELD guards)
 * ADR-003 — pre-order.
 *
 * This is the moment the business decides whether to spend money on fabric, so
 * it is the moment most worth making impossible to get wrong. Three facts meet
 * here and none of them is chosen by the caller:
 *
 *   - what was committed — counted from the order log
 *   - what was needed — recorded on the run, and null until a supplier quotes it
 *   - which way the run closes — derived from those two
 *
 * The caller says only *close this run*. It cannot say how.
 */

import type { OrderStore } from '../order/store.ts';
import { closeOutcome, type PreorderRunStore, type RunRevision } from './run.ts';
import { RunIntegrityError } from './run.ts';

export interface CloseResult {
  readonly revision: RunRevision;
  readonly committedQuantity: number;
  readonly minimumQuantity: number;
}

/**
 * Closes an open run according to what was actually committed.
 *
 * Throws rather than closing when the run has no minimum: a run whose
 * break-even is unknown cannot be closed either way without guessing whether
 * the garment can be paid for.
 */
export function closeRun(
  runs: PreorderRunStore,
  orders: OrderStore,
  runId: string,
  actor: string,
): CloseResult {
  const run = runs.run(runId);
  if (run === null) {
    throw new RunIntegrityError(`${runId} does not exist`);
  }
  if (run.status !== 'OPEN') {
    throw new RunIntegrityError(`${runId} is ${run.status}, not OPEN — it cannot be closed`);
  }

  const committedQuantity = orders.committedUnits(runId);
  const outcome = closeOutcome(committedQuantity, run.minimumQuantity);
  if (outcome.status === null) {
    // Unreachable today, and deliberately kept. A run cannot open without a
    // minimum, and the terms of an open run are frozen, so an OPEN run always
    // has one. Mutation M47 survives here for exactly that reason — the branch
    // is defence against a future change to those rules, not live behaviour.
    // The rule itself is verified directly against `closeOutcome`.
    throw new RunIntegrityError(`${runId} cannot be closed: ${outcome.reason}`);
  }

  const revision = runs.record({
    ...run,
    status: outcome.status,
    actor,
    reason:
      `${committedQuantity} committed against a minimum of ${run.minimumQuantity}` +
      (outcome.status === 'CLOSED_UNDERSUBSCRIBED' ? ' — nothing goes into production' : ''),
  });

  return {
    revision,
    committedQuantity,
    // Non-null: closeOutcome returns a status only when the minimum exists.
    minimumQuantity: run.minimumQuantity as number,
  };
}

/**
 * The transition context for an order in a closing run, taken from recorded
 * facts rather than supplied by whoever is calling.
 *
 * Before this existed, the PREORDER_HELD guards read numbers the caller passed
 * in, which meant they agreed with whatever the caller claimed. A guard whose
 * inputs are chosen by the party it is guarding is not a guard.
 */
export function runContext(
  runs: PreorderRunStore,
  orders: OrderStore,
  runId: string,
): { committedQuantity: number; minimumQuantity: number } | { missing: string } {
  const run = runs.run(runId);
  if (run === null) return { missing: `${runId} does not exist` };
  if (run.minimumQuantity === null) {
    return { missing: `${runId} has no minimum quantity — no supplier quotation exists` };
  }
  return {
    committedQuantity: orders.committedUnits(runId),
    minimumQuantity: run.minimumQuantity,
  };
}
