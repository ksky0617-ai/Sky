/**
 * Appends one order transition, then exits. Used by the concurrency test to
 * create genuine multi-process contention rather than simulated contention.
 *
 * The optional start barrier makes that contention reliable instead of
 * accidental. Node startup takes tens of milliseconds and varies, so processes
 * launched together do not arrive together; without the barrier a race test can
 * pass simply because the writers queued themselves. Given a wall-clock instant,
 * every worker waits for it and then reads at effectively the same moment.
 *
 * argv: <logPath> <orderId> <toStatus> <idempotencyKey> [startAtEpochMs]
 */
import { OrderStore } from '../src/order/store.ts';

const [, , logPath, orderId, to, key, startAt] = process.argv;

if (startAt !== undefined) {
  const target = Number(startAt);
  // Spin rather than sleep: the last millisecond is the one that matters.
  while (Date.now() < target) { /* wait for the barrier */ }
}

const store = new OrderStore(logPath);
const result = store.append({ orderId, to, actor: `pid:${process.pid}`, idempotencyKey: key });
process.stdout.write(result.outcome);
