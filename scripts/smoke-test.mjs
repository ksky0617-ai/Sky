/**
 * Checks a running deployment from outside it.
 *
 *   node --experimental-strip-types scripts/smoke-test.mjs <origin> [expected-build] [--json=path]
 *
 * This is what verifies a deploy. Everything else in this repository tests the
 * code; this tests the thing that is actually serving. The two have already
 * diverged once — the Pages function could not load at all while every test
 * passed — so the distinction is not academic.
 *
 * ## It does not believe /health
 *
 * `/health` is the application's opinion of itself. A deployment whose storage
 * is broken can report `ok`, and an auditor that accepted that would be
 * verifying a self-report rather than a system.
 *
 * So every claim `/health` makes is cross-checked against something observable
 * that the application cannot fake without also breaking what a customer sees:
 *
 *   - `published`  → against the product pages in the sitemap
 *   - `openRuns`   → against whether a product page actually offers a purchase
 *   - `accepting`  → against both of the above
 *   - `storage` (read)  → against the confirmation route, which reads the order log
 *   - `storage` (write) → against a real write through the checkout intent path
 *
 * The one thing it does take at face value is a report of *ill* health. That
 * asymmetry is deliberate: "I am fine" is a claim that serves the claimant and
 * needs corroboration, while "I am broken" is an admission against interest and
 * nothing is gained by disbelieving it. A deployment reporting a fault is failed
 * on that report alone.
 *
 * This auditor imports nothing from `src/`. Sharing a judgement function with
 * the thing being judged is not independent verification, so the two are kept
 * structurally apart — asserted by `test/meta/deploy-audit.test.ts`.
 *
 * ## What it will not do
 *
 * It never completes a payment and never creates an order. The one thing it
 * does write is a checkout intent, which is an offer nobody took: it commits
 * nothing, counts toward no pre-order run, and appears in no customer's
 * history. That write is the only way to prove storage accepts writes without
 * taking money.
 *
 * ## Verdicts
 *
 * PASS · FAIL · UNVERIFIED · NOT_APPLICABLE. UNVERIFIED is never counted as a
 * pass — "could not check" and "checked and fine" are different facts, and
 * collapsing them is how an auditor starts lying on the system's behalf.
 *
 * Exit: 0 all PASS · 1 any FAIL · 3 no failures but something unverified.
 */

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const positional = args.filter((a) => !a.startsWith('--'));

const origin = (positional[0] ?? '').replace(/\/$/, '');
const expectedBuild = positional[1];
const jsonPath = flags.find((f) => f.startsWith('--json='))?.slice('--json='.length);

if (origin === '') {
  process.stderr.write('usage: smoke-test.mjs <origin> [expected-build] [--json=path]\n');
  process.exit(2);
}

const startedAt = new Date().toISOString();
const findings = [];

/** Records one finding. `expected` and `observed` are kept as raw values. */
function record(name, status, { expected = null, observed = null, detail = '' } = {}) {
  findings.push({ name, status, expected, observed, detail });
}

class Unverifiable extends Error {}

/** Marks a check as UNVERIFIED rather than passing or failing it. */
function unverifiable(reason) {
  throw new Unverifiable(reason);
}

async function check(name, run) {
  try {
    const outcome = (await run()) ?? {};
    record(name, 'PASS', outcome);
  } catch (error) {
    if (error instanceof Unverifiable) {
      record(name, 'UNVERIFIED', { detail: error.message });
    } else {
      record(name, 'FAIL', { detail: error.message, ...(error.evidence ?? {}) });
    }
  }
}

