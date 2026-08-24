/**
 * Proving that the deployment auditor fails on false claims.
 *
 * ## Why this exists
 *
 * `scripts/smoke-test.mjs` had only ever run against a working deployment. A
 * checker that has only seen the passing case is not known to discriminate:
 * every green result it produced was equally consistent with "the deployment is
 * fine" and "the checker cannot tell". Until it is shown to fail on a
 * deployment that is lying, its passes are not evidence.
 *
 * So each test here stands up a small server that is wrong in exactly one way —
 * a stale build, missing headers, an exposed sandbox, a leaked secret — and
 * requires the auditor to exit non-zero **naming that specific thing**. A
 * non-zero exit for the wrong reason would not prove discrimination either.
 *
 * The control case at the end runs the same auditor against a server that is
 * correct in every respect, and requires it to pass. Without that, every test
 * here would also pass against a checker that simply always fails.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { resolve } from 'node:path';

const auditor = resolve(import.meta.dirname, '../../scripts/smoke-test.mjs');

const GOOD_BUILD = 'abc123def456';

/** The security headers a correct deployment serves. */
const HEADERS: Record<string, string> = {
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'self'; script-src 'none'; frame-ancestors 'none'",
};

interface Fault {
  readonly build?: string;
  readonly healthBuild?: string;
  readonly headers?: Record<string, string>;
  readonly healthBody?: unknown;
  readonly homeBody?: string;
  readonly exposeSandbox?: boolean;
  readonly breakLink?: boolean;
  readonly checkoutStatus?: number;
  readonly webhookStatus?: number;
  readonly notFoundStatus?: number;
  /** Products the sitemap advertises. Cross-checked against /health. */
  readonly sitemapProducts?: readonly string[];
  /** Whether the product page offers a purchase. Cross-checked against `accepting`. */
  readonly productPageHasForm?: boolean;
  /** What the confirmation route answers — the order log's read path. */
  readonly confirmationStatus?: number;
  /** What a VALID selection answers — the intent write path. */
  readonly validCheckoutStatus?: number;
  /** Whether a forged signature is accepted. */
  readonly acceptForgedWebhook?: boolean;
  /** What an error response leaks. */
  readonly leakOnError?: string;
}

/**
 * A deployment that is correct except for whatever `fault` changes.
 *
 * Deliberately hand-rolled rather than the real server: the point is to produce
 * a deployment that *lies*, which the real one will not do.
 */
