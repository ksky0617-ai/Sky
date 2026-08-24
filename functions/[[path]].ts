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
import { handleRequest, internalError, UnconfiguredVerifier, type RouterOptions } from '../src/http/router.ts';
import { OrderStore } from '../src/order/store.ts';
import { UnavailableStorage, type LogStorage } from '../src/persistence/storage.ts';
import { PreorderRunStore } from '../src/preorder/run.ts';

interface PagesContext {
  readonly request: Request;
  readonly env: Record<string, string | undefined> & { ASSETS: { fetch(request: Request): Promise<Response> } };
}

/**
 * Chooses where the logs live.
 *
 * `node:fs` is reached by **dynamic** import and only when file paths are
 * configured. That is not a style preference: Cloudflare Workers have no
 * `node:fs`, so a static import of it here made this whole function fail to
 * load — in every mode, including the `closed` mode that writes nothing at all.
 * The deployed site could not have served one request.
 *
 * When no paths are configured, storage refuses writes rather than accepting
 * ones that would go nowhere. A Workers deployment that needs to record orders
 * needs a durable store first (PCQ-004); until then `closed` is the only mode
 * it can honestly run in.
 */
async function storageFor(env: PagesContext['env']): Promise<(name: string) => LogStorage> {
  const paths: Record<string, string | undefined> = {
    catalog: env.OLIBANA_CATALOG,
    runs: env.OLIBANA_RUNS,
    orders: env.OLIBANA_ORDERS,
    intents: env.OLIBANA_INTENTS,
  };
  if (Object.values(paths).every((p) => p === undefined)) {
    return (name) => new UnavailableStorage(`${name} log`);
  }

  const { FileStorage } = await import('../src/persistence/file-storage.ts');
  return (name) => {
    const path = paths[name];
    return path === undefined ? new UnavailableStorage(`${name} log`) : new FileStorage(path);
  };
}

/**
 * Builds the router options for a request.
 *
 * Configuration is validated on every request rather than cached, because a
 * Pages Function is re-created freely and a cached "valid" verdict from one
 * instance says nothing about another's environment.
 */
async function optionsFor(env: PagesContext['env']): Promise<RouterOptions> {
  const configured = validateEnvironment(env);
  const storage = await storageFor(env);

  const stores = {
    catalog: new Catalog(storage('catalog')),
    runs: new PreorderRunStore(storage('runs')),
    orders: new OrderStore(storage('orders')),
    intents: new IntentStore(storage('intents')),
  };

  if (configured.mode === 'closed') {
    return { stores, env, gateway: new UnconfiguredGateway(), verifier: new UnconfiguredVerifier() };
  }

  const secret = configured.webhookSecret as string;
  if (configured.mode === 'sandbox') {
    return {
      stores,
      env,
      gateway: new SandboxGateway(true),
      verifier: new HmacWebhookVerifier(secret),
      sandbox: { enabled: true, secret },
    };
  }

  // live. The provider-specific gateway is the one thing a human must supply,
  // and until they do this refuses rather than inventing a checkout URL.
  return { stores, env, gateway: new UnconfiguredGateway(), verifier: new HmacWebhookVerifier(secret) };
}

/**
 * The deployment's outermost error boundary.
 *
 * There was none. Anything that threw — and `validateEnvironment` throws by
 * design on a half-configured deployment, the most likely state of a first
 * deploy — escaped to the platform, which answered with its own error page:
 * no security headers, no `referrer-policy`, and content this project does not
 * control on a domain that carries its name.
 *
 * The catch is deliberately total. A boundary that re-throws some errors is a
 * boundary with a hole, and the one thing known about an unexpected error is
 * that nobody predicted its shape.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  try {
    const routed = await handleRequest(await optionsFor(context.env), context.request);
    return routed ?? context.env.ASSETS.fetch(context.request);
  } catch (error) {
    // The operator's copy. The visitor's copy carries none of it.
    console.error('unhandled request failure', error);
    return internalError();
  }
}
