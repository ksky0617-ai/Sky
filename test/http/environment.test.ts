/**
 * Configuration validation.
 *
 * The failures here are the silent ones: a sandbox that records paid orders on
 * a public address, and a live gateway that takes money it cannot confirm.
 * Neither announces itself, and neither is recoverable by reading logs after
 * the fact — so both are refused at startup instead.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVATION_CHECKLIST,
  EnvironmentInvalid,
  validateEnvironment,
} from '../../src/http/environment.ts';

const SECRET = 'a-secret-long-enough';

test('an unconfigured deployment is closed, and that is a valid state', () => {
  // The repository's own state. Nothing is set, the site serves, the checkout
  // refuses honestly.
  assert.deepEqual(validateEnvironment({}), { mode: 'closed', webhookSecret: null, origin: '' });
});

test('a mode that is not one of the three is refused rather than guessed', () => {
  for (const OLIBANA_MODE of ['production', 'test', 'LIVE ', 'yes']) {
    if (OLIBANA_MODE.trim().toLowerCase() === 'live') continue;
    assert.throws(() => validateEnvironment({ OLIBANA_MODE }), EnvironmentInvalid, OLIBANA_MODE);
  }
});

test('mode is read case- and whitespace-insensitively, because operators type it', () => {
  assert.equal(validateEnvironment({ OLIBANA_MODE: ' Closed ' }).mode, 'closed');
});

test('a half-configured deployment is refused in both directions', () => {
  // A secret with no mode: someone meant to turn payments on and did not.
  assert.throws(
    () => validateEnvironment({ OLIBANA_WEBHOOK_SECRET: SECRET }),
    (e: unknown) => e instanceof EnvironmentInvalid && /half-configured/.test(String(e)),
  );
  // A mode with no secret: payments on, confirmations unverifiable.
  for (const OLIBANA_MODE of ['sandbox', 'live']) {
    assert.throws(
      () => validateEnvironment({ OLIBANA_MODE }),
      (e: unknown) => e instanceof EnvironmentInvalid && /without a verifiable signature/.test(String(e)),
      `${OLIBANA_MODE} started with no secret`,
    );
  }
});

test('a secret short enough to guess is not a secret', () => {
  assert.throws(
    () => validateEnvironment({ OLIBANA_MODE: 'live', OLIBANA_WEBHOOK_SECRET: 'short' }),
    EnvironmentInvalid,
  );
});

test('sandbox mode refuses a public origin', () => {
  // It records orders as paid with no money moving. Reachable from the public
  // internet, that is a way to manufacture paid orders.
  assert.throws(
    () => validateEnvironment({
      OLIBANA_MODE: 'sandbox', OLIBANA_WEBHOOK_SECRET: SECRET, OLIBANA_ORIGIN: 'https://olibana.com',
    }),
    (e: unknown) => e instanceof EnvironmentInvalid && /never be reachable from a public address/.test(String(e)),
  );
});

test('sandbox mode runs locally', () => {
  for (const OLIBANA_ORIGIN of ['', 'http://localhost:8788', 'https://localhost:8788', 'https://127.0.0.1:8788']) {
    const env = validateEnvironment({
      OLIBANA_MODE: 'sandbox', OLIBANA_WEBHOOK_SECRET: SECRET, OLIBANA_ORIGIN,
    });
    assert.equal(env.mode, 'sandbox', OLIBANA_ORIGIN);
  }
});

test('live mode is allowed on a public origin, because that is what it is for', () => {
  const env = validateEnvironment({
    OLIBANA_MODE: 'live', OLIBANA_WEBHOOK_SECRET: SECRET, OLIBANA_ORIGIN: 'https://olibana.com',
  });
  assert.deepEqual(env, { mode: 'live', webhookSecret: SECRET, origin: 'https://olibana.com' });
});

test('the activation checklist starts with the legal entity and ends with publication', () => {
  // Order matters: it is the order in which the blocking facts become true.
  assert.match(ACTIVATION_CHECKLIST[0], /legal entity/);
  assert.match(ACTIVATION_CHECKLIST.at(-1) ?? '', /publish a product/);
  assert.ok(ACTIVATION_CHECKLIST.some((step) => /refund it/.test(step)), 'no real-payment proof step');
});
