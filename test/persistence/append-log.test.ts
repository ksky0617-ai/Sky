/**
 * Targeted tests for the shared append log.
 *
 * The store-level and catalogue-level durability tests prove the behaviour
 * end-to-end with real processes. These prove the pieces the end-to-end tests
 * cannot reach on demand: a lock abandoned by a dead process, and a lock that
 * is never released.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { AppendLog, LogCorruptError } from '../../src/persistence/append-log.ts';
import {
  FileStorage,
  LOCK_TIMEOUT_MS,
  LockTimeoutError,
  STALE_LOCK_MS,
} from '../../src/persistence/file-storage.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-log-'));
let n = 0;
const freshPath = (): string => resolve(dir, `log-${n++}.jsonl`);

test.after(() => rmSync(dir, { recursive: true, force: true }));

interface Row {
  readonly id: number;
}

test('an absent log reads as empty rather than throwing', () => {
  const log = new AppendLog<Row>(new FileStorage(freshPath()));
  assert.deepEqual(log.read('test log'), { records: [], truncatedTail: false, completeBytes: 0 });
});

test('records round-trip in the order they were appended', () => {
  const log = new AppendLog<Row>(new FileStorage(freshPath()));
  for (const id of [1, 2, 3]) {
    log.withLock('test log', () => ({ record: { id }, result: null }));
  }
  assert.deepEqual(
    log.read('test log').records.map((r) => r.id),
    [1, 2, 3],
  );
});

test('work sees the records already in the log, so a decision cannot be stale', () => {
  const log = new AppendLog<Row>(new FileStorage(freshPath()));
  log.withLock('test log', () => ({ record: { id: 1 }, result: null }));
  const seen = log.withLock<readonly Row[]>('test log', (records) => ({
    record: null,
    result: records,
  }));
  assert.deepEqual(seen.map((r) => r.id), [1]);
});

test('returning no record appends nothing', () => {
  const path = freshPath();
  const log = new AppendLog<Row>(new FileStorage(path));
  log.withLock('test log', () => ({ record: null, result: null }));
  assert.equal(log.read('test log').records.length, 0);
});

test('the lock is released after work throws, so the log is not left jammed', () => {
  const log = new AppendLog<Row>(new FileStorage(freshPath()));
  assert.throws(() => {
    log.withLock('test log', () => {
      throw new Error('work failed');
    });
  }, /work failed/);
  // If the lock leaked, this second call would block until the timeout.
  log.withLock('test log', () => ({ record: { id: 9 }, result: null }));
  assert.equal(log.read('test log').records.length, 1);
});

test('a truncated final line is discarded and reported', () => {
  const path = freshPath();
  const log = new AppendLog<Row>(new FileStorage(path));
  log.withLock('test log', () => ({ record: { id: 1 }, result: null }));
  writeFileSync(path, `${readFileSync(path, 'utf8')}{"id":2`, 'utf8');

  const result = log.read('test log');
  assert.deepEqual(result.records.map((r) => r.id), [1]);
  assert.equal(result.truncatedTail, true, 'a discarded record must be visible, not silent');
});

test('the fragment of an interrupted write is removed before the next append', () => {
  const path = freshPath();
  const log = new AppendLog<Row>(new FileStorage(path));
  log.withLock('test log', () => ({ record: { id: 1 }, result: null }));
  writeFileSync(path, `${readFileSync(path, 'utf8')}{"id":2`, 'utf8');

  // Without removal the new record would land on the same line as the fragment,
  // welding the two into one corrupt line in the middle of committed history —
  // damage that is not forgiven on the next read.
  log.withLock('test log', () => ({ record: { id: 3 }, result: null }));

  const result = log.read('test log');
  assert.deepEqual(result.records.map((r) => r.id), [1, 3]);
  assert.equal(result.truncatedTail, false, 'the log must end cleanly again');
});

test('truncation is measured in bytes, so multi-byte text is not cut mid-character', () => {
  const path = freshPath();
  interface Named { readonly name: string }
  const log = new AppendLog<Named>(new FileStorage(path));
  // Japanese and an em dash: every one of these is several bytes, so a
  // character-counted offset would cut inside a character and corrupt the
  // record that precedes the fragment.
  log.withLock('test log', () => ({ record: { name: '藍染めコート — 一号' }, result: null }));
  writeFileSync(path, `${readFileSync(path, 'utf8')}{"name":"未完`, 'utf8');

  log.withLock('test log', () => ({ record: { name: 'second' }, result: null }));

  assert.deepEqual(
    log.read('test log').records.map((r) => r.name),
    ['藍染めコート — 一号', 'second'],
  );
});

test('a complete final line is never mistaken for a truncated one', () => {
  const path = freshPath();
  const log = new AppendLog<Row>(new FileStorage(path));
  log.withLock('test log', () => ({ record: { id: 1 }, result: null }));
  const result = log.read('test log');
  assert.equal(result.truncatedTail, false);
  assert.equal(result.records.length, 1);
});

test('damage inside committed history throws even when the file ends cleanly', () => {
  const path = freshPath();
  writeFileSync(path, '{"id":1}\n{damaged}\n{"id":3}\n', 'utf8');
  assert.throws(() => new AppendLog<Row>(new FileStorage(path)).read('test log'), LogCorruptError);
});

test('damage inside committed history throws even when the file ends mid-line', () => {
  const path = freshPath();
  // Both a corrupt middle line and a truncated tail. The tail is forgivable;
  // the middle is not, and the forgivable one must not mask the other.
  writeFileSync(path, '{"id":1}\n{damaged}\n{"id":3', 'utf8');
  assert.throws(() => new AppendLog<Row>(new FileStorage(path)).read('test log'), LogCorruptError);
});

test('a lock held by a live writer times out rather than being stolen', () => {
  const path = freshPath();
  const log = new AppendLog<Row>(new FileStorage(path));
  writeFileSync(`${path}.lock`, '', 'utf8');           // fresh: holder is alive

  const started = Date.now();
  assert.throws(
    () => log.withLock('test log', () => ({ record: { id: 1 }, result: null })),
    LockTimeoutError,
  );
  assert.ok(
    Date.now() - started >= LOCK_TIMEOUT_MS,
    'it must wait the full timeout before giving up, not fail immediately',
  );
  assert.equal(log.read('test log').records.length, 0, 'nothing may be written without the lock');
  rmSync(`${path}.lock`);
});

test('a lock abandoned by a dead writer is reclaimed', () => {
  const path = freshPath();
  const log = new AppendLog<Row>(new FileStorage(path));
  const lockPath = `${path}.lock`;
  writeFileSync(lockPath, '', 'utf8');
  const longAgo = new Date(Date.now() - STALE_LOCK_MS * 3);
  utimesSync(lockPath, longAgo, longAgo);

  log.withLock('test log', () => ({ record: { id: 1 }, result: null }));
  assert.equal(log.read('test log').records.length, 1);
  assert.equal(existsSync(lockPath), false, 'the lock must not survive its holder');
});

test('a writer waits while another process holds the lock', async () => {
  const path = freshPath();
  const holder = resolve(import.meta.dirname, '../../scripts/lock-holder.mjs');
  const HOLD_MS = 1_200;

  const { spawn } = await import('node:child_process');
  const child = spawn('node', ['--experimental-strip-types', holder, path, String(HOLD_MS)], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  // Wait for the child to say it holds the lock. Everything after this point is
  // a measurement of exclusion, not of process startup.
  await new Promise<void>((ready) => {
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('acquired')) ready();
    });
  });

  const log = new AppendLog<Row>(new FileStorage(path));
  const started = Date.now();
  log.withLock('test log', () => ({ record: { id: 1 }, result: null }));
  const waited = Date.now() - started;

  await new Promise<void>((done) => child.on('close', () => done()));

  assert.ok(
    waited > HOLD_MS / 2,
    `the second writer entered after ${waited}ms while the lock was held for ${HOLD_MS}ms — ` +
      'read and write are not mutually exclusive across processes',
  );
  assert.equal(log.read('test log').records.length, 1);
});

test('the lock file is removed once the write completes', () => {
  const path = freshPath();
  const log = new AppendLog<Row>(new FileStorage(path));
  log.withLock('test log', () => ({ record: { id: 1 }, result: null }));
  assert.equal(existsSync(`${path}.lock`), false);
});
