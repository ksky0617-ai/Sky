/**
 * Checks a running deployment from outside it.
 *
 *   node --experimental-strip-types scripts/smoke-test.mjs https://olibana.pages.dev [expected-build]
 *
 * Passing the commit you deployed makes this fail on a stale deployment. Without
 * it, the build check still verifies that the function and the static build
 * agree with each other — a deployment where they disagree is half-updated.
 *
 * This is what verifies a deploy. Everything else in this repository tests the
 * code; this tests the thing that is actually serving. The two have already
 * diverged once — the Pages function could not load at all while every test
 * passed — so the distinction is not academic.
 *
 * ## What it will not do
 *
 * It never posts a payment, never completes a checkout, and never writes an
 * order. A smoke test that placed a real order would be a smoke test that
 * needed cleaning up after, and against a live gateway it would be a smoke test
 * that spent money.
 *
 * It exits non-zero on the first thing that is wrong, so it can gate a deploy.
 */

const origin = (process.argv[2] ?? '').replace(/\/$/, '');
const expectedBuild = process.argv[3];
if (origin === '') {
  process.stderr.write('usage: smoke-test.mjs <origin> [expected-build]\n');
  process.exit(2);
}

const results = [];
let failed = 0;

async function check(name, run) {
  try {
    const detail = await run();
    results.push(`  ok    ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    failed += 1;
    results.push(`  FAIL  ${name}\n          ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const get = (path, init) => fetch(`${origin}${path}`, { redirect: 'manual', ...init });

// --- what this run can and cannot cover ---------------------------------

const url = new URL(origin);
const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
const coverage = [];
coverage.push(
  url.protocol === 'https:'
    ? 'TLS: exercised (https)'
    : 'TLS: NOT exercised — this origin is plain http',
);
coverage.push(
  isLocal
    ? 'DNS: NOT exercised — this origin is a loopback address'
    : `DNS: exercised (${url.hostname} resolved)`,
);

// --- the deployment is alive --------------------------------------------

await check('the site answers', async () => {
  const response = await get('/');
  expect(response.status === 200, `GET / returned ${response.status}`);
  const body = await response.text();
  expect(body.includes('<main'), 'the home page has no main landmark — is this the right origin?');
  return `${response.status}, ${(body.length / 1024).toFixed(1)}KB`;
});

await check('health reports a state', async () => {
  const response = await get('/health');
  expect([200, 503].includes(response.status), `/health returned ${response.status}`);
  const body = await response.json();
  expect(typeof body.storage === 'string', '/health did not report storage');
  // Degraded is a legitimate answer. Silence is not.
  if (body.status !== 'ok') {
    throw new Error(`deployment is ${body.status}: storage ${body.storage}`);
  }
  return `${body.status}, storage ${body.storage}, ${body.published} published, ${body.openRuns} open runs, accepting=${body.accepting}`;
});

await check('health leaks nothing', async () => {
  const body = await (await get('/health')).text();
  expect(!/secret|token|key|password/i.test(body), '/health mentions a credential');
  expect(!/\/(home|var|tmp|Users)\//.test(body), '/health exposes a filesystem path');
  return 'no credentials, no paths';
});

await check('the build marker identifies what is serving', async () => {
  // Step 8's build/version marker. Two independent sources: the function
  // reports what the platform says it built, the HTML carries what the build
  // stamped. Both must exist, and a deployment where they disagree is
  // half-updated — the function from one commit, the pages from another.
  const health = await (await get('/health')).json();
  const home = await (await get('/')).text();
  const marker = /<meta name="olibana-build" content="([^"]*)">/.exec(home)?.[1];

  expect(typeof health.build === 'string' && health.build !== '', '/health reports no build');
  expect(marker !== undefined && marker !== '', 'the served HTML carries no build marker');

  const known = (value) => value !== 'unknown';
  if (known(health.build) && known(marker)) {
    expect(
      health.build === marker,
      `the function reports build ${health.build} but the pages were built at ${marker} — ` +
        'this deployment is half-updated',
    );
  }
  if (expectedBuild !== undefined) {
    const shortened = expectedBuild.slice(0, 12);
    expect(
      marker === shortened,
      `expected build ${shortened}, deployment is serving ${marker} — this is a stale deployment`,
    );
  }
  return `function=${health.build}, pages=${marker}${expectedBuild ? ', matches expected' : ''}`;
});

// --- the security posture survived deployment ---------------------------

await check('security headers are actually served', async () => {
  // Set in code AND in _headers. Only the deployment can say which arrived.
  const response = await get('/health');
  const required = {
    'referrer-policy': /no-referrer|same-origin/,
    'x-content-type-options': /nosniff/,
    'content-security-policy': /script-src 'none'/,
  };
  for (const [header, pattern] of Object.entries(required)) {
    const value = response.headers.get(header) ?? '';
    expect(pattern.test(value), `${header} is "${value || 'absent'}"`);
  }
  return Object.keys(required).join(', ');
});

await check('the static site carries the headers too', async () => {
  // The router sets them in code; `_headers` covers everything else. A header
  // on one half only is a gap that depends on which half a visitor reaches.
  const response = await get('/');
  const referrer = response.headers.get('referrer-policy') ?? '';
  expect(/no-referrer|same-origin/.test(referrer), `static pages send referrer-policy "${referrer || 'absent'}"`);
  return referrer;
});

// --- the routes exist ----------------------------------------------------

await check('every navigation destination resolves', async () => {
  const home = await (await get('/')).text();
  const paths = [...new Set([...home.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))];
  expect(paths.length > 2, `only ${paths.length} internal links found on the home page`);

  const broken = [];
  for (const path of paths) {
    const response = await get(path);
    if (response.status >= 400) broken.push(`${path} → ${response.status}`);
  }
  expect(broken.length === 0, `broken links: ${broken.join(', ')}`);
  return `${paths.length} links`;
});

await check('a missing page is a 404, not a 200', async () => {
  const response = await get('/no-such-page-exists');
  expect(response.status === 404, `an unknown path returned ${response.status}`);
  return '404';
});

// --- the commerce boundary behaves --------------------------------------

await check('the checkout refuses a malformed order rather than accepting it', async () => {
  // Nothing is bought. This posts something invalid on purpose and requires a
  // refusal — the one commerce assertion that is safe against a live gateway.
  const response = await get('/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ productId: 'PRD_nonexistent', sku: 'X', quantity: '1', email: 'smoke@example.test' }).toString(),
  });
  expect(
    [422, 503].includes(response.status),
    `a nonexistent product produced ${response.status} — it must be refused (422) or unavailable (503)`,
  );
  return `${response.status}`;
});

await check('the webhook refuses an unsigned payload', async () => {
  const response = await get('/webhooks/payment', { method: 'POST', body: '{}' });
  expect(response.status === 400, `an unsigned webhook produced ${response.status}, expected 400`);
  return '400';
});

await check('the sandbox is not exposed', async () => {
  // If this answers on a public deployment, orders can be recorded as paid
  // without any money moving.
  const response = await get('/sandbox/pay?ref=smoke');
  expect(
    response.status === 404,
    `the sandbox payment page answered ${response.status} — a public deployment must not serve it`,
  );
  return '404';
});

// --- report --------------------------------------------------------------

process.stdout.write(
  `\nsmoke test — ${origin}\n  ${coverage.join('\n  ')}\n\n${results.join('\n')}\n\n`,
);
if (failed === 0) {
  const uncovered = ['payment — none was attempted'];
  if (url.protocol !== 'https:') uncovered.push('TLS — this origin is plain http');
  if (isLocal) uncovered.push('DNS — this origin is a loopback address');
  process.stdout.write(
    'all checks passed. This says the deployment serves, refuses correctly, and leaks nothing.\n' +
      `NOT covered by this run:\n${uncovered.map((u) => `  - ${u}`).join('\n')}\n`,
  );
} else {
  process.stdout.write(`${failed} check(s) failed. The deployment is not verified.\n`);
}
process.exit(failed === 0 ? 0 : 1);
