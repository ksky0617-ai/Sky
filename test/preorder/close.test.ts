/**
 * Integration: the pre-order run log and the order log meeting at the moment
 * the business decides whether to buy fabric.
 *
 * Both are real files on disk. Nothing here is mocked, because what is being
 * tested is precisely that the two logs agree.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { OrderStore } from '../../src/order/store.ts';
import { closeRun, runContext } from '../../src/preorder/close.ts';
import { PreorderRunStore, RunIntegrityError, type RunInput } from '../../src/preorder/run.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-close-'));
let n = 0;

function stores(): { runs: PreorderRunStore; orders: OrderStore } {
  const id = n++;
  return {
    runs: new PreorderRunStore(resolve(dir, `runs-${id}.jsonl`)),
    orders: new OrderStore(resolve(dir, `orders-${id}.jsonl`)),
  };
}

test.after(() => rmSync(dir, { recursive: true, force: true }));

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

/** Takes one order all the way to PREORDER_HELD against a run. */
function commit(orders: OrderStore, orderId: string, runId: string, quantity?: number): void {
  orders.append({ orderId, to: 'PAID', actor: 'stripe', idempotencyKey: `${orderId}-paid` });
  orders.append({
    orderId,
    to: 'PREORDER_HELD',
    actor: 'system',
    idempotencyKey: `${orderId}-held`,
    preorderRunId: runId,
    ...(quantity !== undefined ? { quantity } : {}),
  });
}

function openRun(runs: PreorderRunStore, overrides: Partial<RunInput> = {}): void {
  runs.record(quoted(overrides));
  runs.record(quoted({ ...overrides, status: 'OPEN' }));
}

test('commitments are counted from the order log, not stored anywhere', () => {
  const { runs, orders } = stores();
  openRun(runs);

  assert.equal(orders.committedUnits('RUN_test'), 0);
  commit(orders, 'ORD_1', 'RUN_test', 3);
  commit(orders, 'ORD_2', 'RUN_test', 2);
  assert.equal(orders.committedUnits('RUN_test'), 5);

  // A fresh instance reading the same file must agree — the count is derived,
  // so there is no in-memory total to be lost or to survive incorrectly.
  assert.equal(new OrderStore(orders.path).committedUnits('RUN_test'), 5);
});

test('a cancelled order stops counting, with no separate decrement to forget', () => {
  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test', 4);
  commit(orders, 'ORD_2', 'RUN_test', 6);
  assert.equal(orders.committedUnits('RUN_test'), 10);

  orders.append({
    orderId: 'ORD_2', to: 'CANCELLED', actor: 'customer', idempotencyKey: 'ORD_2-cancel',
  });
  assert.equal(orders.committedUnits('RUN_test'), 4, 'a cancelled order still counted');
});

test('commitments to another run are not counted', () => {
  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test', 5);
  commit(orders, 'ORD_2', 'RUN_other', 5);
  assert.equal(orders.committedUnits('RUN_test'), 5);
});

test('an order without a stated quantity counts as one, never as zero', () => {
  // A missing quantity means the field was not recorded, not that nothing was
  // ordered. Counting it as 0 would let a run under-count what it owes.
  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test');
  assert.equal(orders.committedUnits('RUN_test'), 1);
});

test('a run that reached its minimum closes as REACHED', () => {
  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test', 20);

  const result = closeRun(runs, orders, 'RUN_test', 'operator:test');
  assert.equal(result.revision.status, 'CLOSED_REACHED');
  assert.equal(result.committedQuantity, 20);
  assert.equal(runs.run('RUN_test')?.status, 'CLOSED_REACHED');
});

test('a run that missed its minimum closes as UNDERSUBSCRIBED and nothing is produced', () => {
  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test', 19);

  const result = closeRun(runs, orders, 'RUN_test', 'operator:test');
  assert.equal(result.revision.status, 'CLOSED_UNDERSUBSCRIBED');
  assert.match(String(result.revision.reason), /nothing goes into production/);
  assert.throws(() => runs.record(quoted({ status: 'IN_PRODUCTION' })), RunIntegrityError);
});

test('the caller cannot choose how a run closes', () => {
  // closeRun takes no outcome argument. The only way to record a close is to
  // let the committed count decide it.
  assert.equal(closeRun.length, 4, 'closeRun grew a parameter — check it is not an outcome');

  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test', 1);
  assert.equal(closeRun(runs, orders, 'RUN_test', 'op').revision.status, 'CLOSED_UNDERSUBSCRIBED');
});

test('a run with no minimum cannot be closed either way', () => {
  const { runs, orders } = stores();
  // It could never have opened, but the refusal must not depend on that.
  runs.record(quoted({ minimumQuantity: null }));

  assert.throws(
    () => closeRun(runs, orders, 'RUN_test', 'op'),
    (error: unknown) => error instanceof RunIntegrityError && /not OPEN/.test(String(error)),
  );
});

test('a run cannot be closed twice', () => {
  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test', 25);
  closeRun(runs, orders, 'RUN_test', 'op');
  assert.throws(() => closeRun(runs, orders, 'RUN_test', 'op'), RunIntegrityError);
});

test('closing an unknown run is refused rather than silently creating one', () => {
  const { runs, orders } = stores();
  assert.throws(() => closeRun(runs, orders, 'RUN_missing', 'op'), RunIntegrityError);
  assert.equal(runs.runs().length, 0);
});

test('the guard context comes from the two logs, not from the caller', () => {
  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test', 7);

  assert.deepEqual(runContext(runs, orders, 'RUN_test'), {
    committedQuantity: 7,
    minimumQuantity: 20,
  });
});

test('the guard context reports what is missing rather than substituting a number', () => {
  const { runs, orders } = stores();
  runs.record(quoted({ minimumQuantity: null }));

  const context = runContext(runs, orders, 'RUN_test');
  assert.ok('missing' in context, 'a missing minimum was replaced by a number');
  assert.match(context.missing, /no supplier quotation exists/);

  assert.ok('missing' in runContext(runs, orders, 'RUN_absent'));
});

test('the close survives a reload — it is on disk, not in memory', () => {
  const { runs, orders } = stores();
  openRun(runs);
  commit(orders, 'ORD_1', 'RUN_test', 30);
  closeRun(runs, orders, 'RUN_test', 'op');

  const reloaded = new PreorderRunStore(runs.path);
  assert.equal(reloaded.run('RUN_test')?.status, 'CLOSED_REACHED');
  assert.equal(reloaded.revisions().length, 3, 'the run history was lost');
});
