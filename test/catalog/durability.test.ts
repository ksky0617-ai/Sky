/**
 * The catalogue is the second writer to the persistence layer, so it carries
 * the same two risks as the order log and must be measured, not assumed to
 * inherit the order log's evidence.
 *
 * A lost catalogue revision is not cosmetic: a price correction that does not
 * land leaves the previous price on a page that asks for money.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { Catalog, LogCorruptError, variant } from '../../src/catalog/catalog.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-cat-dur-'));
const worker = resolve(import.meta.dirname, '../../scripts/catalog-worker.mjs');
let n = 0;
const freshPath = (): string => resolve(dir, `cat-${n++}.jsonl`);

test.after(() => rmSync(dir, { recursive: true, force: true }));

/** Enough for every spawned worker to be up and spinning on the barrier. */
const BARRIER_LEAD_MS = 700;

function record(
  path: string,
  productId: string,
  code: string,
  name: string,
  startAt?: string,
): Promise<string> {
  return new Promise((done) => {
    const argv = ['--experimental-strip-types', worker, path, productId, code, name];
    if (startAt !== undefined) argv.push(startAt);
    const child = spawn('node', argv, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (chunk) => { out += String(chunk); });
    child.on('close', () => done(out));
  });
}

/** Records `count` revisions that all begin at the same instant. */
function race(
  path: string,
  args: (index: number) => readonly [string, string, string],
  count: number,
): Promise<string[]> {
  const startAt = String(Date.now() + BARRIER_LEAD_MS);
  return Promise.all(
    Array.from({ length: count }, (_, i) => record(path, ...args(i), startAt)),
  );
}

test('CONCURRENCY: parallel revisions from separate processes all survive', async () => {
  const path = freshPath();
  const COUNT = 10;

  const ids = await race(
    path,
    (i) => [`PRD_${i}`, `OLB-CT-${String(i + 1).padStart(3, '0')}`, `garment ${i}`],
    COUNT,
  );

  const catalog = new Catalog(path);                  // throws if any line is malformed
  assert.equal(catalog.revisions().length, COUNT, 'a concurrent revision was lost or duplicated');
  assert.equal(catalog.products().length, COUNT);
  assert.equal(new Set(ids).size, COUNT, 'two revisions were given the same event id');
});

test('CONCURRENCY: parallel revisions of ONE product resolve to a single latest', async () => {
  const path = freshPath();
  const COUNT = 6;

  await race(path, (i) => ['PRD_same', 'OLB-CT-001', `revision ${i}`], COUNT);

  const catalog = new Catalog(path);
  assert.equal(catalog.revisions().length, COUNT, 'a revision of a contended product was lost');
  assert.equal(catalog.products().length, 1, 'one product must not become several');
});

test('CONCURRENCY: one product code cannot be claimed by two products at once', async () => {
  const path = freshPath();
  const COUNT = 8;

  // Every process claims OLB-CT-001 for a different product, simultaneously.
  // Uniqueness is checked against the log and then written to it; if those two
  // steps are not one critical section, several claims pass the check together
  // and the public identifier stops identifying anything.
  const outcomes = await race(path, (i) => [`PRD_claim_${i}`, 'OLB-CT-001', `garment ${i}`], COUNT);

  const catalog = new Catalog(path);
  const claimants = new Set(catalog.revisions().map((r) => r.productId));
  assert.equal(
    claimants.size,
    1,
    `OLB-CT-001 was recorded against ${claimants.size} products (outcomes: ${outcomes.join(',')})`,
  );
  assert.equal(
    outcomes.filter((o) => o.startsWith('refused:')).length,
    COUNT - 1,
    'every loser of the race must be refused, not silently ignored',
  );
});

test('CRASH: a truncated final revision does not brick the catalogue', () => {
  const path = freshPath();
  const catalog = new Catalog(path);
  catalog.record({
    productId: 'PRD_crash',
    code: 'OLB-CT-001',
    name: 'coat',
    category: 'CT',
    status: 'DRAFT',
    summary: 'complete',
    variants: [variant('OLB-CT-001', 'STN', 'M', null)],
    measurements: [],
    naturalRule: null,
    materials: [],
    productionLeadDays: null,
    actor: 'test',
  });

  const partial = JSON.stringify({ productId: 'PRD_crash', name: 'never finished' }).slice(0, 24);
  writeFileSync(path, `${readFileSync(path, 'utf8')}${partial}`, 'utf8');

  const reopened = new Catalog(path);
  assert.equal(reopened.revisions().length, 1, 'the committed revision was lost');
  assert.equal(reopened.product('PRD_crash')?.summary, 'complete');
});

test('CORRUPTION: damage inside catalogue history still throws', () => {
  const path = freshPath();
  writeFileSync(path, '{"productId":"a"}\n{damaged}\n{"productId":"c"}\n', 'utf8');
  assert.throws(() => new Catalog(path).revisions(), LogCorruptError);
});
