/**
 * Placing an order.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 2.2 (Order, OrderItem,
 *       Customer), Part 4 (identifiers)
 * ADR-003 — pre-order · ADR-009 — no cart; this is the selection-to-order path.
 *
 * This is the first place a customer can affect the system, so it is the first
 * place the system can be wrong about money. Every fact an order carries is
 * taken from something already recorded:
 *
 *   - the product and its price come from the catalogue, and it must be
 *     PUBLISHED — an unpublished garment is not for sale
 *   - the run comes from the pre-order log, and it must be OPEN — without one
 *     there is no window to promise and no minimum to count toward
 *   - the promised ship date is COPIED from the run, so a later change to the
 *     run cannot rewrite what this customer was told (SPEC Part 2.2)
 *
 * Nothing is defaulted. An order that cannot be built from recorded facts is
 * refused with the reason, not completed with a plausible one.
 */

import { Catalog, type ProductRevision, type Variant } from '../catalog/catalog.ts';
import { formatOrderNumber, newCustomerId, newId, parseOrderNumber } from '../identity/ids.ts';
import { PreorderRunStore, isOpen } from '../preorder/run.ts';
import type {
  CustomerFacts,
  OrderItemSnapshot,
  OrderPlacement,
  OrderRecord,
  OrderStore,
} from './store.ts';

export class OrderRejected extends Error {}

export interface PlacementRequest {
  readonly email: string;
  readonly name?: string;
  readonly productId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly shippingAddress: Readonly<Record<string, string>>;
  /** Makes a resubmitted form a no-op rather than a second order. */
  readonly idempotencyKey: string;
  readonly sessionId?: string;
  readonly signalId?: string;
  readonly placedAt?: Date;
}

export type PlacementResult =
  | { readonly outcome: 'placed'; readonly order: OrderPlacement }
  | { readonly outcome: 'duplicate'; readonly order: OrderPlacement };

export interface PlacementStores {
  readonly catalog: Catalog;
  readonly runs: PreorderRunStore;
  readonly orders: OrderStore;
}

/** Lower-cased and trimmed, so one person is one customer. */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Deliberately permissive: it rejects what cannot be an address, nothing more. */
function assertEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new OrderRejected(`"${email}" is not an email address we can send an order to`);
  }
}

function assertAddress(address: Readonly<Record<string, string>>): void {
  const required = ['line1', 'city', 'postalCode', 'country'];
  const missing = required.filter((field) => (address[field] ?? '').trim() === '');
  if (missing.length > 0) {
    throw new OrderRejected(
      `the shipping address is missing ${missing.join(', ')}. A pre-order is dispatched months ` +
        'after it is placed, so an address that cannot be delivered to fails long after the ' +
        'customer could have corrected it.',
    );
  }
}

function findSellable(
  catalog: Catalog,
  productId: string,
  sku: string,
): { product: ProductRevision; variant: Variant } {
  const product = catalog.product(productId);
  if (product === null) throw new OrderRejected(`${productId} is not in the catalogue`);
  if (product.status !== 'PUBLISHED') {
    throw new OrderRejected(`${product.code} is ${product.status}, not published — it is not for sale`);
  }
  const variant = product.variants.find((v) => v.sku === sku);
  if (variant === undefined) {
    throw new OrderRejected(`${sku} is not a variant of ${product.code}`);
  }
  if (variant.priceAmount === null || variant.priceCurrency === null) {
    throw new OrderRejected(
      `${sku} has no price. Taking money for it would mean choosing the amount here, which is ` +
        'not a decision this code is allowed to make.',
    );
  }
  return { product, variant };
}

/**
 * The next customer-facing number for the month, continuing the existing series.
 *
 * Takes the highest sequence already used rather than counting records: a
 * count collides the moment any number is missing from the middle, and a
 * collision means two customers holding one order number.
 */
function nextOrderNumber(existing: readonly OrderPlacement[], now: Date): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const highest = existing.reduce((max, placed) => {
    const parsed = parseOrderNumber(placed.number);
    if (parsed === null || parsed.year !== year || parsed.month !== month) return max;
    return Math.max(max, parsed.sequence);
  }, 0);
  return formatOrderNumber(now, highest + 1);
}

/**
 * Places an order and records it.
 *
 * Everything is decided inside the log's lock: the duplicate check, the
 * customer lookup, the order number, and the write. Two customers submitting at
 * the same instant cannot be given the same number, and a resubmitted form
 * cannot become a second order.
 */
export function placeOrder(
  { catalog, runs, orders }: PlacementStores,
  request: PlacementRequest,
): PlacementResult {
  const email = normaliseEmail(request.email);
  assertEmail(email);
  assertAddress(request.shippingAddress);

  if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
    throw new OrderRejected(`quantity must be a positive whole number, received ${request.quantity}`);
  }

  const { product, variant } = findSellable(catalog, request.productId, request.sku);

  const run = runs.openRunFor(request.productId);
  if (run === null || !isOpen(run.status)) {
    throw new OrderRejected(
      `${product.code} has no open pre-order run. Nothing can be promised about when it would ` +
        'ship, so nothing may be taken for it.',
    );
  }
  if (run.promisedShipBy === null) {
    // Unreachable through an open run, which cannot exist without this date.
    // Kept so a change to that rule fails here rather than silently promising nothing.
    throw new OrderRejected(`${run.runId} is open without a promised ship date`);
  }

  const now = request.placedAt ?? new Date();
  const unitPriceAmount = variant.priceAmount as number;
  const currency = variant.priceCurrency as string;
  const subtotalAmount = unitPriceAmount * request.quantity;

  return orders.recordPlacement<PlacementResult>((records: readonly OrderRecord[]) => {
    const placements = records.filter((r): r is OrderPlacement => r.kind === 'placement');

    const existing = placements.find((p) => p.idempotencyKey === request.idempotencyKey);
    if (existing !== undefined) {
      // A resubmitted form, or a retried request. One key, one order.
      return { record: null, result: { outcome: 'duplicate', order: existing } };
    }

    const known = placements.find((p) => p.customer.email === email);
    const customer: CustomerFacts = known?.customer ?? {
      customerId: newCustomerId(),
      email,
      name: request.name?.trim() || null,
    };

    const item: OrderItemSnapshot = {
      sku: variant.sku,
      size: variant.size,
      colour: variant.colour,
      quantity: request.quantity,
      unitPriceAmount,
      currency,
    };

    const order: OrderPlacement = {
      kind: 'placement',
      eventId: newId('event'),
      orderId: newId('order'),
      number: nextOrderNumber(placements, now),
      customer,
      productId: product.productId,
      preorderRunId: run.runId,
      items: [item],
      promisedShipBy: run.promisedShipBy as string,
      shippingAddress: request.shippingAddress,
      subtotalAmount,
      // Shipping and tax are not yet determined — R-06 is open and no carrier
      // rate exists. The total is the subtotal, and says so, rather than
      // carrying a zero that would read as "shipping is free".
      totalAmount: subtotalAmount,
      currency,
      placedAt: now.toISOString(),
      idempotencyKey: request.idempotencyKey,
      ...(request.sessionId !== undefined ? { sessionId: request.sessionId } : {}),
      ...(request.signalId !== undefined ? { signalId: request.signalId } : {}),
    };

    return { record: order, result: { outcome: 'placed', order } };
  });
}
