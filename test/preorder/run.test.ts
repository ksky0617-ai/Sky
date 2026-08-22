import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { isId } from '../../src/identity/ids.ts';
import {
  closeOutcome,
  isTerminalRun,
  PreorderRunStore,
  RunIntegrityError,
  type RunInput,
} from '../../src/preorder/run.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-run-'));
let n = 0;
const fresh = (): PreorderRunStore => new PreorderRunStore(resolve(dir, `run-${n++}.jsonl`));

test.after(() => rmSync(dir, { recursive: true, force: true }));

/** A run with everything a quotation would supply. Fixture only — no run exists. */
const quoted = (overrides: Partial<RunInput> = {}): RunInput => ({
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

/** What today actually looks like: no quotation, so no numbers. */
const unquoted = (overrides: Partial<RunInput> = {}): RunInput =>
  quoted({
    minimumQuantity: null,
    targetQuantity: null,
    productionLeadDays: null,
    promisedShipBy: null,
    supplierQuoteId: null,
    ...overrides,
  });

test('an empty store has no runs', () => {
  const runs = fresh();
  assert.deepEqual(runs.runs(), []);
  assert.deepEqual(runs.open(), []);
  assert.equal(runs.openRunFor('PRD_test'), null);
});

test('a run round-trips through reload', () => {
  const runs = fresh();
  const recorded = runs.record(quoted());
  assert.ok(isId('event', recorded.eventId));

  const reloaded = new PreorderRunStore(runs.path);
  assert.deepEqual(reloaded.run('RUN_test'), recorded);
});

test('a run cannot OPEN without a minimum quantity', () => {
  // The minimum comes from a supplier quotation. No quotation exists, so no run
  // can open — that is the current state of the business, stated by the code.
  const runs = fresh();
  runs.record(unquoted());
  assert.throws(
    () => runs.record(unquoted({ status: 'OPEN' })),
    (error: unknown) => error instanceof RunIntegrityError && /minimumQuantity/.test(String(error)),
  );
  assert.equal(runs.open().length, 0);
});

test('a run cannot OPEN without the promise it must make before payment', () => {
  const runs = fresh();
  runs.record(quoted());
  for (const missing of ['promisedShipBy', 'productionLeadDays', 'supplierQuoteId'] as const) {
    assert.throws(
      () => runs.record(quoted({ status: 'OPEN', [missing]: null })),
      (error: unknown) => error instanceof RunIntegrityError && String(error).includes(missing),
      `a run opened without ${missing}`,
    );
  }
});

test('a fully quoted run can open', () => {
  const runs = fresh();
  runs.record(quoted());
  const open = runs.record(quoted({ status: 'OPEN' }));
  assert.equal(open.status, 'OPEN');
  assert.equal(runs.openRunFor('PRD_test')?.runId, 'RUN_test');
});

test('a run must begin as DRAFT', () => {
  const runs = fresh();
  assert.throws(() => runs.record(quoted({ status: 'OPEN' })), RunIntegrityError);
  assert.throws(() => runs.record(quoted({ status: 'IN_PRODUCTION' })), RunIntegrityError);
});

test('run transitions follow the table; the rest are refused', () => {
  const runs = fresh();
  runs.record(quoted());
  runs.record(quoted({ status: 'OPEN' }));

  // OPEN -> IN_PRODUCTION skips the close that decides whether to spend money.
  assert.throws(() => runs.record(quoted({ status: 'IN_PRODUCTION' })), RunIntegrityError);

  runs.record(quoted({ status: 'CLOSED_REACHED' }));
  runs.record(quoted({ status: 'IN_PRODUCTION' }));
  runs.record(quoted({ status: 'SHIPPED' }));
  assert.equal(runs.run('RUN_test')?.status, 'SHIPPED');
  assert.throws(() => runs.record(quoted({ status: 'IN_PRODUCTION' })), RunIntegrityError);
});

test('an undersubscribed run is terminal', () => {
  assert.equal(isTerminalRun('CLOSED_UNDERSUBSCRIBED'), true);
  assert.equal(isTerminalRun('SHIPPED'), true);
  assert.equal(isTerminalRun('OPEN'), false);

  const runs = fresh();
  runs.record(quoted());
  runs.record(quoted({ status: 'OPEN' }));
  runs.record(quoted({ status: 'CLOSED_UNDERSUBSCRIBED' }));
  // Reopening would be a different promise to different people.
  assert.throws(() => runs.record(quoted({ status: 'OPEN' })), RunIntegrityError);
  assert.throws(() => runs.record(quoted({ status: 'IN_PRODUCTION' })), RunIntegrityError);
});

test('two runs cannot be open for one garment at once', () => {
  const runs = fresh();
  runs.record(quoted());
  runs.record(quoted({ status: 'OPEN' }));
  runs.record(quoted({ runId: 'RUN_second' }));
  assert.throws(
    () => runs.record(quoted({ runId: 'RUN_second', status: 'OPEN' })),
    RunIntegrityError,
  );
});

test('a second run may open once the first has closed', () => {
  const runs = fresh();
  runs.record(quoted());
  runs.record(quoted({ status: 'OPEN' }));
  runs.record(quoted({ status: 'CLOSED_UNDERSUBSCRIBED' }));

  runs.record(quoted({ runId: 'RUN_second' }));
  const second = runs.record(quoted({ runId: 'RUN_second', status: 'OPEN' }));
  assert.equal(second.status, 'OPEN');
});

test('the terms of an open run cannot be changed under the people who committed', () => {
  const runs = fresh();
  runs.record(quoted());
  runs.record(quoted({ status: 'OPEN' }));

  // Lowering the minimum is the dangerous one: it turns an undersubscribed run
  // into a "successful" one and puts a garment into production that the
  // quotation says cannot be paid for.
  assert.throws(
    () => runs.record(quoted({ status: 'OPEN', minimumQuantity: 5 })),
    (e: unknown) => e instanceof RunIntegrityError && /minimumQuantity/.test(String(e)),
  );
  // Values chosen to stay well-formed on their own, so the refusal can only
  // come from the freeze and not from some other rule catching them first.
  const shifted = { promisedShipBy: '2027-03-01T00:00:00.000Z', closesAt: '2026-09-20T00:00:00.000Z' };
  for (const [field, value] of Object.entries(shifted)) {
    assert.throws(
      () => runs.record(quoted({ status: 'OPEN', [field]: value })),
      (e: unknown) => e instanceof RunIntegrityError && String(e).includes(field),
      `${field} changed while the run was open`,
    );
  }
  assert.equal(runs.run('RUN_test')?.minimumQuantity, 20);
});

test('a DRAFT run may still be edited freely — the freeze starts at OPEN', () => {
  const runs = fresh();
  runs.record(quoted());
  const revised = runs.record(quoted({ minimumQuantity: 25 }));
  assert.equal(revised.minimumQuantity, 25);
});

test('the target may still be revised while open — it promises nothing', () => {
  const runs = fresh();
  runs.record(quoted());
  runs.record(quoted({ status: 'OPEN' }));
  const revised = runs.record(quoted({ status: 'OPEN', targetQuantity: 60 }));
  assert.equal(revised.targetQuantity, 60);
});

test('a run cannot be moved to a different garment', () => {
  const runs = fresh();
  runs.record(quoted());
  assert.throws(() => runs.record(quoted({ productId: 'PRD_other' })), RunIntegrityError);
});

test('a run cannot close before it opens', () => {
  const runs = fresh();
  assert.throws(
    () => runs.record(quoted({ closesAt: '2026-08-01T00:00:00.000Z' })),
    RunIntegrityError,
  );
});

test('the promised ship date must be after the run closes', () => {
  // Production starts when the run closes. A date before that is a promise the
  // pre-order model cannot keep.
  const runs = fresh();
  assert.throws(
    () => runs.record(quoted({ promisedShipBy: '2026-09-15T00:00:00.000Z' })),
    RunIntegrityError,
  );
});

test('quantities are positive integers or absent — never zero, never fractional', () => {
  const runs = fresh();
  for (const bad of [0, -1, 2.5]) {
    assert.throws(() => runs.record(quoted({ minimumQuantity: bad })), RunIntegrityError);
  }
  assert.equal(runs.record(unquoted()).minimumQuantity, null);
});

test('closeOutcome refuses to decide without a minimum', () => {
  const outcome = closeOutcome(100, null);
  assert.equal(outcome.status, null);
  assert.match(String((outcome as { reason: string }).reason), /supplier quotation/);
});

test('closeOutcome turns on the boundary, not near it', () => {
  assert.equal(closeOutcome(19, 20).status, 'CLOSED_UNDERSUBSCRIBED');
  assert.equal(closeOutcome(20, 20).status, 'CLOSED_REACHED');
  assert.equal(closeOutcome(21, 20).status, 'CLOSED_REACHED');
  assert.equal(closeOutcome(0, 1).status, 'CLOSED_UNDERSUBSCRIBED');
});

test('the store exposes no way to mutate or delete a revision', () => {
  const surface = new Set([
    ...Object.getOwnPropertyNames(PreorderRunStore.prototype),
    ...Object.keys(fresh()),
  ]);
  for (const forbidden of ['update', 'delete', 'remove', 'set', 'edit', 'clear']) {
    assert.equal(surface.has(forbidden), false, `${forbidden} exists on an append-only store`);
  }
});
