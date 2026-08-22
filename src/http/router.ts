/**
 * The HTTP layer.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 3 §3.4 (idempotency)
 * ADR-004 — Cloudflare Pages + Stripe hosted checkout
 * ADR-009 — no cart; this is the selection-to-order path
 *
 * Written against the Fetch API (`Request` / `Response`) rather than any
 * runtime's own server type. Cloudflare Pages Functions speak exactly this, and
 * Node has spoken it since 18, so the same handler serves the deployed site and
 * `scripts/serve.mjs` locally with no adapter beyond reading and writing a
 * stream. Nothing here imports a framework, because nothing here needs one:
 * there are two routes.
 *
 * ## Idempotency of a form post
 *
 * A customer who double-clicks, or whose browser retries, sends the same form
 * twice, and both arrive. The key that makes the second a no-op has to be
 * stable across those two submissions and different between two customers.
 *
 * A nonce in the page cannot do it. The site is static and ships no
 * JavaScript, so a hidden nonce is minted once at build time and is therefore
 * **the same value for every visitor** — every order would collapse into the
 * first one. So the key is derived from the selection itself: product, SKU,
 * quantity, email.
 *
 * The cost is explicit: one customer cannot place two separate orders for the
 * same size at the same quantity. For a pre-order of one garment that is what
 * the quantity field is for, and it is a smaller failure than either a double
 * charge or a shared nonce. If a second garment ever ships, this needs a real
 * per-session token and a runtime to mint it.
 *
 * ## Errors are pages, not JSON
 *
 * The caller is a browser submitting a form with no JavaScript to interpret a
 * payload. A refused order has to be readable by the person it was refused for.
 */

import {
  beginCheckout,
  CheckoutUnavailable,
  completeCheckout,
  type CheckoutIntent,
  type CheckoutStores,
  type CompletedCheckout,
  type PaymentGateway,
} from '../checkout/checkout.ts';
import { OrderRejected } from '../order/placement.ts';
import { escapeHtml } from '../site/markdown.ts';

export const CHECKOUT_PATH = '/checkout';
export const WEBHOOK_PATH = '/webhooks/payment';

/**
 * Verifies that a webhook really came from the gateway.
 *
 * Everything after this point is trusted: the amount, the address, the key. A
 * webhook endpoint without signature verification lets anyone post an order
 * that was never paid for, so there is no default implementation and no way to
 * skip it — a handler is constructed with one or it is not constructed.
 */
export interface WebhookVerifier {
  /** Returns the completed checkout and the intent that produced it, or null. */
  verify(body: string, headers: Headers): { intent: CheckoutIntent; completed: CompletedCheckout } | null;
}

/** The verifier until a real gateway exists. It trusts nothing. */
export class UnconfiguredVerifier implements WebhookVerifier {
  verify(): null {
    return null;
  }
}

export interface RouterOptions {
  readonly stores: CheckoutStores;
  readonly gateway: PaymentGateway;
  readonly verifier: WebhookVerifier;
}

function page(status: number, title: string, body: string): Response {
  // Deliberately plain and self-contained: this is what a customer sees when
  // something went wrong, and it must not depend on the build having run.
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} — Olibana</title>
<link rel="icon" href="data:,">
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.6 system-ui, sans-serif; margin: 0; padding: 3rem 1.5rem; max-width: 34rem; }
  h1 { font-size: 1.4rem; font-weight: 500; letter-spacing: 0.02em; }
  p { margin: 1rem 0; }
  a { color: inherit; }
</style>
</head><body><main><h1>${escapeHtml(title)}</h1>${body}<p><a href="/">Return to Olibana</a></p></main></body></html>`;
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/**
 * The idempotency key for a submission. Stable for one customer's one
 * selection; different for anyone else's. See the note at the top of the file
 * for why it is not a nonce.
 */
export function submissionKey(form: URLSearchParams): string {
  return [
    form.get('productId') ?? '',
    form.get('sku') ?? '',
    (form.get('quantity') ?? '').trim(),
    (form.get('email') ?? '').trim().toLowerCase(),
  ].join('|');
}

function readQuantity(value: string | null): number {
  const parsed = Number(value);
  // NaN fails the integer check in beginCheckout, which owns the message.
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Handles a form submission and sends the customer to the gateway.
 *
 * Nothing is written here. An abandoned checkout leaves no trace, which is why
 * the order is created on the webhook instead.
 */
async function postCheckout(options: RouterOptions, request: Request): Promise<Response> {
  const form = new URLSearchParams(await request.text());

  let intent: CheckoutIntent;
  try {
    intent = beginCheckout(options.stores, {
      productId: form.get('productId') ?? '',
      sku: form.get('sku') ?? '',
      quantity: readQuantity(form.get('quantity')),
      email: form.get('email') ?? '',
      idempotencyKey: submissionKey(form),
    });
  } catch (error) {
    if (error instanceof OrderRejected) {
      // 422: the request was understood and is refusable, which is exactly what
      // this is. The reason is shown, because the customer can usually fix it.
      return page(422, 'That order cannot be placed', `<p>${escapeHtml(error.message)}</p>`);
    }
    throw error;
  }

  try {
    const { url } = options.gateway.createSession(intent);
    return new Response(null, { status: 303, headers: { location: url, 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof CheckoutUnavailable) {
      // 503, not 500: this is a configuration state, and it is temporary by
      // definition. Saying so plainly beats a generic failure page.
      return page(
        503,
        'Ordering is not open yet',
        '<p>Payment is not connected, so no order can be taken right now. Nothing has been ' +
          'charged and nothing has been recorded.</p>',
      );
    }
    throw error;
  }
}

/**
 * Handles the gateway's confirmation that money changed hands.
 *
 * Responds 200 to anything it has already handled, because a provider that
 * receives an error redelivers — and redelivering a payment we recorded is
 * noise, while redelivering one we failed to record is the point.
 */
async function postWebhook(options: RouterOptions, request: Request): Promise<Response> {
  const body = await request.text();
  const verified = options.verifier.verify(body, request.headers);
  if (verified === null) {
    // Unsigned, unverifiable, or no gateway configured. Everything downstream
    // trusts this payload, so an unverified one is not processed at any cost.
    return new Response('unverified', { status: 400 });
  }

  try {
    const { outcome, order } = completeCheckout(options.stores, verified.intent, verified.completed);
    return new Response(`${outcome} ${order.number}`, { status: 200 });
  } catch (error) {
    if (error instanceof CheckoutUnavailable || error instanceof OrderRejected) {
      // A mismatch between what was paid and what was ordered. Retrying will
      // not fix it, so the provider is told to stop, and the payment is left
      // for a human — the money is real and the order is not.
      return new Response(`refused: ${error.message}`, { status: 422 });
    }
    throw error;
  }
}

/** Routes a request. Anything not handled here is a static file. */
export async function handleRequest(options: RouterOptions, request: Request): Promise<Response | null> {
  const { pathname } = new URL(request.url);

  if (pathname === CHECKOUT_PATH) {
    if (request.method !== 'POST') {
      // The checkout has no page of its own: arriving here by GET means a
      // bookmark or a back button, not a customer part-way through anything.
      return new Response(null, { status: 303, headers: { location: '/' } });
    }
    return postCheckout(options, request);
  }

  if (pathname === WEBHOOK_PATH) {
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
    return postWebhook(options, request);
  }

  // Not ours. The caller serves the static site.
  return null;
}
