/**
 * Serves the built site, with the checkout routes live.
 *
 * The same `handleRequest` that a Cloudflare Pages Function would call is
 * mounted here, so the selection-to-order path is genuinely runnable locally
 * rather than only unit-tested. Static files are served when the router
 * declines a request.
 *
 * No payment gateway is configured, so a submitted form gets an honest 503.
 * That is the true state of the system, and this server does not pretend
 * otherwise.
 *
 *   node --experimental-strip-types scripts/serve.mjs [dist] [port]
 *
 * OLIBANA_CATALOG / OLIBANA_RUNS / OLIBANA_ORDERS override the data paths, so a
 * fixture product can be served without recording one in the repository.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';

import { Catalog } from '../src/catalog/catalog.ts';
import { UnconfiguredGateway } from '../src/checkout/checkout.ts';
import { IntentStore } from '../src/checkout/intents.ts';
import { HmacWebhookVerifier, SandboxGateway } from '../src/checkout/sandbox.ts';
import { validateEnvironment } from '../src/http/environment.ts';
import { handleRequest, UnconfiguredVerifier } from '../src/http/router.ts';
import { OrderStore } from '../src/order/store.ts';
import { PreorderRunStore } from '../src/preorder/run.ts';
import { CATALOG_PATH, RUNS_PATH } from '../src/site/routes.ts';
import { FileStorage } from '../src/persistence/file-storage.ts';

const root = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? 0);
const ORDERS_PATH = resolve(import.meta.dirname, '../data/orders.jsonl');

// Same validation the deployed function runs. A local server that accepted a
// configuration the deployment refuses would be testing a different system.
const configured = validateEnvironment(process.env);

const stores = {
  catalog: new Catalog(new FileStorage(process.env.OLIBANA_CATALOG ?? CATALOG_PATH)),
  runs: new PreorderRunStore(new FileStorage(process.env.OLIBANA_RUNS ?? RUNS_PATH)),
  orders: new OrderStore(new FileStorage(process.env.OLIBANA_ORDERS ?? ORDERS_PATH)),
  intents: new IntentStore(new FileStorage(process.env.OLIBANA_INTENTS ?? resolve(import.meta.dirname, '../data/checkout-intents.jsonl'))),
};

const options = configured.mode === 'sandbox'
  ? {
      stores,
      env: process.env,
      gateway: new SandboxGateway(true),
      verifier: new HmacWebhookVerifier(configured.webhookSecret),
      sandbox: { enabled: true, secret: configured.webhookSecret },
    }
  : {
      stores,
      env: process.env,
      gateway: new UnconfiguredGateway(),
      verifier: configured.mode === 'live'
        ? new HmacWebhookVerifier(configured.webhookSecret)
        : new UnconfiguredVerifier(),
    };

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

/**
 * Applies the built `_headers` file to static responses.
 *
 * Cloudflare Pages reads that file; this server did not, so static pages here
 * carried no security headers while the deployed ones would. The smoke test
 * caught it on its first run — and a smoke test that passes against production
 * but fails against local (or the reverse) cannot gate a deploy, which is the
 * only thing it is for.
 *
 * Only the `/*` block is honoured. That is all the build emits, and guessing at
 * Cloudflare's fuller matching syntax would be inventing behaviour this server
 * cannot actually promise.
 */
function staticHeaders(root) {
  const file = resolve(root, '_headers');
  if (!existsSync(file)) return {};
  const headers = {};
  let inGlobalBlock = false;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;
    if (!line.startsWith(' ')) { inGlobalBlock = line.trim() === '/*'; continue; }
    if (!inGlobalBlock) continue;
    const at = line.indexOf(':');
    if (at > 0) headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return headers;
}

const STATIC_HEADERS = staticHeaders(root);

async function toRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  return new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
    method: req.method,
    headers: new Headers(req.headers),
    ...(body !== undefined ? { body } : {}),
  });
}

const server = createServer((req, res) => {
  void (async () => {
    const routed = await handleRequest(options, await toRequest(req));
    if (routed !== null) {
      res.writeHead(routed.status, Object.fromEntries(routed.headers));
      return res.end(Buffer.from(await routed.arrayBuffer()));
    }

    let file = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404, { ...STATIC_HEADERS, 'content-type': 'text/html; charset=utf-8' });
      return res.end(readFileSync(resolve(root, '404.html')));
    }
    res.writeHead(200, {
      ...STATIC_HEADERS,
      'content-type': types[extname(file)] ?? 'application/octet-stream',
    });
    res.end(readFileSync(file));
  })().catch((error) => {
    // Nothing is hidden: an unexpected failure here is a defect, not a page.
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('internal error');
  });
});

server.listen(port, () => process.stdout.write(`${server.address().port}\n`));
