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
| `WHAT_IS_ALREADY_COMPLETE` | `functions/[[path]].ts`, `_headers` generated from the same constant the router uses, `validateEnvironment` refusing every half-configuration, `/health` with a build marker, and `scripts/smoke-test.mjs` — **17/17 against a real local deployment, and proven to fail on 20 distinct false claims** (`test/meta/deploy-audit.test.ts`). The auditor no longer believes `/health`: every claim it makes is cross-checked against something observable, and a *report of ill health* is the only thing taken at face value. |
| `WHAT_IS_NOT_VERIFIED` | **That Cloudflare can load the function.** The graph check proves it imports no Node built-in, which is necessary and not sufficient: the Pages bundler must also resolve **45 explicit `.ts` import specifiers across 17 modules**, and nothing here has tested that. If it cannot, the fix is a build step, not a redesign — but it is the first thing to look at if the deploy fails. |
| `POST_GATE_EXECUTION_PLAN` | `node --experimental-strip-types scripts/smoke-test.mjs https://<the-deployment> $(git rev-parse HEAD) --json=audit.json` — passing the commit makes it fail on a stale deployment, and `--json` writes the raw evidence rather than only the prose. |
| `EXPECTED_RESULT — read this before running it` | **Not clean, and that is correct.** With no `OLIBANA_*` storage paths set, the function has no writable store, so `/health` answers **503** with `status: degraded, storage: unavailable` and the auditor exits **1** on `the deployment reports itself degraded: storage unavailable`. The write-path check is **UNVERIFIED** (nothing is published, so there is no valid checkout to write through). That is **PCQ-004 arriving in production**, not a failed deploy. Measured locally, not predicted — V-2026-08-23-019. |
| `VERIFICATION_AFTER_GATE` | Two things, and only the first is this gate's: **(1)** every check *other than* the two storage ones passes against the deployed origin **over https and a real hostname**, so DNS and TLS are exercised for the first time (a loopback run covers neither, and the auditor says so in its own output) — that is `DEPLOYMENT_PATH_VERIFIED = TRUE`. **(2)** a clean 17/17 needs a durable store, which is PCQ-004, not this gate. Do not record (1) as (2), and do not record UNVERIFIED as passed. |
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

## GATE-004 · Atlas field measurement — the Rule Layer

| | |
|---|---|
| `GATE_ID` | GATE-004 |
| `CLASS` | **BLOCKED_EXTERNAL.** Not a credential and not a legal act — a person has to go and measure a river. |
| `REASON` | 02_BRAND_EXPERIENCE_SYSTEM.md §4.1 specifies the Rule Layer as the brand's *primary signature*: a toggle that draws the measured rule over the garment it produced — a curvature radius, a fracture angle, a branching ratio, a colour temperature in Kelvin. **It renders only from real Atlas rows.** All four Atlases hold zero. |
| `WHY_AUTONOMOUS_EXECUTION_IS_IMPOSSIBLE` | The required input is physical measurement of natural phenomena. No amount of code produces a river's meander radius. |
| `CONSTRAINT` | **No numeric value may be invented.** §4.1 states its own failure condition: *"if it renders invented numbers, it must be removed entirely. A false drawing is worse than no drawing."* This is not a style rule — a brand whose premise is *forms derived from measured nature* cannot display an invented measurement and remain the same brand. |
| `RESOLUTION` | **Removed from executable acceptance** until authoritative Atlas data is supplied. It is not counted as an unmet code criterion, and it is not counted as done. |
| `WHAT_IS_ALREADY_COMPLETE` | The honesty is structural rather than remembered. `countAtlasDataRows` returns the number of REAL rows and drives both the page (no measurements section when zero) and the search index (`atlasSource: null` for an unmeasured Atlas), so the index and the page cannot disagree. `assertSearchDocument` refuses an entry carrying a `naturalRule` with no `atlasSource` behind it — a claim with no measurement behind it. |
| `RE_ENTRY_CONDITION` | Authoritative Atlas field data is available **and its provenance is recorded** — what was measured, where, when, and with what. 03 §3 sets the threshold: **3 field records per Atlas, 12 total.** Below that `/nature` is a statement of intent; at or above it, `/nature` is evidence and the Rule Layer becomes possible. |
| `POST_GATE_EXECUTION_PLAN` | Rows land in the Atlas documents → the measurements section renders itself → the search index gains real `atlasSource` values → the Rule Layer becomes implementable against data that exists. |
| `VERIFICATION_AFTER_GATE` | Each drawn value traceable to a recorded row. A value with no row must fail the build, not merely fail review. |
| `REVERSIBLE` | Yes. Measurements are additive. |
| `RISK_IF_SKIPPED` | The brand's differentiating mechanism never ships. 03 §6 records that **all five** philosophy-to-commerce connections block on this same input — it is not one feature's dependency. |
| `CURRENT_STATUS` | **BLOCKED_EXTERNAL** |

---

## What is deliberately NOT here

Anything a person *could* do but code can do instead. Writing adapters, mocks,
tests, migrations, configuration, documentation and audits are not gates — §2
classifies them GATE-A, and they are done rather than queued.

If an entry ever appears here that does not require legal standing, credentials,
or money, it is misfiled.
