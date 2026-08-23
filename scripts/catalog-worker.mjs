/**
 * Records one product revision, then exits. Used by the catalogue durability
 * test to create genuine multi-process contention rather than simulated
 * contention.
 *
 * argv: <catalogPath> <productId> <code> <name>
 */
import { Catalog, variant } from '../src/catalog/catalog.ts';
import { FileStorage } from '../src/persistence/file-storage.ts';

const [, , catalogPath, productId, code, name, startAt] = process.argv;

if (startAt !== undefined) {
  // Wall-clock barrier: without it this measures process startup jitter rather
  // than contention. See test/order/durability.test.ts for why that matters.
  const target = Number(startAt);
  while (Date.now() < target) { /* wait for the barrier */ }
}

const catalog = new Catalog(new FileStorage(catalogPath));

try {
  const revision = catalog.record({
    productId,
    code,
    name,
    category: 'CT',
    status: 'DRAFT',
    summary: `written by pid ${process.pid}`,
    variants: [variant(code, 'STN', 'M', null)],
    measurements: [],
    naturalRule: null,
    materials: [],
    productionLeadDays: null,
    actor: `pid:${process.pid}`,
  });
  process.stdout.write(revision.eventId);
} catch (error) {
  // Refusals are an expected outcome under contention — the test reads them.
  process.stdout.write(`refused:${error.constructor.name}`);
}
