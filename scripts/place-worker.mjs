/**
 * Places one order, then exits. Used by the placement concurrency test to
 * create genuine multi-process contention.
 *
 * argv: <catalogPath> <runsPath> <ordersPath> <who> <idempotencyKey> [startAtEpochMs]
 */
import { Catalog } from '../src/catalog/catalog.ts';
import { placeOrder } from '../src/order/placement.ts';
import { OrderStore } from '../src/order/store.ts';
import { PreorderRunStore } from '../src/preorder/run.ts';
import { FileStorage } from '../src/persistence/file-storage.ts';

const [, , catalogPath, runsPath, ordersPath, who, key, startAt] = process.argv;

if (startAt !== undefined) {
  const target = Number(startAt);
  while (Date.now() < target) { /* wait for the barrier */ }
}

try {
  const result = placeOrder(
    {
      catalog: new Catalog(new FileStorage(catalogPath)),
      runs: new PreorderRunStore(new FileStorage(runsPath)),
      orders: new OrderStore(new FileStorage(ordersPath)),
    },
    {
      email: `${who}@example.test`,
      productId: 'PRD_test',
      sku: 'OLB-CT-001-STN-M',
      quantity: 1,
      shippingAddress: { line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP' },
      idempotencyKey: key,
      reference: `ref-${who}-${key}`,
    },
  );
  process.stdout.write(`${result.outcome}:${result.order.number}`);
} catch (error) {
  process.stdout.write(`refused:${error.constructor.name}`);
}
