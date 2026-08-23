/**
 * The storage implementations that are not the filesystem.
 *
 * `UnavailableStorage` is the one that matters: it stands in a deployment that
 * has been told to take no orders. Its whole purpose is to refuse a write
 * rather than accept one that goes nowhere, and a write that goes nowhere is an
 * order the customer believes was placed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { AppendLog } from '../../src/persistence/append-log.ts';
import { MemoryStorage, UnavailableStorage } from '../../src/persistence/storage.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface Row { readonly id: number }

// --- memory --------------------------------------------------------------

test('memory storage starts empty and appends without rewriting', () => {
  const storage = new MemoryStorage();
  assert.equal(storage.read(), null, 'an untouched store must be empty, not a zero-length buffer');

  storage.append(encoder.encode('a\n'));
  storage.append(encoder.encode('b\n'));
  assert.equal(decoder.decode(storage.read() as Uint8Array), 'a\nb\n');
});

test('memory storage truncates by byte length', () => {
  const storage = new MemoryStorage();
  storage.append(encoder.encode('藍\n'));      // 3 bytes + newline
  storage.truncate(4);
  assert.equal(decoder.decode(storage.read() as Uint8Array), '藍\n');
});

test('memory storage refuses to be locked twice, rather than pretending', () => {
  // Re-entering would mean a caller believed it held exclusive access while
  // something else did.
  const storage = new MemoryStorage();
  assert.throws(
    () => storage.withLock(() => storage.withLock(() => null)),
    /already locked/,
  );
  // The lock is released even after the failure, so the store is not jammed.
  assert.equal(storage.withLock(() => 'ok'), 'ok');
});

test('an append log works over memory, so log logic can be tested without a disk', () => {
  const log = new AppendLog<Row>(new MemoryStorage());
  log.withLock('test log', () => ({ record: { id: 1 }, result: null }));
  log.withLock('test log', () => ({ record: { id: 2 }, result: null }));
  assert.deepEqual(log.read('test log').records.map((r) => r.id), [1, 2]);
});

// --- unavailable ---------------------------------------------------------

test('unavailable storage reads as empty, because nothing is the truth', () => {
  // A confirmation page asking about an order should be told there is none,
  // not fail. Nothing has been recorded, and that is a real answer.
  const storage = new UnavailableStorage('order log');
  assert.equal(storage.read(), null);
  assert.deepEqual(new AppendLog<Row>(storage).read('order log').records, []);
});

test('unavailable storage REFUSES a write instead of dropping it', () => {
  // This is the property the class exists for. A silent no-op here is an order
  // the customer believes was placed and the business never sees.
  const storage = new UnavailableStorage('order log');
  assert.throws(() => storage.append(encoder.encode('x\n')), /no durable storage configured/);
  assert.throws(() => storage.truncate(0), /no durable storage configured/);
});

test('a write through an append log over unavailable storage also refuses', () => {
  // The refusal has to survive the layer above it, which is where callers are.
  const log = new AppendLog<Row>(new UnavailableStorage('order log'));
  assert.throws(
    () => log.withLock('order log', () => ({ record: { id: 1 }, result: null })),
    /no durable storage configured/,
  );
});

test('reading under the lock still works, so refusals are about writes only', () => {
  const log = new AppendLog<Row>(new UnavailableStorage('order log'));
  const seen = log.withLock<number>('order log', (records) => ({
    record: null,
    result: records.length,
  }));
  assert.equal(seen, 0);
});

test('the message names the recorded reason rather than a generic failure', () => {
  // Whoever hits this needs to know it is a configuration state with an open
  // queue item, not a bug to debug.
  assert.throws(
    () => new UnavailableStorage('order log').append(encoder.encode('x')),
    /PCQ-004/,
  );
});
