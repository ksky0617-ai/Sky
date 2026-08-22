/**
 * A payment gateway that moves no money, and a signature verifier that really
 * verifies.
 *
 * ADR-004 — Stripe hosted checkout · §31.3 Human Gate isolation
 *
 * ## Why this exists
 *
 * No legal entity exists, so no live gateway can. That blocks *taking money*.
 * It does not block the checkout, the webhook contract, the failure handling,
 * the idempotency, or the confirmation — and leaving those unwritten because a
 * human decision is pending would be mistaking a boundary for a wall.
 *
 * So there are two things here:
 *
 *   - `SandboxGateway`, which issues a session that charges nothing and refuses
 *     to exist outside a sandbox.
 *   - `HmacWebhookVerifier`, which is a **real** signature check: HMAC-SHA256
 *     over `timestamp.payload`, constant-time comparison, and a freshness
 *     window. That is the actual mechanism Stripe uses, so when a human
 *     supplies the account and the secret, what changes is the payload shape,
 *     not the security model.
 *
 * ## The safety property that matters
 *
 * A sandbox gateway that could run in production would be a way to record paid
 * orders nobody paid for. `SandboxGateway` therefore takes an explicit flag and
 * throws if it is not set, and the router refuses to route to it in production.
 * The check is not a comment; it is a constructor argument with no default.
 *
 * Web Crypto is used rather than `node:crypto` because the same code has to run
 * on Cloudflare Workers, where only the former exists.
 */

import { CheckoutUnavailable, type CheckoutIntent, type CompletedCheckout, type PaymentGateway } from './checkout.ts';

/** How far out of date a signed webhook may be before it is refused. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export class SandboxRefused extends Error {}

/**
 * Issues sessions that charge nothing.
 *
 * The returned URL points at this application's own sandbox page rather than an
 * external host, so the whole flow can be exercised end to end with no network,
 * no account and no money.
 */
export class SandboxGateway implements PaymentGateway {
  /**
   * @param enabled must be explicitly true. There is no default, because a
   *   default is how a sandbox ends up in production.
   */
  constructor(enabled: boolean) {
    if (enabled !== true) {
      throw new SandboxRefused(
        'the sandbox gateway must be enabled explicitly. It records payments that never ' +
          'happened, so it may never be reachable by accident.',
      );
    }
  }

  /**
   * A relative URL, because the sandbox page is this application's own.
   *
   * An absolute one built from a configured origin loses whatever the origin
   * omits — a port, most obviously — and sends the customer to a host that is
   * not the one they are on. A real gateway's URL is absolute because it points
   * somewhere else; this one does not.
   */
  createSession(intent: CheckoutIntent): { readonly url: string } {
    const query = new URLSearchParams({ ref: intent.reference });
    return { url: `/sandbox/pay?${query.toString()}` };
  }
}

/** The signed envelope a gateway posts back. Shape is ours; the mechanism is standard. */
export interface SignedWebhook {
  /**
   * Names the agreement this payment settles. Everything else about that
   * agreement — the SKU, the quantity, the idempotency key, the price — is read
   * from the recorded intent, not from here. A signed message proves who sent
   * it, not that what it claims was ever agreed.
   */
  readonly reference: string;
  readonly providerRef: string;
  readonly email: string;
  readonly shippingAddress: Readonly<Record<string, string>>;
  readonly amountPaid: number;
  readonly currency: string;
}

const encoder = new TextEncoder();

async function sign(secret: string, timestamp: number, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Builds the header a gateway would send. Used by the sandbox and by tests. */
export async function signWebhook(
  secret: string,
  body: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  return `t=${timestamp},v1=${await sign(secret, timestamp, body)}`;
}

/**
 * Comparison that does not leak where two strings first differ.
 *
 * A byte-by-byte `===` returns sooner for a signature that is wrong early, and
 * that timing difference is enough to recover a valid signature one byte at a
 * time. This reads both strings in full regardless.
 */
function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export interface VerifiedWebhook {
  readonly signed: SignedWebhook;
}

/**
 * Verifies a webhook signature, then hands back the payload.
 *
 * Returns null for every failure — bad signature, stale timestamp, unparseable
 * body — because the caller has nothing useful to do with the distinction and
 * telling an attacker which part failed is free information.
 */
export class HmacWebhookVerifier {
  readonly #secret: string;

  constructor(secret: string) {
    if (secret.length < 16) {
      throw new CheckoutUnavailable(
        'the webhook secret is too short to be a secret. An endpoint that trusts a guessable ' +
          'signature is an endpoint that records orders nobody paid for.',
      );
    }
    this.#secret = secret;
  }

  async verify(body: string, headers: Headers): Promise<SignedWebhook | null> {
    const header = headers.get('x-olibana-signature') ?? '';
    const parts = new Map(
      header.split(',').map((part) => {
        const at = part.indexOf('=');
        return [part.slice(0, at).trim(), part.slice(at + 1).trim()] as const;
      }),
    );
    const timestamp = Number(parts.get('t'));
    const received = parts.get('v1') ?? '';
    if (!Number.isFinite(timestamp) || received === '') return null;

    // Freshness first: a captured-and-replayed webhook carries a valid
    // signature forever otherwise.
    const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
    if (age > SIGNATURE_TOLERANCE_SECONDS) return null;

    const expected = await sign(this.#secret, timestamp, body);
    if (!equalsConstantTime(expected, received)) return null;

    try {
      return JSON.parse(body) as SignedWebhook;
    } catch {
      return null;
    }
  }
}

/**
 * Turns a verified envelope into the completion the checkout expects.
 *
 * The idempotency key comes from the intent rather than the payload: two copies
 * of one fact can disagree, and the copy an outsider controls is the wrong one
 * to believe.
 */
export function toCompletedCheckout(signed: SignedWebhook, idempotencyKey: string): CompletedCheckout {
  return {
    idempotencyKey,
    providerRef: signed.providerRef,
    email: signed.email,
    shippingAddress: signed.shippingAddress,
    amountPaid: signed.amountPaid,
    currency: signed.currency,
  };
}
