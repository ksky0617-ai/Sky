# Runbook

What to do to this system when it is running, and what to do when it is not.

Written to be followed by someone who did not build it.

---

## Deploying

```bash
npm run verify                                    # build + full suite
node --experimental-strip-types scripts/smoke-test.mjs http://127.0.0.1:<port> $(git rev-parse HEAD)
```

Passing the commit makes the check fail on a **stale** deployment — one that
answers correctly while serving code nobody deployed.

Deploy only if both pass. The smoke test needs a running server:

```bash
npm run build
OLIBANA_MODE=closed node --experimental-strip-types scripts/serve.mjs dist
```

**There is no deploy command in this repository.** No `wrangler.toml`, no
`npm run deploy`, no CI workflow — checked, not assumed. Pages builds from the
repository, configured once in its dashboard:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Functions | `functions/[[path]].ts`, picked up automatically |

**Unverified, and the first thing to check if the deploy fails:** the function's
import graph uses 45 explicit `.ts` specifiers across 17 modules. It imports no
Node built-in — that is checked by `test/http/runtime-compat.test.ts` — but
whether the Pages bundler resolves `.ts` specifiers has never been tested,
because that needs a deployment. If it does not, the remedy is a build step, not
a redesign.

After deploying, run the smoke test **against the deployed origin, with the
commit you deployed**:

```bash
node --experimental-strip-types scripts/smoke-test.mjs https://<origin> $(git rev-parse HEAD) --json=audit.json
``` A deploy is
not verified until it passes there. The code passing locally has already proved
insufficient once: the Pages function could not load on Workers at all while
every test passed.

**Read the exit code, not the prose.** There are three:

| Exit | Meaning |
|---|---|
| `0` | Everything that could be checked was checked, and passed. |
| `1` | Something failed. The named check is the finding. |
| `3` | Nothing failed, but something **could not be checked**. This is not a pass. |

`3` is the one that gets misread. It appears when a deployment publishes no
product, because there is then no valid checkout to write an intent through and
the storage write path is unexercised. `--json` writes the raw findings, with a
status per check, so the record does not depend on anyone quoting the summary
line correctly.

The auditor does **not** believe `/health`. Every count it reports is
cross-checked against the sitemap, the purchase form, the confirmation route, and
a real write. The single exception is a report of *ill* health, which is believed
on its own — so a deployment answering `status: degraded` fails immediately.
**A Pages deployment with no `OLIBANA_*` paths set has no writable store and will
do exactly that.** That is PCQ-004, not a broken deploy; see GATE-001.

## Configuration

Three valid states. `validateEnvironment` refuses everything between them and
throws rather than serving in whichever half was configured.

| `OLIBANA_MODE` | `OLIBANA_WEBHOOK_SECRET` | Behaviour |
|---|---|---|
| `closed` | must be unset | Site serves. Checkout answers 503. Nothing is written. |
| `sandbox` | required, 16+ chars | Full loop, no money. **Refused on a public origin.** |
| `live` | required, 16+ chars | Real gateway. Blocked by GATE-002, GATE-003, PCQ-004. |

`OLIBANA_ORIGIN` is the public origin. `OLIBANA_CATALOG`, `OLIBANA_RUNS`,
`OLIBANA_ORDERS`, `OLIBANA_INTENTS` override log paths; unset means storage that
**refuses writes** rather than losing them.

## Checking a running deployment

```bash
curl https://<origin>/health
```

| Field | Meaning |
|---|---|
| `status` | `ok`, or `degraded` when storage cannot be read or written |
| `storage` | `available` · `unavailable` (nothing durable configured) · `unreadable` (log corrupt) |
| `published` / `openRuns` | Public counts, already visible on the site |
| `accepting` | Whether a customer could complete a purchase right now |

`degraded` answers **503**, so an uptime check notices. `accepting: false` with
`status: ok` is normal and correct while nothing is for sale.

## When something is wrong

### `/health` says `storage: unavailable`

Writes would be lost, so they are refused instead. The log paths are unset or
unwritable. On Workers this is expected — see PCQ-004. Fix the configuration; do
not work around it. An order accepted here is an order the customer believes was
placed and the business never sees.

### `/health` says `storage: unreadable`

A log has a corrupt line. **Do not edit it.** The logs are append-only; the
recovery is to restore from history:

```bash
git log --oneline -- data/            # if the logs are versioned
```

A partial final line from a crash is *not* corruption — it is discarded on read
and removed before the next write, automatically. `unreadable` means damage
inside committed history, which is a different problem.

### The checkout answers 503

Expected in `closed` mode. In `live` mode it means no provider adapter is
configured — the gateway refuses rather than inventing a checkout URL.

### A webhook answers 400

Unsigned, forged, stale (older than 300s), or unparseable. All four are refused
identically and on purpose: telling a sender which part failed is free
information for them. Check the provider's signing secret matches
`OLIBANA_WEBHOOK_SECRET`.

### A webhook answers 422

The payment does not match the recorded agreement — wrong amount or currency.
**This needs a person.** The money is real and the order is not. Do not retry;
retrying cannot fix a mismatch. Reconcile against the provider's own record.

### A customer says they paid but has no confirmation

1. `/health` — is storage available?
2. Provider dashboard — did the payment succeed?
3. Order log — search for the payment reference.

If the payment succeeded and no order exists, the webhook never arrived or was
refused. The provider's record is authoritative for *whether money moved*; the
order log is authoritative for *what was agreed*. Both must exist.

## Rolling back

The site is static plus one function, and no state migration exists, so a
rollback is a redeploy of the previous commit:

```bash
git revert <commit> && git push          # or redeploy the prior build in Pages
```

**The logs do not roll back, and must not.** They are append-only: an order
placed under the new version stays placed. A rollback changes the code serving
requests, never the history of what customers did.

Before rolling back, check `/health` on the previous version too. Rolling back
onto a configuration that cannot write is worse than the problem being fixed.

## What this system will never do on its own

- Take a payment without `OLIBANA_MODE=live` and a real provider adapter
- Serve the sandbox payment page on a public origin
- Record an order whose amount differs from what was agreed
- Publish a product or open a pre-order run — both require recorded data that
  does not exist
- Write anything when no durable storage is configured
