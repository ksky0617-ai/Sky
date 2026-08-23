# HUMAN GATE QUEUE

**Required by:** §57 · **Rule:** a gate is a waiting external action, not a stop order.

Everything in this file needs a person because it needs legal standing,
credentials, or money — not because the code is unfinished. Each entry says what
is already built, so the remaining human action is as small as it can be.

Autonomous work does **not** stop while these are open. Anything not blocked by
one of them is either done or in [`POST_COMPLETION_QUEUE.md`](./POST_COMPLETION_QUEUE.md).

---

## GATE-001 · Deploy to Cloudflare Pages

| | |
|---|---|
| `GATE_ID` | GATE-001 |
| `CLASS` | **GATE-B — external execution.** Code-complete; needs an account. |
| `REASON` | Deploying requires a Cloudflare account and its credentials. Nothing here can create one. |
| `WHY_AUTONOMOUS_EXECUTION_IS_IMPOSSIBLE` | Account ownership and API credentials. Not a technical limit. |
| `EXACT_HUMAN_ACTION_REQUIRED` | Create a Pages project pointing at this repository. Build command `npm run build`, output directory `dist`. Set `OLIBANA_MODE=closed`. Set nothing else. |
| `PRECONDITIONS` | None. `closed` mode takes no orders, needs no secret and writes nothing. |
| `WHAT_IS_ALREADY_COMPLETE` | `functions/[[path]].ts`, `_headers` generated from the same constant the router uses, `validateEnvironment` refusing every half-configuration, `/health` with a build marker, and `scripts/smoke-test.mjs` — **11/11 against a real local deployment, and proven to fail on 13 distinct false claims** (`test/meta/deploy-audit.test.ts`). |
| `WHAT_IS_NOT_VERIFIED` | **That Cloudflare can load the function.** The graph check proves it imports no Node built-in, which is necessary and not sufficient: the Pages bundler must also resolve **45 explicit `.ts` import specifiers across 17 modules**, and nothing here has tested that. If it cannot, the fix is a build step, not a redesign — but it is the first thing to look at if the deploy fails. |
| `POST_GATE_EXECUTION_PLAN` | `node --experimental-strip-types scripts/smoke-test.mjs https://<the-deployment> $(git rev-parse HEAD)` — passing the commit makes it fail on a stale deployment. |
| `VERIFICATION_AFTER_GATE` | All 11 smoke checks pass against the deployed origin **over https and a real hostname**, so DNS and TLS are exercised for the first time (a loopback run covers neither, and the auditor says so in its own output). Then `DEPLOYMENT_PATH_VERIFIED = TRUE` and the Completion Gate is recomputed. |
| `REVERSIBLE` | **Yes.** A Pages project can be deleted. Nothing is published: the catalogue is empty, so the deployed site has no shop and no product page. |
| `RISK_IF_SKIPPED` | The deployment path stays unverified, which is currently the single reason `COMPLETION = FALSE`. |

## GATE-002 · The legal entity

| | |
|---|---|
| `GATE_ID` | GATE-002 · tracked as P0-7 |
| `CLASS` | **GATE-C — legal.** |
| `REASON` | Taking money requires an entity that can lawfully receive it and be liable for it. |
| `WHY_AUTONOMOUS_EXECUTION_IS_IMPOSSIBLE` | Registering a business is a legal act by a person. It is also the precondition for everything in GATE-003. |
| `EXACT_HUMAN_ACTION_REQUIRED` | Register the entity that will receive payments, and settle the tax and duty position for the markets the site will ship to (R-06, R-07 are open in `RISK_REGISTER.md`). |
| `PRECONDITIONS` | None. |
| `WHAT_IS_ALREADY_COMPLETE` | Every step that follows it is enumerated in `ACTIVATION_CHECKLIST` in `src/http/environment.ts` — in code, so it cannot drift from what is actually enforced. |
| `POST_GATE_EXECUTION_PLAN` | GATE-003 becomes possible. Nothing else changes. |
| `VERIFICATION_AFTER_GATE` | None automatic — this gate is not a system state. |
| `REVERSIBLE` | Dissolving an entity is possible but costly. **Treat as effectively irreversible.** |
| `RISK_IF_SKIPPED` | No payment can ever be taken. The pre-order model cannot operate. |

## GATE-003 · The payment provider account

| | |
|---|---|
| `GATE_ID` | GATE-003 |
| `CLASS` | **GATE-C — financial.** Depends on GATE-002. |
| `REASON` | A merchant account is opened by a legal entity and moves real money. |
| `WHY_AUTONOMOUS_EXECUTION_IS_IMPOSSIBLE` | Account creation, identity verification, and a settlement account are all acts by a person with legal standing. |
| `EXACT_HUMAN_ACTION_REQUIRED` | Open the account under the entity, then set `OLIBANA_MODE=live`, `OLIBANA_WEBHOOK_SECRET` to the provider's signing secret, and `OLIBANA_ORIGIN` to the public origin. |
| `PRECONDITIONS` | GATE-002. **And PCQ-004** — `live` mode cannot run on Pages until the logs have a durable store, because Workers have no writable filesystem. |
| `WHAT_IS_ALREADY_COMPLETE` | The full boundary: `PaymentGateway`, `WebhookVerifier`, real HMAC-SHA256 verification with a replay window and constant-time comparison, recorded checkout intents so the payload can never define the price, idempotency across redelivery, the confirmation page, and a sandbox that exercises all of it end to end without money. |
| `WHAT_REMAINS_AUTONOMOUSLY_EXECUTABLE` | One provider-specific adapter mapping the provider's payload shape onto `SignedWebhook`. **The security model does not change** — only the shape. It is not written because the provider is not chosen, and choosing one is part of this gate. |
| `POST_GATE_EXECUTION_PLAN` | Write the provider adapter · run the sandbox suite against it · one real payment of the smallest possible amount · confirm the order is recorded · refund it. |
| `VERIFICATION_AFTER_GATE` | One real payment recorded and refunded, with the order log showing exactly one placement and one PAID transition. |
| `REVERSIBLE` | Account closure is possible. **A real payment is not** — that is why it is last. |
| `RISK_IF_SKIPPED` | No order can ever be paid for. Everything up to the gateway still works. |

---

## What is deliberately NOT here

Anything a person *could* do but code can do instead. Writing adapters, mocks,
tests, migrations, configuration, documentation and audits are not gates — §2
classifies them GATE-A, and they are done rather than queued.

If an entry ever appears here that does not require legal standing, credentials,
or money, it is misfiled.