function deployment(fault: Fault = {}): Promise<{ origin: string; close: () => Promise<void> }> {
  const build = fault.build ?? GOOD_BUILD;
  const home =
    fault.homeBody ??
    `<!doctype html><html><head><meta name="olibana-build" content="${build}"></head>` +
      '<body><main><a href="/nature">Nature</a><a href="/olibana/philosophy">Philosophy</a>' +
      '<a href="/legal/accessibility">Accessibility</a></main></body></html>';

  const health = fault.healthBody ?? {
    build: fault.healthBuild ?? build,
    status: 'ok',
    storage: 'available',
    published: 0,
    openRuns: 0,
    accepting: false,
  };

  const products = fault.sitemapProducts ?? [];
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?><urlset>' +
    ['/', ...products].map((p) => `<url><loc>${p}</loc></url>`).join('') +
    '</urlset>';

  const productPage =
    fault.productPageHasForm === true
      ? '<main><form method="post" action="/checkout">' +
        '<input type="hidden" name="productId" value="PRD_x">' +
        '<select name="sku"><option value="OLB-CT-001-STN-M">M</option></select></form></main>'
      : '<main>a product, not for sale</main>';

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const headers = { ...(fault.headers ?? HEADERS) };
    const send = (status: number, body: string, type = 'text/html; charset=utf-8'): void => {
      res.writeHead(status, { ...headers, 'content-type': type });
      res.end(body);
    };

    if (url.pathname === '/health') return send(200, JSON.stringify(health), 'application/json');
    if (url.pathname === '/') return send(200, home);
    if (url.pathname === '/sitemap.xml') return send(200, sitemap, 'application/xml');
    if (products.includes(url.pathname)) return send(200, productPage);
    if (url.pathname === '/order/confirmation') {
      return send(fault.confirmationStatus ?? 202, 'payment received');
    }
    if (url.pathname === '/checkout') {
      // A valid selection and a nonexistent product take different paths: the
      // first exercises the intent write, the second must simply be refused.
      let body = '';
      req.on('data', (chunk) => { body += String(chunk); });
      req.on('end', () => {
        const valid = !body.includes('PRD_nonexistent');
        send(valid ? (fault.validCheckoutStatus ?? 503) : (fault.checkoutStatus ?? 422), 'checkout');
      });
      return undefined;
    }
    if (url.pathname === '/webhooks/payment') {
      const forged = req.headers['x-olibana-signature'] !== undefined;
      if (forged && fault.acceptForgedWebhook === true) return send(200, 'accepted');
      return send(fault.webhookStatus ?? 400, 'unverified');
    }
    if (url.pathname === '/sandbox/pay') {
      return fault.exposeSandbox === true
        ? send(200, '<p>Nothing is charged here</p><form></form>')
        : send(404, 'not found');
    }
    if (url.pathname === '/nature' && fault.breakLink === true) return send(500, 'broken');
    if (['/nature', '/olibana/philosophy', '/legal/accessibility'].includes(url.pathname)) {
      return send(200, '<main>a page</main>');
    }
    if (fault.leakOnError !== undefined) return send(500, fault.leakOnError);
    return send(fault.notFoundStatus ?? 404, 'not found');
  });

  return new Promise((ok) => {
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      ok({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

interface AuditResult { readonly code: number; readonly output: string }

function audit(origin: string, expectedBuild?: string): Promise<AuditResult> {
  const args = ['--experimental-strip-types', auditor, origin];
  if (expectedBuild !== undefined) args.push(expectedBuild);
  return new Promise((ok) => {
    execFile('node', args, (error, stdout, stderr) => {
      ok({ code: error === null ? 0 : ((error as { code?: number }).code ?? 1), output: `${stdout}${stderr}` });
    });
  });
}

/** Runs the auditor against a faulty deployment and returns what it said. */
async function auditFaulty(fault: Fault, expectedBuild?: string): Promise<AuditResult> {
  const d = await deployment(fault);
  try {
    return await audit(d.origin, expectedBuild);
  } finally {
    await d.close();
  }
}

// --- the control: it passes when nothing is wrong ------------------------

test('CONTROL: the auditor passes a deployment that is correct', async () => {
  // Without this every other test here would also pass against an auditor that
  // simply always fails.
  const result = await auditFaulty({
    sitemapProducts: ['/products/olb-ct-001'],
    productPageHasForm: true,
    healthBody: {
      build: GOOD_BUILD, status: 'ok', storage: 'available',
      published: 1, openRuns: 1, accepting: true,
    },
  }, GOOD_BUILD);

  assert.equal(result.code, 0, `a correct deployment was failed:\n${result.output}`);
  assert.match(result.output, /Every check passed/);
  assert.match(result.output, /0 failed · 0 unverified/);
});

// --- false claims it must catch ------------------------------------------

test('it fails when nothing is listening at all', async () => {
  // The emptiest false claim: "it is deployed" when there is no deployment.
  const d = await deployment();
  const { origin } = d;
  await d.close();

  const result = await audit(origin);
  assert.notEqual(result.code, 0, 'the auditor passed an origin that serves nothing');
  assert.match(result.output, /FAIL/);
});

test('it fails on a STALE deployment serving an older build', async () => {
  // The specific false claim the build marker exists for: everything works, the
  // site answers, and it is running code nobody deployed.
  const result = await auditFaulty({ build: 'oldoldoldold' }, GOOD_BUILD);

  assert.notEqual(result.code, 0, 'a stale deployment was reported as verified');
  assert.match(result.output, /stale deployment/);
  assert.match(result.output, /oldoldoldold/);
});

test('it fails on a HALF-UPDATED deployment whose function and pages disagree', async () => {
  // The function from one commit, the static pages from another.
  const result = await auditFaulty({ build: 'aaaaaaaaaaaa', healthBuild: 'bbbbbbbbbbbb' });

  assert.notEqual(result.code, 0, 'a half-updated deployment was reported as verified');
  assert.match(result.output, /half-updated/);
});

test('it fails when the build marker is missing entirely', async () => {
  const result = await auditFaulty({ homeBody: '<!doctype html><html><body><main>no marker</main></body></html>' });

  assert.notEqual(result.code, 0, 'a deployment with no build marker was verified');
  assert.match(result.output, /carries no build marker/);
});

test('it fails when security headers are absent', async () => {
  const result = await auditFaulty({ headers: {} });

  assert.notEqual(result.code, 0, 'an unprotected deployment was verified');
  assert.match(result.output, /referrer-policy is "absent"/);
});

test('it fails when the referrer policy would leak the confirmation token', async () => {
  // Not merely "a header exists" — the wrong value is the actual defect, since
  // the confirmation URL carries the order's access token.
  const result = await auditFaulty({
    headers: { ...HEADERS, 'referrer-policy': 'unsafe-url' },
  });

  assert.notEqual(result.code, 0, 'a leaking referrer policy was accepted');
  assert.match(result.output, /referrer-policy is "unsafe-url"/);
});

test('it fails when the sandbox is exposed on a public deployment', async () => {
  // A deployment serving this can record orders as paid with no money moving.
  const result = await auditFaulty({ exposeSandbox: true });

  assert.notEqual(result.code, 0, 'an exposed sandbox payment page was verified');
  assert.match(result.output, /must not serve it/);
});

test('it fails when the health endpoint leaks a credential', async () => {
  const result = await auditFaulty({
    healthBody: { build: GOOD_BUILD, status: 'ok', storage: 'available', published: 0, openRuns: 0, accepting: false, webhookSecret: 'shhh' },
  });

  assert.notEqual(result.code, 0, 'a health endpoint leaking a secret was verified');
  assert.match(result.output, /mentions a credential/);
});

test('it fails when the deployment reports itself degraded', async () => {
  const result = await auditFaulty({
    healthBody: { build: GOOD_BUILD, status: 'degraded', storage: 'unavailable', published: 0, openRuns: 0, accepting: false },
  });

  assert.notEqual(result.code, 0, 'a degraded deployment was reported as verified');
  assert.match(result.output, /storage unavailable/);
});

test('it fails when a linked page is broken', async () => {
  const result = await auditFaulty({ breakLink: true });

  assert.notEqual(result.code, 0, 'a deployment with a broken link was verified');
  assert.match(result.output, /broken links: \/nature/);
});

test('it fails when an unknown path answers 200 instead of 404', async () => {
  // A catch-all that returns the home page for everything makes every link
  // check pass while the site is meaningless.
  const result = await auditFaulty({ notFoundStatus: 200 });

  assert.notEqual(result.code, 0, 'a deployment with no 404 was verified');
  assert.match(result.output, /an unknown path returned 200/);
});

test('it fails when the checkout accepts an order for a product that does not exist', async () => {
  const result = await auditFaulty({ checkoutStatus: 303 });

  assert.notEqual(result.code, 0, 'a checkout accepting a nonexistent product was verified');
  assert.match(result.output, /it must be refused/);
});

test('it fails when the webhook accepts an unsigned payload', async () => {
  // The single worst false claim: anyone could post an order that was paid for
  // by nobody.
  const result = await auditFaulty({ webhookStatus: 200 });

  assert.notEqual(result.code, 0, 'a webhook accepting unsigned payloads was verified');
  assert.match(result.output, /an unsigned webhook produced 200/);
});

test('it fails when an error response leaks a stack trace or a path', async () => {
  // The response most likely to be produced by a defect, and the one a checker
  // looks at last. A deployment that answers a malformed request with its own
  // internals has handed its shape to whoever can make it fail.
  for (const leak of [
    'Error: boom\n    at handleRequest (/home/user/Sky/src/http/router.ts:12:9)',
    'ENOENT: no such file or directory, open \'/var/olibana/orders.jsonl\'',
    'OLIBANA_WEBHOOK_SECRET is not set',
  ]) {
    const result = await auditFaulty({ leakOnError: leak });
    assert.notEqual(result.code, 0, `a deployment leaking "${leak.slice(0, 30)}" was verified`);
    assert.match(result.output, /leaked internals/);
  }
});

// --- §12: /health says ok, but the thing it reports on is broken ---------
//
// These are the cases the auditor previously could not catch, because it took
// /health's word. Each deployment below reports `status: ok, storage:
// available` and is lying about it.

const LYING_HEALTH = {
  build: GOOD_BUILD, status: 'ok', storage: 'available',
  published: 0, openRuns: 0, accepting: false,
};

test('CASE A: /health says ok while the order log cannot be READ', async () => {
  // The confirmation route reads the order log. If that read fails, the log is
  // not readable — whatever /health claims about it.
  const result = await auditFaulty({ healthBody: LYING_HEALTH, confirmationStatus: 500 });

  assert.notEqual(result.code, 0, 'a deployment with an unreadable order log was verified');
  assert.match(result.output, /confirmation route returned 500/);
});

test('CASE A2: an honest 503 from the confirmation route is still an unreadable log', async () => {
  // The router now answers 503 rather than throwing when the order log cannot
  // be read, which is better for the customer and must not become a way past
  // the auditor: an unreadable log is unreadable whichever code it admits it
  // with. Only 202 — the log was read and holds no such order — is a pass.
  const result = await auditFaulty({ healthBody: LYING_HEALTH, confirmationStatus: 503 });

  assert.notEqual(result.code, 0, 'a graceful failure to read the order log was verified');
  assert.match(result.output, /confirmation route returned 503/);
});

test('CASE B: /health says ok while storage cannot be WRITTEN to', async () => {
  // A valid selection records a checkout intent. A 500 there is a failed write,
  // and a deployment that cannot write is one that loses orders.
  const result = await auditFaulty({
    healthBody: { ...LYING_HEALTH, published: 1, accepting: true },
    sitemapProducts: ['/products/olb-ct-001'],
    productPageHasForm: true,
    validCheckoutStatus: 500,
  });

  assert.notEqual(result.code, 0, 'a deployment that cannot write was verified');
  assert.match(result.output, /a valid selection produced 500/);
});

test('CASE C: /health says ok while webhook verification is broken', async () => {
  // "Verification is enabled" is a configuration value. This is the behaviour:
  // a forged signature that is accepted means anyone can post a paid order.
  const result = await auditFaulty({ healthBody: LYING_HEALTH, acceptForgedWebhook: true });

  assert.notEqual(result.code, 0, 'a deployment accepting forged signatures was verified');
  assert.match(result.output, /a forged signature produced 200/);
});

test('CASE E: /health says ok while its product count is a fiction', async () => {
  // Claims three published products; the site serves none. Either the report is
  // wrong or product lookup is broken. Both are failures.
  const result = await auditFaulty({
    healthBody: { ...LYING_HEALTH, published: 3 },
    sitemapProducts: [],
  });

  assert.notEqual(result.code, 0, 'a false published count was verified');
  assert.match(result.output, /claims 3 published product\(s\) but the site serves 0/);
});

test('CASE E2: /health claims it is accepting orders while nothing can be bought', async () => {
  const result = await auditFaulty({
    healthBody: { ...LYING_HEALTH, published: 1, accepting: true },
    sitemapProducts: ['/products/olb-ct-001'],
    productPageHasForm: false,
  });

  assert.notEqual(result.code, 0, 'a false accepting claim was verified');
  assert.match(result.output, /does not offer a purchase/);
});

test('CASE F: /health says ok while the checkout accepts a nonexistent product', async () => {
  const result = await auditFaulty({ healthBody: LYING_HEALTH, checkoutStatus: 303 });

  assert.notEqual(result.code, 0, 'a checkout accepting a nonexistent product was verified');
  assert.match(result.output, /it must be refused/);
});

test('CASE D: there is no database, and the auditor does not pretend to check one', async () => {
  // §12 Case D names invalid database credentials. This system has no database
  // — persistence is an append-only log — so the case is NOT_APPLICABLE rather
  // than passed. Recording it as a test keeps the absence deliberate: if a
  // database is ever added, this is where the gap will be visible.
  //
  // Run against a fully correct deployment, so exit 0 means "nothing was left
  // unchecked" rather than "the write path was skipped".
  const result = await auditFaulty({
    sitemapProducts: ['/products/olb-ct-001'],
    productPageHasForm: true,
    healthBody: {
      build: GOOD_BUILD, status: 'ok', storage: 'available',
      published: 1, openRuns: 1, accepting: true,
    },
  }, GOOD_BUILD);
  assert.equal(result.code, 0, `the control deployment was not passed:\n${result.output}`);
  assert.ok(
    !/database/i.test(result.output),
    'the auditor claims to check a database that does not exist',
  );
});

test('an UNVERIFIED check is never reported as a pass', async () => {
  // A deployment with nothing published cannot exercise the write path. That
  // must not silently count as fine — exit 3, not 0.
  const result = await auditFaulty({ healthBody: LYING_HEALTH, sitemapProducts: [] });

  assert.equal(result.code, 3, `expected exit 3 for an unverified check, got ${result.code}`);
  assert.match(result.output, /unverified/);
  assert.match(result.output, /"Could not check" is not "fine"/);
  assert.ok(!/Every check passed/.test(result.output));
});

// --- what the auditor cannot see ----------------------------------------

test('CLOSED: a /health that lies about its own counts no longer passes', async () => {
  // This test previously recorded the opposite — that the auditor believed
  // whatever /health said about itself. Every claim is now cross-checked
  // against something observable, so the lie is caught.
  const result = await auditFaulty({
    healthBody: { build: GOOD_BUILD, status: 'ok', storage: 'available', published: 99, openRuns: 99, accepting: true },
  }, GOOD_BUILD);

  assert.notEqual(result.code, 0, 'a /health reporting 99 phantom products was believed');
  assert.match(result.output, /claims 99 published product\(s\) but the site serves 0/);
});

test('DISCLOSED: what remains unverifiable from outside', async () => {
  // The auditor observes behaviour, so it catches a /health that contradicts
  // the system. What it still cannot see is a component that is broken in a way
  // nothing observable depends on — a store that reads and writes correctly
  // during the audit and fails afterwards, for instance. Point-in-time
  // observation is what this is; continuous assurance is not.
  const result = await auditFaulty({
    sitemapProducts: ['/products/olb-ct-001'],
    productPageHasForm: true,
    healthBody: {
      build: GOOD_BUILD, status: 'ok', storage: 'available',
      published: 1, openRuns: 1, accepting: true,
    },
  }, GOOD_BUILD);

  assert.equal(result.code, 0, 'the control must still pass; this test only records the limit');
});
