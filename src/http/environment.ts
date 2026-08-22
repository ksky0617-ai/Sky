/**
 * Deciding what this deployment is allowed to be.
 *
 * §31.3 Human Gate isolation · §31.18 irreversible action boundary
 *
 * There are exactly three valid configurations, and the dangerous ones are the
 * combinations in between:
 *
 *   - **closed** — no gateway, no secret. The site serves; the checkout refuses
 *     with an honest 503. This is what the repository is today.
 *   - **sandbox** — a gateway that charges nothing and a page that stands in for
 *     the provider. Everything works; no money exists.
 *   - **live** — a real gateway and a real secret. Requires a legal entity, and
 *     activating it is a human decision (P0-7, HG-04).
 *
 * The failure this file exists to prevent is a deployment that is *partly* one
 * and *partly* another: a sandbox gateway reachable in production would record
 * paid orders nobody paid for, and a live gateway without a webhook secret
 * would take money it could never confirm. Both are silent. Neither is
 * recoverable by reading logs afterwards.
 *
 * So configuration is validated once, at startup, and an invalid one refuses to
 * start rather than starting in whichever half happened to be configured.
 */

export type Mode = 'closed' | 'sandbox' | 'live';

export interface Environment {
  readonly mode: Mode;
  readonly webhookSecret: string | null;
  readonly origin: string;
}

export class EnvironmentInvalid extends Error {}

/** The smallest secret that is not a guess. Matches the verifier's own floor. */
const MIN_SECRET_LENGTH = 16;

/**
 * Reads and checks the configuration.
 *
 * Refuses rather than defaults. A default here means an operator who forgot to
 * set something gets a system that runs — in whichever mode the defaults
 * happened to produce.
 */
export function validateEnvironment(env: Readonly<Record<string, string | undefined>>): Environment {
  const declared = (env.OLIBANA_MODE ?? 'closed').trim().toLowerCase();
  const secret = env.OLIBANA_WEBHOOK_SECRET ?? '';
  const origin = env.OLIBANA_ORIGIN ?? '';

  if (!['closed', 'sandbox', 'live'].includes(declared)) {
    throw new EnvironmentInvalid(
      `OLIBANA_MODE is "${declared}". It must be closed, sandbox or live — there is no default, ` +
        'because a default decides on its own whether this deployment can take money.',
    );
  }
  const mode = declared as Mode;

  if (mode === 'closed') {
    if (secret !== '') {
      throw new EnvironmentInvalid(
        'a webhook secret is set but the mode is closed. Either this deployment takes payments ' +
          'or it does not; a half-configured one is the state that fails silently.',
      );
    }
    return { mode, webhookSecret: null, origin };
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new EnvironmentInvalid(
      `OLIBANA_MODE is ${mode} but OLIBANA_WEBHOOK_SECRET is ${secret === '' ? 'unset' : 'too short'}. ` +
        `A webhook endpoint without a verifiable signature accepts orders nobody paid for, so ${mode} ` +
        `mode requires a secret of at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }

  if (mode === 'sandbox' && /^https:\/\/(?!localhost|127\.)/.test(origin)) {
    // The sandbox records payments that never happened. On a public origin that
    // is not a test fixture, it is a way to manufacture paid orders.
    throw new EnvironmentInvalid(
      `sandbox mode refuses to run on ${origin}. It records orders as paid without any money ` +
        'moving, which must never be reachable from a public address.',
    );
  }

  return { mode, webhookSecret: secret, origin };
}

/**
 * What a human has to do to turn payments on, in order.
 *
 * Kept in code rather than prose so it cannot drift from what the code checks:
 * every item here corresponds to something `validateEnvironment` or the gateway
 * actually enforces.
 */
export const ACTIVATION_CHECKLIST: readonly string[] = [
  'Register the legal entity that will receive payments (P0-7, HG-04). Nothing below is lawful without it.',
  'Confirm the tax and duty position for every market the site will ship to (R-06, R-07 are open).',
  'Publish the returns and cancellation policy the pre-order model already promises (ADR-003).',
  'Create the payment provider account under that entity and complete its verification.',
  'Set OLIBANA_WEBHOOK_SECRET to the provider’s signing secret (16+ characters).',
  'Set OLIBANA_MODE=live and OLIBANA_ORIGIN to the public origin.',
  'Implement the provider-specific gateway and payload adapter — the signature mechanism is done; the payload shape is provider-specific.',
  'Send one real payment of the smallest possible amount and confirm the order is recorded, then refund it.',
  'Only then publish a product and open a pre-order run.',
];
