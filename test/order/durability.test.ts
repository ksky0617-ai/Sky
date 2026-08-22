/**
 * Durability of the order log under real conditions: several processes writing
 * at once, and a process killed mid-write.
 *
 * These spawn processes rather than simulating contention, because the defect
 * being tested lives between two syscalls and cannot be reproduced inside one
 * event loop.
 *
 * The concurrent tests use a wall-clock start barrier. Without it they measure
 * process startup jitter instead of the property: writers that happen to arrive
 * in sequence produce a green result from a broken store. That is not
 * hypothetical — an earlier version of this file passed against a store with no
 * mutual exclusion at all.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { LogCorruptError, OrderStore } from '../../src/order/store.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-dur-'));
const worker = resolve(import.meta.dirname, '../../scripts/append-worker.mjs');
let n = 0;
const freshPath = (): string => resolve(dir, `dur-${n++}.jsonl`);

/** Enough for every spawned worker to be up and spinning on the barrier. */
const BARRIER_LEAD_MS = 700;

test.after(() => rmSync(dir, { recursive: true, force: true }));

/** Starts `count` workers that all begin their append at the same instant. */
function race(
  logPath: string,
  args: (index: number) => readonly string[],
  count: number,
): Promise<string[]> {
  const startAt = String(Date.now() + BARRIER_LEAD_MS);
  return Promise.all(
    Array.from({ length: count }, (_, index) =>
      new Promise<string>((done) => {
        const child = spawn(
          'node',
          ['--experimental-strip-types', worker, logPath, ...args(index), startAt],
          { stdio: ['ignore', 'pipe', 'ignore'] },
        );
        let out = '';
        child.stdout.on('data', (chunk) => { out += String(chunk); });
        child.on('close', () => done(out));
      }),
    ),
  );
}

test('sequential appends from separate processes are all recorded', () => {
  const path = freshPath();
  for (let i = 0; i < 3; i += 1) {
    execFileSync(
      'node',
      [
        '--experimental-strip-types', worker, path, 'ORD_seq',
        i === 0 ? 'PAID' : 'PREORDER_HELD', `k${i}`,
      ],
      { stdio: 'ignore' },
    );
  }
  const store = new OrderStore(path);
  assert.equal(store.eventsFor('ORD_seq').length, 3);
  assert.equal(store.status('ORD_seq'), 'PREORDER_HELD');
});

test('CONCURRENCY: parallel processes with the SAME key must produce one record', async () => {
  const path = freshPath();
  const COUNT = 8;

  const outcomes = await race(path, () => ['ORD_race', 'PAID', 'same_key'], COUNT);

  const applied = new OrderStore(path).eventsFor('ORD_race').filter((e) => e.accepted);
  assert.equal(
    applied.length,
    1,
    `${COUNT} simultaneous deliveries of one idempotency key produced ${applied.length} accepted ` +
      `records (outcomes: ${outcomes.join(',')}). A redelivered webhook must take effect once.`,
  );
  assert.equal(
    outcomes.filter((o) => o === 'applied').length,
    1,
    'exactly one caller may be told its delivery was applied',
  );
});

test('CONCURRENCY: parallel appends with distinct keys lose no writes and corrupt no lines', async () => {
  const path = freshPath();
  const COUNT = 12;

  await race(path, (i) => [`ORD_p${i}`, 'PAID', `k${i}`], COUNT);

  const store = new OrderStore(path);            // throws if any line is malformed
  assert.equal(store.events().length, COUNT, 'a concurrent write was lost or duplicated');
  assert.equal(new Set(store.orderIds()).size, COUNT);
});

test('CONCURRENCY: simultaneous transitions of ONE order are serialised, not interleaved', async () => {
  const path = freshPath();
  const COUNT = 6;

  // All six ask for the same destination from the same starting point, each with
  // its own key. Exactly one can legally apply: after the first, CREATED is no
  // longer the current status, so the rest must be refused — and a refusal is
  // recorded, not dropped.
  const outcomes = await race(path, (i) => ['ORD_one', 'PAID', `key${i}`], COUNT);

  const store = new OrderStore(path);
  const events = store.eventsFor('ORD_one');
  assert.equal(events.length, COUNT, 'a concurrent attempt vanished instead of being recorded');
  assert.equal(
    events.filter((e) => e.accepted).length,
    1,
    `one order took two transitions out of one state (outcomes: ${outcomes.join(',')})`,
  );
  assert.equal(store.status('ORD_one'), 'PAID');
});

test('CRASH: a truncated final line does not brick the store', () => {
  const path = freshPath();
  const store = new OrderStore(path);
  store.append({ orderId: 'ORD_crash', to: 'PAID', actor: 'a', idempotencyKey: '1' });

  // A process killed mid-write leaves a partial final line: the record was
  // never completed, so it was never acknowledged either.
  const partial = JSON.stringify({ orderId: 'ORD_crash', to: 'PREORDER' }).slice(0, 20);
  writeFileSync(path, `${readFileSync(path, 'utf8')}${partial}`, 'utf8');

  const reopened = new OrderStore(path);
  assert.equal(reopened.eventsFor('ORD_crash').length, 1, 'the completed record was lost');
  assert.equal(reopened.status('ORD_crash'), 'PAID');
});

test('CRASH: a store recovered from a truncated write still accepts new writes', () => {
  const path = freshPath();
  const store = new OrderStore(path);
  store.append({ orderId: 'ORD_resume', to: 'PAID', actor: 'a', idempotencyKey: '1' });
  writeFileSync(path, `${readFileSync(path, 'utf8')}{"orderId":"ORD_resume"`, 'utf8');

  // Recovery is not enough on its own: a log that can be read but not written
  // to is still a stopped business.
  const reopened = new OrderStore(path);
  const result = reopened.append({
    orderId: 'ORD_resume', to: 'PREORDER_HELD', actor: 'a', idempotencyKey: '2',
  });
  assert.equal(result.outcome, 'applied');
  assert.equal(new OrderStore(path).status('ORD_resume'), 'PREORDER_HELD');
});

test('CORRUPTION: a malformed line in the middle still throws', () => {
  const path = freshPath();
  const store = new OrderStore(path);
  store.append({ orderId: 'ORD_mid', to: 'PAID', actor: 'a', idempotencyKey: '1' });
  store.append({ orderId: 'ORD_mid', to: 'PREORDER_HELD', actor: 'a', idempotencyKey: '2' });

  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l !== '');
  writeFileSync(path, `${lines[0]}\n{damaged}\n${lines[1]}\n`, 'utf8');

  assert.throws(() => new OrderStore(path).events(), LogCorruptError,
    'damage inside the history must not be silently skipped');
});
