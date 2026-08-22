/**
 * The checkout boundary.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 2.2 (Payment), Part 3
 * ADR-004 — Cloudflare Pages + Stripe hosted checkout
 * ADR-009 — no cart; this is the selection-to-order path
 *
 * ## Why the order is created on the webhook, not on the form submission
 *
 * ADR-004 chose *hosted* checkout, which is what makes this architecture cost
 * nothing and hold no card data. A consequence follows that is easy to miss:
 * **Stripe collects the shipping address, not us.** So at form-submission time
 * there is no address, and an order requires one.
 *
 * The sequence is therefore:
 *
 *   1. `beginCheckout` — validate everything that can be validated, and produce
 *      the intent. No order yet. Nobody has paid.
 *   2. The gateway takes the customer's money and their address.
 *   3. `completeCheckout` — the order is placed, with the address the gateway
 *      collected, and immediately marked PAID.
 *
 * The alternative — creating the order first and filling in the address later —
 * would leave abandoned checkouts as orders in the log that nobody placed, and
 * `committedUnits` counts orders.
 *
 * ## What is deliberately not here
 *
 * No network call, no SDK, no secret. `PaymentGateway` is an interface with one
 * method. Executing a real payment is a Human Gate (HG-04 legal entity, P0-7),
 * and `UnconfiguredGateway` is what stands there until a human configures one —
 * it refuses, in as many words, rather than pretending.
 */

import type { Catalog } from '../catalog/catalog.ts';
import { newId } from '../identity/ids.ts';
import {
  assertEmail,
  normaliseEmail,
  OrderRejected,
  placeOrder,
  type PlacementStores,
} from '../order/placement.ts';
import type { OrderPlacement, OrderStore } from '../order/store.ts';
import type { PreorderRunStore } from '../preorder/run.ts';
import type { IntentStore } from './intents.ts';

export class CheckoutUnavailable extends Error {}

/** What the customer chose, before anyone has been charged. */
export interface CheckoutIntent {
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly quantity: number;
  readonly unitPriceAmount: number;
  readonly currency: string;
  readonly totalAmount: number;
  readonly email: string;
  readonly preorderRunId: string;
  readonly promisedShipBy: string;
  /** Carried through the gateway and back, so the return trip is verifiable. */
  readonly idempotencyKey: string;
  /**
   * The token the customer returns with. Minted here, unguessable, and unrelated
   * to anything they know about themselves — see `OrderPlacement.reference`.
   */
  readonly reference: string;
}

/** What the gateway returns once it has taken payment. */
export interface CompletedCheckout {
  readonly idempotencyKey: string;
  readonly providerRef: string;
  readonly email: string;
  readonly shippingAddress: Readonly<Record<string, string>>;
  readonly amountPaid: number;
  readonly currency: string;
  readonly sessionId?: string;
  readonly signalId?: string;
}

export interface PaymentGateway {
  /** Returns the URL to send the customer to. Never called during tests. */
  createSession(intent: CheckoutIntent): { readonly url: string };
}

/**
 * The gateway until a human configures a real one.
 *
 * Refusing loudly is the point. A stub that returned a plausible URL would make
 * a broken funnel look like a working one, and the funnel audit would pass.
 */
export class UnconfiguredGateway implements PaymentGateway {
  createSession(): { readonly url: string } {
    throw new CheckoutUnavailable(
      'no payment gateway is configured. Taking money requires a legal entity and a live ' +
        'account (P0-7, HG-04); until both exist this refuses rather than sending a customer ' +
        'to a checkout that cannot complete.',
    );
  }
}

export interface CheckoutStores extends PlacementStores {
  readonly catalog: Catalog;
  readonly runs: PreorderRunStore;
  readonly orders: OrderStore;
  /** Where an agreement is written down before the money moves. */
  readonly intents: IntentStore;
}

export interface BeginRequest {
  readonly productId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly email: string;
  readonly idempotencyKey: string;
}

/**
 * Validates a selection and produces the intent to pay for it.
 *
 * Everything checkable is checked HERE, before the customer is sent anywhere:
 * the product is published, the variant exists and is priced, and a run is
 * open. Discovering any of that after payment means issuing a refund for a
 * mistake that was visible beforehand.
 */
