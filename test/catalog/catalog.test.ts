import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import {
  Catalog, CatalogIntegrityError, CorruptCatalogError,
  variant, type ProductInput,
} from '../../src/catalog/catalog.ts';
import { isId } from '../../src/identity/ids.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-catalog-'));
let n = 0;
const fresh = (): Catalog => new Catalog(resolve(dir, `cat-${n++}.jsonl`));

test.after(() => rmSync(dir, { recursive: true, force: true }));

/** A complete, publishable product. Test fixture only — no such garment exists. */
const publishable = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  productId: 'PRD_test',
  code: 'OLB-CT-001',
  name: 'Test Coat',
  category: 'CT',
  status: 'PUBLISHED',
  summary: 'A fixture, not a product.',
  variants: [
    variant('OLB-CT-001', 'STN', 'S', { amount: 68000, currency: 'JPY' }),
    variant('OLB-CT-001', 'STN', 'M', { amount: 68000, currency: 'JPY' }),
  ],
  measurements: [{ label: 'Back length', bySize: { S: 92, M: 95 } }],
  naturalRule: null,
  materials: ['Wool'],
  productionLeadDays: 60,
  actor: 'test',
  ...overrides,
});

test('an empty catalogue publishes nothing', () => {
  const catalog = fresh();
  assert.deepEqual(catalog.revisions(), []);
  assert.deepEqual(catalog.products(), []);
  assert.deepEqual(catalog.published(), []);
});

test('a recorded product round-trips through reload', () => {
  const catalog = fresh();
  const recorded = catalog.record(publishable());
  assert.ok(isId('event', recorded.eventId));

  const reloaded = new Catalog(catalog.path);
  assert.equal(reloaded.published().length, 1);
  assert.deepEqual(reloaded.product('PRD_test'), recorded);
});

test('revisions are appended; the latest wins and the earlier one survives', () => {
  const catalog = fresh();
  catalog.record(publishable({ name: 'First Name' }));
  const before = readFileSync(catalog.path, 'utf8');

  catalog.record(publishable({ name: 'Second Name' }));
  const after = readFileSync(catalog.path, 'utf8');

  assert.ok(after.startsWith(before), 'an earlier revision was rewritten');
  assert.equal(catalog.revisions().length, 2, 'history was lost');
  assert.equal(catalog.products().length, 1, 'a revision created a second product');
  assert.equal(catalog.product('PRD_test')?.name, 'Second Name');
});

test('only PUBLISHED products are public', () => {
  const catalog = fresh();
  for (const status of ['DRAFT', 'READY', 'CLOSED', 'ARCHIVED'] as const) {
    catalog.record(publishable({ productId: `PRD_${status}`, status, variants: [], productionLeadDays: null }));
  }
  assert.equal(catalog.published().length, 0, 'a non-published product leaked');
  assert.equal(catalog.products().length, 4, 'private products must still be stored');
});

test('a PUBLISHED product without a price is refused', () => {
  const catalog = fresh();
  assert.throws(
    () => catalog.record(publishable({ variants: [variant('OLB-CT-001', 'STN', 'M', null)] })),
    CatalogIntegrityError,
  );
  assert.equal(catalog.revisions().length, 0, 'the invalid product was written anyway');
});

test('a PUBLISHED product without a production window is refused', () => {
  // ADR-003: the lead time must be disclosed before payment, so it must exist
  // before the page does.
  const catalog = fresh();
  assert.throws(
    () => catalog.record(publishable({ productionLeadDays: null })),
    CatalogIntegrityError,
  );
});

test('an unpriced DRAFT is fine — the rule applies at publication', () => {
  const catalog = fresh();
  const draft = catalog.record(publishable({
    status: 'DRAFT',
    variants: [variant('OLB-CT-001', 'STN', 'M', null)],
    productionLeadDays: null,
  }));
  assert.equal(draft.status, 'DRAFT');
});

test('prices must be positive integers in minor units', () => {
  const catalog = fresh();
  for (const amount of [0, -1, 68000.5]) {
    assert.throws(
      () => catalog.record(publishable({
        variants: [variant('OLB-CT-001', 'STN', 'M', { amount, currency: 'JPY' })],
      })),
      CatalogIntegrityError,
      `price ${amount} was accepted`,
    );
  }
});

test('a measurement is never zero — an unmeasured size is omitted', () => {
  const catalog = fresh();
  assert.throws(
    () => catalog.record(publishable({ measurements: [{ label: 'Back length', bySize: { S: 0 } }] })),
    CatalogIntegrityError,
  );
  // Omitting the size entirely is the correct way to say "not measured".
  const ok = catalog.record(publishable({ measurements: [{ label: 'Back length', bySize: { M: 95 } }] }));
  assert.deepEqual(Object.keys(ok.measurements[0]!.bySize), ['M']);
});

test('a SKU must belong to its product and must be unique within it', () => {
  const catalog = fresh();
  assert.throws(
    () => catalog.record(publishable({
      variants: [variant('OLB-JK-002', 'STN', 'M', { amount: 1, currency: 'JPY' })],
    })),
    CatalogIntegrityError,
    'a SKU from another product was accepted',
  );
  assert.throws(
    () => catalog.record(publishable({
      variants: [
        variant('OLB-CT-001', 'STN', 'M', { amount: 1, currency: 'JPY' }),
        variant('OLB-CT-001', 'STN', 'M', { amount: 2, currency: 'JPY' }),
      ],
    })),
    CatalogIntegrityError,
    'a duplicate SKU was accepted',
  );
});

test('a corrupt line fails loudly rather than losing the catalogue', () => {
  const catalog = fresh();
  catalog.record(publishable());
  writeFileSync(catalog.path, `${readFileSync(catalog.path, 'utf8')}{broken}\n`, 'utf8');
  assert.throws(() => catalog.revisions(), CorruptCatalogError);
});

test('the catalogue exposes no way to mutate or delete a revision', () => {
  const catalog = fresh();
  const surface = new Set([
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(catalog)),
    ...Object.getOwnPropertyNames(catalog),
  ]);
  for (const forbidden of ['update', 'delete', 'remove', 'set', 'patch', 'unpublish']) {
    assert.ok(!surface.has(forbidden), `catalogue exposes ${forbidden}()`);
  }
});