function expect(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

const get = (path, init) => fetch(`${origin}${path}`, { redirect: 'manual', ...init });

// --- what this run can and cannot cover ---------------------------------

const url = new URL(origin);
const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
const coverage = [
  url.protocol === 'https:' ? 'TLS: exercised (https)' : 'TLS: NOT exercised — this origin is plain http',
  isLocal ? 'DNS: NOT exercised — this origin is a loopback address' : `DNS: exercised (${url.hostname})`,
];

// --- the deployment is alive --------------------------------------------

let health = null;
let home = '';

await check('the site answers', async () => {
  const response = await get('/');
  expect(response.status === 200, `GET / returned ${response.status}`, { status: response.status });
  home = await response.text();
  expect(home.includes('<main'), 'the home page has no main landmark — is this the right origin?');
  return { expected: 200, observed: response.status, detail: `${(home.length / 1024).toFixed(1)}KB` };
});

await check('health answers at all', async () => {
  const response = await get('/health');
  expect([200, 503].includes(response.status), `/health returned ${response.status}`, { status: response.status });
  health = await response.json();
  expect(typeof health.storage === 'string', '/health did not report storage');
  return {
    expected: '200 or 503 with a storage field',
    observed: `${response.status} ${JSON.stringify(health)}`,
  };
});

await check('health leaks nothing', async () => {
  if (health === null) unverifiable('/health did not answer');
  const body = JSON.stringify(health);
  expect(!/secret|token|key|password/i.test(body), '/health mentions a credential', { body });
  expect(!/\/(home|var|tmp|Users)\//.test(body), '/health exposes a filesystem path', { body });
  return { expected: 'no credentials, no paths', observed: 'none present' };
});

await check('a self-reported fault is believed rather than explained away', async () => {
  if (health === null) unverifiable('/health did not answer');
  // The only claim from /health this auditor accepts without corroboration.
  // Everything below cross-checks a claim of health; there is no configuration
  // in which a deployment that says it cannot store anything is a verified one,
  // so this needs no second opinion. A deployment with no durable store reaches
  // exactly this line — that is PCQ-004 arriving in production, and it is
  // supposed to be loud.
  expect(
    health.status === 'ok' && health.storage === 'available',
    `the deployment reports itself ${health.status}: storage ${health.storage}`,
    { status: health.status, storage: health.storage },
  );
  return { expected: 'ok / available', observed: `${health.status} / ${health.storage}` };
});

// --- the build marker ----------------------------------------------------

await check('the build marker identifies what is serving', async () => {
  if (health === null) unverifiable('/health did not answer');
  const marker = /<meta name="olibana-build" content="([^"]*)">/.exec(home)?.[1];

  expect(typeof health.build === 'string' && health.build !== '', '/health reports no build');
  expect(marker !== undefined && marker !== '', 'the served HTML carries no build marker');

  const known = (v) => v !== 'unknown';
  if (known(health.build) && known(marker)) {
    expect(
      health.build === marker,
      `the function reports build ${health.build} but the pages were built at ${marker} — ` +
        'this deployment is half-updated',
      { function: health.build, pages: marker },
    );
  }
  if (expectedBuild !== undefined) {
    const wanted = expectedBuild.slice(0, 12);
    expect(
      marker === wanted,
      `expected build ${wanted}, deployment is serving ${marker} — this is a stale deployment`,
      { expected: wanted, serving: marker },
    );
  }
  return { expected: expectedBuild?.slice(0, 12) ?? 'function and pages to agree', observed: `function=${health.build}, pages=${marker}` };
});

// --- /health cross-checked against what is observable --------------------
//
// Everything below refuses to take /health's word for anything. Each claim is
// compared against a fact the application cannot fake without also breaking
// what a visitor sees.

let productPaths = [];

await check('INDEPENDENT: the published count matches the pages that exist', async () => {
  if (health === null) unverifiable('/health did not answer');
  const sitemap = await get('/sitemap.xml');
  if (sitemap.status !== 200) unverifiable(`/sitemap.xml returned ${sitemap.status}`);

  const xml = await sitemap.text();
  productPaths = [...xml.matchAll(/<loc>([^<]*\/products\/[^<]*)<\/loc>/g)].map((m) => m[1]);

  expect(
    health.published === productPaths.length,
    `/health claims ${health.published} published product(s) but the site serves ` +
      `${productPaths.length} product page(s) — the report and the site disagree`,
    { claimed: health.published, observed: productPaths.length, paths: productPaths },
  );
  return { expected: health.published, observed: productPaths.length };
});

await check('INDEPENDENT: `accepting` matches whether anything can actually be bought', async () => {
  if (health === null) unverifiable('/health did not answer');
  if (productPaths.length === 0) {
    expect(
      health.accepting === false,
      '/health claims the deployment is accepting orders while it serves no product page',
      { claimed: health.accepting, productPages: 0 },
    );
    return { expected: false, observed: false, detail: 'no product pages, and health agrees' };
  }

  const page = await (await get(new URL(productPaths[0], origin).pathname)).text();
  const hasPurchaseForm = /<form[^>]*action="\/checkout"/.test(page);
  expect(
    health.accepting === hasPurchaseForm,
    `/health claims accepting=${health.accepting} but the product page ` +
      `${hasPurchaseForm ? 'does' : 'does not'} offer a purchase`,
    { claimed: health.accepting, purchaseFormPresent: hasPurchaseForm },
  );
  return { expected: hasPurchaseForm, observed: health.accepting };
});