export function beginCheckout(stores: CheckoutStores, request: BeginRequest): CheckoutIntent {
  const product = stores.catalog.product(request.productId);
  if (product === null || product.status !== 'PUBLISHED') {
    throw new OrderRejected(`${request.productId} is not for sale`);
  }
  const variant = product.variants.find((v) => v.sku === request.sku);
  if (variant === undefined) {
    throw new OrderRejected(`${request.sku} is not a variant of ${product.code}`);
  }
  if (variant.priceAmount === null || variant.priceCurrency === null) {
    throw new OrderRejected(`${request.sku} has no price`);
  }
  if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
    throw new OrderRejected(`quantity must be a positive whole number, received ${request.quantity}`);
  }
  const run = stores.runs.openRunFor(request.productId);
  if (run === null || run.promisedShipBy === null) {
    throw new OrderRejected(
      `${product.code} has no open pre-order run, so there is no ship date to promise`,
    );
  }
  if (request.idempotencyKey.trim() === '') {
    throw new OrderRejected('a checkout needs an idempotency key, or a retry becomes a second order');
  }
  // Checked here as well as at placement. Placement happens after the payment,
  // so an address that cannot receive a confirmation would otherwise surface
  // as a refund rather than as a correctable typo.
  const email = normaliseEmail(request.email);
  assertEmail(email);

  const intent: CheckoutIntent = {
    productId: product.productId,
    productName: product.name,
    sku: variant.sku,
    quantity: request.quantity,
    unitPriceAmount: variant.priceAmount,
    currency: variant.priceCurrency,
    totalAmount: variant.priceAmount * request.quantity,
    email,
    preorderRunId: run.runId,
    promisedShipBy: run.promisedShipBy,
    idempotencyKey: request.idempotencyKey,
    reference: newId('event'),
  };

  // Written before the customer is sent anywhere. When the gateway posts back,
  // this is what says what was agreed — not the catalogue, which may have
  // moved, and not the payload, which is the message being checked.
  stores.intents.record(intent);
  return intent;
}

export type CompletionResult =
  | { readonly outcome: 'placed'; readonly order: OrderPlacement }
  | { readonly outcome: 'duplicate'; readonly order: OrderPlacement };

/**
 * Places and pays for the order the gateway just collected money for.
 *
 * Idempotent by the key that travelled through the gateway: a redelivered
 * webhook finds the order already placed and already paid, and does nothing.
 * That is not a nicety — payment providers redeliver by design.
 */
export function completeCheckout(
  stores: CheckoutStores,
  intent: CheckoutIntent,
  completed: CompletedCheckout,
): CompletionResult {
  if (completed.idempotencyKey !== intent.idempotencyKey) {
    throw new CheckoutUnavailable(
      'the completed payment does not carry the key of the checkout it claims to complete',
    );
  }
  if (completed.amountPaid !== intent.totalAmount || completed.currency !== intent.currency) {
    // Refusing to record an order the customer did not pay for. The money is
    // real either way, so this must surface as a mismatch a human resolves,
    // never as an order silently reconciled to whatever arrived.
    throw new CheckoutUnavailable(
      `the amount paid (${completed.amountPaid} ${completed.currency}) is not the amount ` +
        `checked out (${intent.totalAmount} ${intent.currency})`,
    );
  }

  const placement = placeOrder(stores, {
    email: completed.email,
    productId: intent.productId,
    sku: intent.sku,
    quantity: intent.quantity,
    shippingAddress: completed.shippingAddress,
    idempotencyKey: intent.idempotencyKey,
    reference: intent.reference,
    // What the customer was quoted and paid, not what the catalogue says now.
    agreedUnitPrice: { amount: intent.unitPriceAmount, currency: intent.currency },
    ...(completed.sessionId !== undefined ? { sessionId: completed.sessionId } : {}),
    ...(completed.signalId !== undefined ? { signalId: completed.signalId } : {}),
  });

  const { order } = placement;
  // Recorded whether or not the placement was a duplicate: the transition has
  // its own idempotency, so a redelivery is a no-op there too, and relying on
  // the placement's outcome would skip the payment record if the two writes
  // were ever split by a crash between them.
  stores.orders.append({
    orderId: order.orderId,
    to: 'PAID',
    actor: 'gateway',
    idempotencyKey: `${intent.idempotencyKey}:paid`,
    reason: `payment ${completed.providerRef}`,
    ...(completed.sessionId !== undefined ? { sessionId: completed.sessionId } : {}),
    ...(completed.signalId !== undefined ? { signalId: completed.signalId } : {}),
  });

  return { outcome: placement.outcome, order };
}
