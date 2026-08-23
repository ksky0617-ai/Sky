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
      gateway: new SandboxGateway(true),
      verifier: new HmacWebhookVerifier(configured.webhookSecret),
      sandbox: { enabled: true, secret: configured.webhookSecret },
    }
  : {
      stores,
      gateway: new UnconfiguredGateway(),
      verifier: configured.mode === 'live'
        ? new HmacWebhookVerifier(configured.webhookSecret)
        : new UnconfiguredVerifier(),
    };

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

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
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(readFileSync(resolve(root, '404.html')));
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  })().catch((error) => {
    // Nothing is hidden: an unexpected failure here is a defect, not a page.
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('internal error');
  });
});

server.listen(port, () => process.stdout.write(`${server.address().port}\n`));