await check('INDEPENDENT: storage is readable, proven by reading through it', async () => {
  if (health === null) unverifiable('/health did not answer');
  // The confirmation route reads the order log. A reference that names nothing
  // must answer 202 ("payment received, still recording"). If the log cannot be
  // read, that read throws and the route cannot answer 202 — so this
  // distinguishes a readable store from a broken one without writing anything,
  // and without believing what /health says about it.
  const response = await get('/order/confirmation?ref=audit-probe-nonexistent');
  const readable = response.status === 202;

  expect(
    readable,
    `the confirmation route returned ${response.status} for an unknown reference; ` +
      'a readable order log answers 202',
    { status: response.status, healthClaimed: health.storage },
  );
  expect(
    health.storage !== 'unreadable',
    `/health reports storage "${health.storage}" but the order log reads fine`,
    { claimed: health.storage, observed: 'readable' },
  );
  return { expected: '202 and health agreeing', observed: `202, health says ${health.storage}` };
});

await check('INDEPENDENT: storage accepts writes, proven by writing through it', async () => {
  if (health === null) unverifiable('/health did not answer');
  if (productPaths.length === 0) {
    // Nothing is published, so no valid selection exists and the write path
    // cannot be exercised. UNVERIFIED — not a pass.
    unverifiable(
      'no product is published, so no valid checkout exists to write an intent through. ' +
        'The write path is unverified on this deployment.',
    );
  }

  const page = await (await get(new URL(productPaths[0], origin).pathname)).text();
  const productId = /name="productId" value="([^"]*)"/.exec(page)?.[1];
  const sku = /<option value="([^"]*)"/.exec(page)?.[1];
  if (productId === undefined || sku === undefined) {
    unverifiable('the product page offers no purchase form, so no write can be attempted');
  }

  // Writes a checkout intent — an offer nobody took. No order, no money.
  const response = await get('/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      productId, sku, quantity: '1', email: 'deployment-audit@example.invalid',
    }).toString(),
  });

  // 303 means a gateway accepted it; 503 means no gateway is configured. Both
  // happen only AFTER the intent has been recorded, so both prove the write.
  // 500 is what a write-broken store produces.
  expect(
    [303, 503].includes(response.status),
    `a valid selection produced ${response.status}; a recorded intent yields 303 or 503, ` +
      'and 500 means the write failed',
    { status: response.status, healthClaimed: health.storage },
  );
  expect(
    health.storage === 'available',
    `/health reports storage "${health.storage}" but a write just succeeded`,
    { claimed: health.storage, observed: 'writable' },
  );
  return { expected: '303 or 503 after a successful intent write', observed: response.status };
});

// --- the security posture survived deployment ---------------------------

await check('security headers are actually served', async () => {
  const response = await get('/health');
  const required = {
    'referrer-policy': /no-referrer|same-origin/,
    'x-content-type-options': /nosniff/,
    'content-security-policy': /script-src 'none'/,
  };
  const observed = {};
  for (const [header, pattern] of Object.entries(required)) {
    const value = response.headers.get(header) ?? '';
    observed[header] = value || 'absent';
    expect(pattern.test(value), `${header} is "${value || 'absent'}"`, { header, value });
  }
  return { expected: Object.keys(required), observed };
});

await check('the static site carries the headers too', async () => {
  const response = await get('/');
  const referrer = response.headers.get('referrer-policy') ?? '';
  expect(
    /no-referrer|same-origin/.test(referrer),
    `static pages send referrer-policy "${referrer || 'absent'}"`,
    { value: referrer || 'absent' },
  );
  return { expected: 'no-referrer or same-origin', observed: referrer };
});

// --- the routes exist ----------------------------------------------------

await check('every navigation destination resolves', async () => {
  const paths = [...new Set([...home.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))];
  expect(paths.length > 2, `only ${paths.length} internal links found on the home page`);

  const broken = [];
  for (const path of paths) {
    const response = await get(path);
    if (response.status >= 400) broken.push(`${path} → ${response.status}`);
  }
  expect(broken.length === 0, `broken links: ${broken.join(', ')}`, { broken });
  return { expected: 'all resolve', observed: `${paths.length} links` };
});

