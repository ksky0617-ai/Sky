/**
 * The Cloudflare Pages Function.
 *
 * ADR-004 — Cloudflare Pages + hosted checkout.
 *
 * It is a thin adapter and nothing else: the same `handleRequest` that
 * `scripts/serve.mjs` calls, with the same stores. A second implementation of
 * the routing here would be a deployment that behaves differently from the one
 * that was tested.
 *
 * `env.ASSETS.fetch` serves the static build whenever the router declines,
 * which is every page of the site.
 */

import { UnconfiguredGateway } from '../src/checkout/checkout.ts';
import { IntentStore } from '../src/checkout/intents.ts';
import { HmacWebhookVerifier, SandboxGateway } from '../src/checkout/sandbox.ts';
import { Catalog } from '../src/catalog/catalog.ts';
import { validateEnvironment } from '../src/http/environment.ts';
import { handleRequest, UnconfiguredVerifier, type RouterOptions } from '../src/http/router.ts';
import { OrderStore } from '../src/order/store.ts';
import { PreorderRunStore } from '../src/preorder/run.ts';

interface PagesContext {
  readonly request: Request;
  readonly env: Record<string, string | undefined> & { ASSETS: { fetch(request: Request): Promise<Response> } };
}

/**
 * Builds the router options for a request.
 *
 * Configuration is validated on every request rather than cached, because a
 * Pages Function is re-created freely and a cached "valid" verdict from one
 * instance says nothing about another's environment.
 */
function optionsFor(env: PagesContext['env']): RouterOptions {
  const configured = validateEnvironment(env);

  const stores = {
    catalog: new Catalog(env.OLIBANA_CATALOG ?? 'data/catalog.jsonl'),
    runs: new PreorderRunStore(env.OLIBANA_RUNS ?? 'data/preorder-runs.jsonl'),
    orders: new OrderStore(env.OLIBANA_ORDERS ?? 'data/orders.jsonl'),
    intents: new IntentStore(env.OLIBANA_INTENTS ?? 'data/checkout-intents.jsonl'),
  };

  if (configured.mode === 'closed') {
    return { stores, gateway: new UnconfiguredGateway(), verifier: new UnconfiguredVerifier() };
  }

  const secret = configured.webhookSecret as string;
  if (configured.mode === 'sandbox') {
    return {
      stores,
      gateway: new SandboxGateway(true),
      verifier: new HmacWebhookVerifier(secret),
      sandbox: { enabled: true, secret },
    };
  }

  // live. The provider-specific gateway is the one thing a human must supply,
  // and until they do this refuses rather than inventing a checkout URL.
  return { stores, gateway: new UnconfiguredGateway(), verifier: new HmacWebhookVerifier(secret) };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const routed = await handleRequest(optionsFor(context.env), context.request);
  return routed ?? context.env.ASSETS.fetch(context.request);
}
