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

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const headers = { ...(fault.headers ?? HEADERS) };
    const send = (status: number, body: string, type = 'text/html; charset=utf-8'): void => {
      res.writeHead(status, { ...headers, 'content-type': type });
      res.end(body);
    };

    if (url.pathname === '/health') return send(200, JSON.stringify(health), 'application/json');
    if (url.pathname === '/') return send(200, home);
    if (url.pathname === '/checkout') return send(fault.checkoutStatus ?? 422, 'refused');
    if (url.pathname === '/webhooks/payment') return send(fault.webhookStatus ?? 400, 'unverified');
    if (url.pathname === '/sandbox/pay') {
      return fault.exposeSandbox === true
        ? send(200, '<p>Nothing is charged here</p><form></form>')
        : send(404, 'not found');
    }
    if (url.pathname === '/nature' && fault.breakLink === true) return send(500, 'broken');
    if (['/nature', '/olibana/philosophy', '/legal/accessibility'].includes(url.pathname)) {
      return send(200, '<main>a page</main>');
    }
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
  const result = await auditFaulty({}, GOOD_BUILD);
  assert.equal(result.code, 0, `a correct deployment was failed:\n${result.output}`);
  assert.match(result.output, /all checks passed/);
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

// --- what the auditor cannot see ----------------------------------------

test('DISCLOSED: the auditor believes what /health says about itself', async () => {
  // A deployment whose storage is broken but which reports `ok` passes. The
  // health logic is tested separately, against the real implementation; from
  // outside, this auditor cannot distinguish an honest report from a lie.
  // Recorded as a test so the limit is visible in the output rather than only
  // in prose.
  const result = await auditFaulty({
    healthBody: { build: GOOD_BUILD, status: 'ok', storage: 'available', published: 99, openRuns: 99, accepting: true },
  }, GOOD_BUILD);

  assert.equal(result.code, 0, 'this documents a known limit; if it now fails, the limit closed');
});
