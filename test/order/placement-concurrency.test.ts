/**
 * Placement under real contention.
 *
 * Two properties here are about money, not tidiness: a resubmitted form must
 * not become a second order, and two customers must never be handed the same
 * order number. Both are check-then-write decisions, which is the exact shape
 * that fails when the check and the write are not one critical section.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { Catalog, variant, type ProductInput } from '../../src/catalog/catalog.ts';
import { OrderStore } from '../../src/order/store.ts';
import { PreorderRunStore, type RunInput } from '../../src/preorder/run.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-place-race-'));
const worker = resolve(import.meta.dirname, '../../scripts/place-worker.mjs');
let n = 0;
const BARRIER_LEAD_MS = 900;

test.after(() => rmSync(dir, { recursive: true, force: true }));

const product = (): ProductInput => ({
  productId: 'PRD_test',
  code: 'OLB-CT-001',
  name: 'Test Coat',
  category: 'CT',
  status: 'PUBLISHED',
  summary: 'A fixture, not a product.',
  variants: [variant('OLB-CT-001', 'STN', 'M', { amount: 72000, currency: 'JPY' })],
  measurements: [],
  naturalRule: null,
  materials: ['Wool'],
  productionLeadDays: 60,
  actor: 'test',
});

const runInput = (overrides: Partial<RunInput> = {}): RunInput => ({
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

function paths(): { catalogPath: string; runsPath: string; ordersPath: string } {
  const id = n++;
  const catalogPath = resolve(dir, `cat-${id}.jsonl`);
  const runsPath = resolve(dir, `runs-${id}.jsonl`);
  new Catalog(catalogPath).record(product());
  const runs = new PreorderRunStore(runsPath);
  runs.record(runInput());
  runs.record(runInput({ status: 'OPEN' }));
  return { catalogPath, runsPath, ordersPath: resolve(dir, `orders-${id}.jsonl`) };
}

function race(
  p: { catalogPath: string; runsPath: string; ordersPath: string },
  args: (index: number) => readonly [string, string],
  count: number,
): Promise<string[]> {
  const startAt = String(Date.now() + BARRIER_LEAD_MS);
  return Promise.all(
    Array.from({ length: count }, (_, index) =>
      new Promise<string>((done) => {
        const child = spawn(
          'node',
          [
            '--experimental-strip-types', worker,
            p.catalogPath, p.runsPath, p.ordersPath,
            ...args(index), startAt,
          ],
          { stdio: ['ignore', 'pipe', 'ignore'] },
        );
        let out = '';
        child.stdout.on('data', (chunk) => { out += String(chunk); });
        child.on('close', () => done(out));
      }),
    ),
  );
}

test('CONCURRENCY: simultaneous customers never share an order number', async () => {
  const p = paths();
  const COUNT = 8;

  const outcomes = await race(p, (i) => [`buyer${i}`, `key-${i}`], COUNT);

  const orders = new OrderStore(p.ordersPath);
  const placed = orders.placements();
  assert.equal(placed.length, COUNT, `a concurrent order was lost (outcomes: ${outcomes.join(',')})`);
  assert.equal(
    new Set(placed.map((o) => o.number)).size,
    COUNT,
    `two customers were given the same order number (${placed.map((o) => o.number).join(',')})`,
  );
  assert.equal(new Set(placed.map((o) => o.orderId)).size, COUNT);
  assert.equal(new Set(placed.map((o) => o.customer.customerId)).size, COUNT);
});

test('CONCURRENCY: one resubmitted form is one order, however many arrive at once', async () => {
  const p = paths();
  const COUNT = 8;

  const outcomes = await race(p, () => ['ada', 'one-key'], COUNT);

  const placed = new OrderStore(p.ordersPath).placements();
  assert.equal(
    placed.length, 1,
    `${COUNT} simultaneous submissions produced ${placed.length} orders (${outcomes.join(',')})`,
  );
  assert.equal(outcomes.filter((o) => o.startsWith('placed:')).length, 1);
});

test('CONCURRENCY: one customer submitting twice at once stays one customer', async () => {
  const p = paths();
  const COUNT = 6;

  // Same person, different keys — two genuine orders, one customer identity.
  await race(p, (i) => ['ada', `key-${i}`], COUNT);

  const orders = new OrderStore(p.ordersPath);
  assert.equal(orders.placements().length, COUNT);
  assert.equal(orders.customers().length, 1, 'one person became several customers');
});
