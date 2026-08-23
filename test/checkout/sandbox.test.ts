/**
 * The sandbox gateway and the signature verifier.
 *
 * The verifier is the one piece of security in this system that stands between
 * a stranger and a paid order, so it is tested as an attacker would probe it:
 * no signature, wrong secret, altered body, replayed message, malformed header.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { CheckoutUnavailable, type CheckoutIntent } from '../../src/checkout/checkout.ts';
import { IntentInvalid, IntentStore } from '../../src/checkout/intents.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';
import {
  HmacWebhookVerifier,
  SandboxGateway,
  SandboxRefused,
  signWebhook,
  SIGNATURE_TOLERANCE_SECONDS,
  toCompletedCheckout,
  type SignedWebhook,
} from '../../src/checkout/sandbox.ts';

const dir = mkdtempSync(resolve(tmpdir(), 'olibana-sandbox-'));
let n = 0;
test.after(() => rmSync(dir, { recursive: true, force: true }));

const SECRET = 'a-secret-long-enough';

const intent: CheckoutIntent = {
  productId: 'PRD_test', productName: 'Test Coat', sku: 'OLB-CT-001-STN-M', quantity: 2,
  unitPriceAmount: 72000, currency: 'JPY', totalAmount: 144000, email: 'ada@example.test',
  preorderRunId: 'RUN_test', promisedShipBy: '2026-12-01T00:00:00.000Z',
  idempotencyKey: 'key-1', reference: 'EVT_reference',
};

const payload: SignedWebhook = {
  reference: 'EVT_reference', providerRef: 'ref_1', email: 'ada@example.test',
  shippingAddress: { line1: '1 Test Street', city: 'Kyoto', postalCode: '600-0000', country: 'JP' },
  amountPaid: 144000, currency: 'JPY',
};

function headers(signature: string): Headers {
  return new Headers({ 'x-olibana-signature': signature });
}

// --- the gateway ---------------------------------------------------------

test('the sandbox gateway cannot be created by accident', () => {
  // It records payments that never happened, so there is no default and no
  // truthy-ish value that will do.
  for (const enabled of [false, undefined, null, 1, 'true']) {
    assert.throws(() => new SandboxGateway(enabled as boolean), SandboxRefused, String(enabled));
  }
  assert.doesNotThrow(() => new SandboxGateway(true));
});

test('the sandbox session is a relative URL, so it cannot point at the wrong host', () => {
  const { url } = new SandboxGateway(true).createSession(intent);
  assert.equal(url, '/sandbox/pay?ref=EVT_reference');
});

// --- the verifier --------------------------------------------------------

test('a secret short enough to guess is refused at construction', () => {
  assert.throws(() => new HmacWebhookVerifier('short'), CheckoutUnavailable);
  assert.doesNotThrow(() => new HmacWebhookVerifier(SECRET));
});

test('a correctly signed, fresh payload verifies', async () => {
  const body = JSON.stringify(payload);
  const verified = await new HmacWebhookVerifier(SECRET).verify(body, headers(await signWebhook(SECRET, body)));
  assert.deepEqual(verified, payload);
});

test('every way of getting the signature wrong returns null, and none says which', async () => {
  const verifier = new HmacWebhookVerifier(SECRET);
  const body = JSON.stringify(payload);
  const valid = await signWebhook(SECRET, body);

  const attempts: Array<[string, Promise<unknown>]> = [
    ['no header', verifier.verify(body, new Headers())],
    ['empty signature', verifier.verify(body, headers('t=1,v1='))],
    ['no timestamp', verifier.verify(body, headers('v1=abc'))],
    ['malformed header', verifier.verify(body, headers('nonsense'))],
    ['wrong secret', signWebhook('another-secret-here', body).then((s) => verifier.verify(body, headers(s)))],
    ['altered body', verifier.verify(`${body} `, headers(valid))],
  ];

  for (const [name, attempt] of attempts) {
    assert.equal(await attempt, null, `${name} was accepted`);
  }
});

test('an altered amount invalidates the signature', async () => {
  // The signature covers the body, so changing one number in it breaks the MAC.
  const verifier = new HmacWebhookVerifier(SECRET);
  const original = JSON.stringify(payload);
  const signature = await signWebhook(SECRET, original);
  const tampered = JSON.stringify({ ...payload, amountPaid: 1 });

  assert.equal(await verifier.verify(tampered, headers(signature)), null);
});

test('a captured message cannot be replayed once it is stale', async () => {
  const verifier = new HmacWebhookVerifier(SECRET);
  const body = JSON.stringify(payload);
  const now = Math.floor(Date.now() / 1000);

  const justInside = now - (SIGNATURE_TOLERANCE_SECONDS - 5);
  const justOutside = now - (SIGNATURE_TOLERANCE_SECONDS + 5);

  assert.notEqual(await verifier.verify(body, headers(await signWebhook(SECRET, body, justInside))), null);
  assert.equal(await verifier.verify(body, headers(await signWebhook(SECRET, body, justOutside))), null);
});

test('a signed body that is not the expected shape returns null rather than throwing', async () => {
  const verifier = new HmacWebhookVerifier(SECRET);
  const body = 'not json at all';
  assert.equal(await verifier.verify(body, headers(await signWebhook(SECRET, body))), null);
});

test('the completion takes its key from the agreement, not from the message', async () => {
  const completed = toCompletedCheckout(payload, 'the-agreed-key');
  assert.equal(completed.idempotencyKey, 'the-agreed-key');
  assert.equal(completed.amountPaid, 144000);
});

// --- the intent store ----------------------------------------------------

function intents(): IntentStore {
  return new IntentStore(new FileStorage(resolve(dir, `intents-${n++}.jsonl`)));
}

test('an intent is recorded and read back by its reference', () => {
  const store = intents();
  store.record(intent);
  assert.equal(store.byReference('EVT_reference')?.totalAmount, 144000);
  assert.equal(new IntentStore(new FileStorage(store.path)).byReference('EVT_reference')?.sku, 'OLB-CT-001-STN-M');
});

test('an unknown reference names nothing', () => {
  const store = intents();
  store.record(intent);
  assert.equal(store.byReference('EVT_other'), null);
});

test('an intent with no reference is refused at the write', () => {
  // Enforced here rather than guarded at every read: one invariant, one place.
  const store = intents();
  for (const reference of ['', '   ']) {
    assert.throws(() => store.record({ ...intent, reference }), IntentInvalid);
  }
  assert.equal(store.all().length, 0);
  assert.equal(store.byReference(''), null);
});

test('recording the same reference twice does not create a second agreement', () => {
  // Two copies of one agreement can disagree, and then which is binding?
  const store = intents();
  store.record(intent);
  store.record({ ...intent, totalAmount: 1 });
  assert.equal(store.all().length, 1);
  assert.equal(store.byReference('EVT_reference')?.totalAmount, 144000);
});