await check('a missing page is a 404, not a 200', async () => {
  const response = await get('/no-such-page-exists');
  expect(response.status === 404, `an unknown path returned ${response.status}`, { status: response.status });
  return { expected: 404, observed: response.status };
});

// --- the commerce boundary behaves --------------------------------------

await check('the checkout refuses a product that does not exist', async () => {
  const response = await get('/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      productId: 'PRD_nonexistent', sku: 'X', quantity: '1', email: 'audit@example.invalid',
    }).toString(),
  });
  expect(
    [422, 503].includes(response.status),
    `a nonexistent product produced ${response.status} — it must be refused (422) or unavailable (503)`,
    { status: response.status },
  );
  return { expected: '422 or 503', observed: response.status };
});

await check('the webhook refuses an unsigned payload', async () => {
  const response = await get('/webhooks/payment', { method: 'POST', body: '{}' });
  expect(response.status === 400, `an unsigned webhook produced ${response.status}, expected 400`, { status: response.status });
  return { expected: 400, observed: response.status };
});

await check('the webhook refuses a payload with a forged signature', async () => {
  // "Verification is enabled" is a configuration value. This is the behaviour.
  const response = await get('/webhooks/payment', {
    method: 'POST',
    headers: { 'x-olibana-signature': 't=9999999999,v1=deadbeef' },
    body: JSON.stringify({ reference: 'audit-forged', amountPaid: 1, currency: 'JPY' }),
  });
  expect(
    response.status === 400,
    `a forged signature produced ${response.status}, expected 400`,
    { status: response.status },
  );
  return { expected: 400, observed: response.status };
});

await check('the sandbox is not exposed', async () => {
  const response = await get('/sandbox/pay?ref=audit');
  expect(
    response.status === 404,
    `the sandbox payment page answered ${response.status} — a public deployment must not serve it`,
    { status: response.status },
  );
  return { expected: 404, observed: response.status };
});

// --- report --------------------------------------------------------------

const counts = { PASS: 0, FAIL: 0, UNVERIFIED: 0, NOT_APPLICABLE: 0 };
for (const f of findings) counts[f.status] += 1;

const lines = findings.map((f) => {
  const label = f.status === 'PASS' ? 'ok   ' : f.status === 'FAIL' ? 'FAIL ' : f.status === 'UNVERIFIED' ? '?????' : 'n/a  ';
  const detail = f.status === 'FAIL' || f.status === 'UNVERIFIED'
    ? `\n          ${f.detail}`
    : f.observed !== null ? ` — ${typeof f.observed === 'object' ? JSON.stringify(f.observed) : f.observed}` : '';
  return `  ${label} ${f.name}${detail}`;
});

process.stdout.write(
  `\nsmoke test — ${origin}\n  ${coverage.join('\n  ')}\n\n${lines.join('\n')}\n\n` +
    `${counts.PASS} passed · ${counts.FAIL} failed · ${counts.UNVERIFIED} unverified\n`,
);

const uncovered = ['payment — none was attempted'];
if (url.protocol !== 'https:') uncovered.push('TLS — this origin is plain http');
if (isLocal) uncovered.push('DNS — this origin is a loopback address');
process.stdout.write(`NOT covered by this run:\n${uncovered.map((u) => `  - ${u}`).join('\n')}\n`);

if (counts.FAIL > 0) {
  process.stdout.write('\nThe deployment is NOT verified.\n');
} else if (counts.UNVERIFIED > 0) {
  process.stdout.write(
    '\nNo failures, but something could not be checked. "Could not check" is not "fine",\n' +
      'so this is not a pass. See the ????? lines above.\n',
  );
} else {
  process.stdout.write('\nEvery check passed, and /health was cross-checked rather than believed.\n');
}

if (jsonPath !== undefined) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(
    jsonPath,
    `${JSON.stringify({ startedAt, origin, expectedBuild: expectedBuild ?? null, coverage, counts, findings }, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(`\nraw evidence: ${jsonPath}\n`);
}

process.exit(counts.FAIL > 0 ? 1 : counts.UNVERIFIED > 0 ? 3 : 0);
