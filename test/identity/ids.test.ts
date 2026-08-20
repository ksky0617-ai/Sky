import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY_CODES, ULID_LEN, formatOrderNumber, formatProductCode, formatSku,
  isCustomerId, isId, isUlid, newCustomerId, newId, newUlid,
  parseOrderNumber, parseProductCode, parseSku,
} from '../../src/identity/ids.ts';

test('ULID is 26 Crockford characters and excludes I, L, O, U', () => {
  const u = newUlid();
  assert.equal(u.length, ULID_LEN);
  assert.ok(isUlid(u));
  for (const bad of ['I', 'L', 'O', 'U']) {
    assert.ok(!u.includes(bad), `ULID must not contain ${bad}`);
  }
});

test('ULID lexicographic order matches chronological order', () => {
  const ids = [1_000, 2_000, 3_000, 1_700_000_000_000].map((t) => newUlid(t));
  const sorted = [...ids].sort();
  assert.deepEqual(sorted, ids, 'ULIDs must sort by time');
});

test('ULIDs generated in the same millisecond are distinct', () => {
  const now = 1_700_000_000_000;
  const set = new Set(Array.from({ length: 2000 }, () => newUlid(now)));
  assert.equal(set.size, 2000, 'collision within one millisecond');
});

test('ULID rejects out-of-range time', () => {
  assert.throws(() => newUlid(-1), RangeError);
  assert.throws(() => newUlid(2 ** 48), RangeError);
  assert.throws(() => newUlid(1.5), RangeError);
});

test('prefixed ids round-trip and do not cross-validate', () => {
  const order = newId('order');
  assert.ok(order.startsWith('ORD_'));
  assert.ok(isId('order', order));
  assert.ok(!isId('product', order), 'an order id must not validate as a product id');
  assert.ok(!isId('order', 'ORD_notaulid'));
});

test('customer id is UUIDv4 — not sortable, therefore not enumerable', () => {
  const a = newCustomerId();
  assert.ok(isCustomerId(a));
  assert.ok(!isCustomerId('CUS_00000000-0000-0000-0000-000000000000'), 'v4 marker required');

  const ids = Array.from({ length: 200 }, () => newCustomerId());
  assert.equal(new Set(ids).size, 200);
  const sorted = [...ids].sort();
  assert.notDeepEqual(sorted, ids, 'customer ids must not come out in sorted order');
});

test('product code formats and parses', () => {
  const code = formatProductCode({ category: 'CT', sequence: 1 });
  assert.equal(code, 'OLB-CT-001');
  assert.deepEqual(parseProductCode(code), { category: 'CT', sequence: 1 });
  assert.equal(parseProductCode('OLB-ZZ-001'), null, 'unknown category rejected');
  assert.equal(parseProductCode('OLB-CT-1'), null, 'unpadded sequence rejected');
  assert.throws(() => formatProductCode({ category: 'CT', sequence: 0 }), RangeError);
  assert.throws(() => formatProductCode({ category: 'CT', sequence: 1000 }), RangeError);
});

test('every declared category code is usable', () => {
  for (const c of Object.keys(CATEGORY_CODES) as Array<keyof typeof CATEGORY_CODES>) {
    const parsed = parseProductCode(formatProductCode({ category: c, sequence: 7 }));
    assert.deepEqual(parsed, { category: c, sequence: 7 });
  }
});

test('SKU round-trips and encodes only immutable facts', () => {
  const sku = formatSku({ category: 'CT', sequence: 1, colour: 'STN', size: 'M' });
  assert.equal(sku, 'OLB-CT-001-STN-M');
  const parsed = parseSku(sku);
  assert.deepEqual(parsed, { category: 'CT', sequence: 1, colour: 'STN', size: 'M' });
  assert.deepEqual(Object.keys(parsed ?? {}).sort(), ['category', 'colour', 'sequence', 'size']);
});

test('SKU rejects malformed colour and size', () => {
  assert.throws(() => formatSku({ category: 'CT', sequence: 1, colour: 'stn', size: 'M' }), RangeError);
  assert.throws(() => formatSku({ category: 'CT', sequence: 1, colour: 'STONE', size: 'M' }), RangeError);
  assert.throws(() => formatSku({ category: 'CT', sequence: 1, colour: 'STN', size: 'medium' }), RangeError);
  assert.equal(parseSku('OLB-CT-001-STN'), null);
});

test('order number is readable, round-trips, and is UTC-stable', () => {
  const n = formatOrderNumber(new Date('2026-08-15T00:00:00Z'), 1);
  assert.equal(n, 'OLB-2608-0001');
  assert.deepEqual(parseOrderNumber(n), { year: 2026, month: 8, sequence: 1 });
  assert.equal(
    formatOrderNumber(new Date('2026-12-31T23:59:59Z'), 9999),
    'OLB-2612-9999',
  );
  assert.throws(() => formatOrderNumber(new Date(), 0), RangeError);
  assert.throws(() => formatOrderNumber(new Date(), 10000), RangeError);
  assert.equal(parseOrderNumber('OLB-2613-0001'), null, 'month 13 rejected');
});
