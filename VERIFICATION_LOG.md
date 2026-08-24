# VERIFICATION LOG

**Required by:** SSOT v2.0 §20 (`LAST_VERIFICATION`), §28 (verification evidence)
**Scope:** every verification run whose result was used to justify a state claim.

Tiers: `V0` static · `V1` unit · `V2` integration · `V3` end-to-end · `V4` adversarial/mutation · `V5` regression · `V6` production-boundary.

> **V3 reached for the website** (real browser, real HTTP). **V2 reached for order persistence** (real filesystem, reload across instances). **Concurrency and crash durability are now exercised** with spawned processes (V-2026-08-15-010). Payment and the production boundary remain unexercised.

---

## V-2026-08-24-020 · V0 + V1 + V3 + V4 · The motion language, implemented and made unable to hide content

| | |
| --- | --- |
| **Target** | `src/site/styles.ts`, `src/site/markdown.ts`, `src/site/build.ts`, `scripts/visual-check.mjs`, `test/site/motion.test.ts` (new) |
| **Bottleneck selected** | `docs/website/04_MOTION_LANGUAGE.md` is a 246-line specification — five tokens with cited Atlas sources, an explicit reduced-motion mapping per token, eight prohibitions, a six-question gate and twelve acceptance criteria. The implementation used **one** of it: a hover colour transition. The five duration tokens were defined and four were never referenced. Deployment, payment and legal are all behind human gates; this was the largest code-completable gap in the repository, and the one the site is judged by. |
| **Why it had been abandoned rather than built** | A previous cycle staggered `main`'s children with `animation-delay` + `animation-fill-mode: both`. `both` holds an element at its FIRST keyframe throughout its delay, and the first keyframe of a reveal is invisible — a browser screenshot showed a near-blank page. The correction was to remove all reveal motion, and the stylesheet then carried a comment explaining that content is not animated. That answered §7 Q6 by having no motion, which is not what the specification says. |
| **What was built** | §8 Tier 1: CSS scroll-driven animation, compositor-run, **0 KB JavaScript**, under one invariant — *the resting style of every element is its final style*. All four unused tokens are now in effect: `stone` on section entry, `forest` on list and grid entry, `river` drawing the section rules, `wind` as the hero's ≤8px loop, `light` unchanged on the page ground. There is **no `animation-delay` anywhere**: with a `view()` timeline the stagger is POSITIONAL, so §3.3's "the stagger IS the meaning" is carried by the layout that already encodes the hierarchy rather than by a timer that can strand an element. The defect class is removed structurally, not avoided carefully. |
| **Defect found by the browser, not by the plan** | The first implementation used the specification's own axes — `opacity` for forest (§3.3) and `clip-path` for stone (§3.2). Chromium then reported **h2, li and .state elements below the fold sitting at `opacity: 0`** on home, product, nature and philosophy. That is §10's "No content is revealed only by animation" exactly, and §7 Q6 rejects it. **Every reveal keyframe is now transform-only** — translate and scale move an element, they never hide one. §3.2's named `clip-path` axis is deliberately not used; the gate outranks the axis, and stone's character comes from its easing (its own "resists before it moves"), not from the property. |
| **The static check, corrected by that measurement** | `findLoadBearingMotion` first treated `@keyframes` as the one place a hidden state belongs — reasoning that the `@supports` and `prefers-reduced-motion` guards made it safe. They protect a reader whose browser does not run the animation; they do nothing for the reader whose browser does. The check now rejects `opacity < 1`, a clipping `clip-path`, or `visibility: hidden` **inside a keyframe as well**, and the test that asserted the opposite was inverted with the reason recorded in it. |
| **Two more checks, because §5 asks for them by name** | `findMotionProhibitions` — easing overshoot (a control point off the [0,1] output axis: §1, "Olibana does not bounce"), durations under the 300ms floor, infinite loops outside `motion.wind`, glassmorphism, animated gradients. `findInlineMotionValues` — §10's first criterion, every duration and easing a token reference rather than a literal, so a later field measurement changes one line. |
| **Mutation / negative control** | 22 tests in `test/site/motion.test.ts`. Each check is fed the defect it exists for — the exact `delay` + `fill: both` stagger, an ungated reveal, a resting `opacity: 0`, a clipping keyframe, `cubic-bezier(0.34, 1.56, 0.64, 1)`, `0.2s`, an infinite loop, a literal duration — **and a control it must stay quiet on**: a transform-only keyframe, and the §6-mandated `0.01ms` reduced-motion reset, which must not be read as a floor violation. |
| **Two false positives in my own checkers, both fixed before use** | (1) `findInlineMotionValues` flagged `var(--motion-stone-ease)` as a literal, because the token is *named* for the easing — token references are now removed before the value is examined. (2) A raw `/animation-delay/` in a test matched the stylesheet's own comment explaining the defect. **That is the third time in this repository a checker has been fooled by prose describing the thing it looks for.** It now reads through the comment-aware parser. |
| **Defect found on a route the visual check had never covered** | Adding `/olibana/philosophy` and `/olibana/design-language` to the browser run exposed **two dead links on published pages**: `href="./Design_System.md"` and `href="./Light_Atlas.md"`. The source documents link to each other the way files in a repository do, and that address survived into HTML where no `.md` is served at any address. Nothing caught it — the unit suite checks the anchor renders, and it did; the deployment auditor follows navigation, and these were in body copy. Fixed at the renderer (a document with a page becomes a link to that page; one without renders unlinked rather than pointing nowhere) and gated at the build: `findDeadLinks` refuses to emit while any internal link resolves to an address the build does not produce, and refuses relative addresses outright, since where they land depends on the page's directory. |
| **A WCAG false positive, corrected against the criterion text** | The visual check reported a 19px inline link as an SC 2.5.8 failure. It is not: the criterion has an explicit **Inline exception** for a target in a sentence. The check now applies it. A conformance failure reported where none exists is worse than a missed one, because the fix would have damaged the typography to satisfy a rule that never applied. |
| **Runtime observation — does it actually run** | Chromium, `document.getAnimations()`, per route: **9 animations on home** — 3 `stone-enter`, 5 `forest-enter`, 1 `wind-drift` — on `ViewTimeline` for every reveal and `DocumentTimeline` for the wind loop alone. Under `prefers-reduced-motion: reduce`: **0**. Both are now permanent checks, including one that fails if a reveal is found running on a time-based timeline — the shape the old defect would take if a rule ever lost its `animation-timeline`. |
| **Resting-state observation — does it hide anything** | Every element carrying text, on 8 routes × 3 viewports = 24 renders, measured for computed opacity and visibility **with no scrolling performed**. Zero not fully painted. The run also reports which pages cannot scroll (`scroll=NO` on shop, confirmation, sandbox, and notfound/tablet), because a page that cannot scroll leaves a `view()` timeline inactive — the state a static check cannot reason about and the one most likely to strand an element. |
| **Cost** | Home payload 23.6 KB → 24.3 KB (+0.7 KB), against a 120 KB budget. LCP 40–100 ms against a 1000 ms budget. **CLS 0.00** — transforms do not affect layout. Scripts loaded: 0. |
| **Observed** | 363/363 pass (from 341). Visual check exit 0 across 24 renders. |
| **Result** | **PASS.** §10 acceptance: 12 of 12 criteria now hold, 9 of them mechanically. |
| **Standing limits** | The values remain **provisional** (§2) — derived from qualitative Atlas observation, not field measurement; no reading exists to derive them from. Measured in Chromium only: Firefox has scroll-driven animations behind a flag, which is precisely the case `@supports` covers, and the static-final-state fallback is reasoned rather than observed. INP still needs a real interaction. No screen-reader testing. |
| **Not touched** | `COMPLETION` stays FALSE. GATE-001/002/003 unchanged; Pinterest, media cluster and dropshipping stay frozen behind Core per §22.19. |
| **Commit** | written against `75c505b` |

---

## V-2026-08-23-019 · V3 + V4 + V6-boundary · Removing the auditor's dependence on `/health`

| | |
| --- | --- |
| **Target** | `scripts/smoke-test.mjs` (rewritten), `test/meta/deploy-audit.test.ts`, `src/http/router.ts` |
| **Why** | V-018 closed with a disclosed limit: *the auditor believes what `/health` says about itself.* A deployment reporting `ok` while its storage was broken passed. `/health` is written by the same author as the auditor, so a shared wrong assumption produced agreement rather than detection — the auditor and the application were not independent oracles. |
| **What changed — cross-checks, not credence** | Every claim `/health` makes is now checked against something the application cannot fake without also breaking what a customer sees: `published` → the product pages actually in `sitemap.xml`; `openRuns`/`accepting` → whether a product page actually offers a purchase; `storage` (read) → the confirmation route, which reads the order log; `storage` (write) → **a real write**, a valid checkout POST that records an intent through the live path. The auditor imports nothing from `src/` — it speaks HTTP only, so it cannot inherit the application's judgement. |
| **The one asymmetry, stated deliberately** | A report of *ill* health is still believed. "I am fine" serves the claimant and needs corroboration; "I am broken" is an admission against interest and nothing is gained by disbelieving it. So `status: degraded` fails on the report alone. |
| **Status taxonomy** | `PASS · FAIL · UNVERIFIED · UNEXECUTED · EXTERNALLY_BLOCKED · NOT_APPLICABLE`, with **UNVERIFIED → PASS forbidden**, enforced by the exit code: `1` on any FAIL, **`3` on any UNVERIFIED**, `0` only when everything that could be checked was. `--json` writes the raw findings, so the prose is not the record. |
| **Method — the false-state matrix** | Twenty deployments, each wrong in exactly one way, each requiring a non-zero exit **naming that fault**; plus a control requiring a pass, without which every one of them would also pass against an auditor that always fails. New this cycle: /health `ok` while the order log cannot be read (A) · while it answers 503 rather than throwing (A2) · while storage cannot be written (B) · while a forged signature is accepted (C) · while the published count is fiction (E) · while `accepting` is true and nothing can be bought (E2) · while the checkout accepts a nonexistent product (F). |
| **CASE D — declared, not claimed** | §12 names invalid database credentials. **There is no database** — persistence is an append-only log — so this is `NOT_APPLICABLE`, and the test asserts the auditor never uses the word. Recorded rather than skipped, so the gap becomes visible the day a database is added. |
| **Executed against real deployments, not only mocks** | (1) **Fixture, one product published:** 17 passed · 0 failed · 0 unverified, **exit 0**. The write reached real storage — `intents.jsonl` holds one record, `OLB-CT-001-STN-S ×1, 68000 JPY, deployment-audit@example.invalid` — and `orders.jsonl` is **empty**: the auditor proves the write path without creating an order. (2) **Real `dist`, closed, nothing published:** 16 passed · 0 failed · **1 unverified**, **exit 3** — the write path cannot be exercised and is not passed. (3) **Storage that cannot be written:** **exit 1**, 14 · 2 · 1. |
| **Defect found by run (3), in the application** | With an unreadable order log, `/health` degraded honestly while `CONFIRMATION_PATH` threw — **a customer who had just paid got an unhandled 500.** Now a 503 that says the records cannot be read. Deliberately *not* the 202 "still being recorded" page: that page asserts the order is on its way, and an unreadable log is exactly the state in which nobody knows that. Killed by mutation (catch → `confirmation(null)` → test fails) and pinned from outside by CASE A2, so the friendlier code can never become a way past the auditor. |
| **Consequence for GATE-001, measured rather than predicted** | A Pages deployment with no storage binding will come back **1 FAIL + 1 UNVERIFIED, not clean** — `storage: unavailable`, `/health` 503. That is PCQ-004 arriving in production, not a failed deploy. `HUMAN_GATE_QUEUE.md` now says so before the command, so the result is not misread in either direction. |
| **Observed** | 341/341 pass. Auditor 17/17 exit 0 against a working deployment; exit 3 against one it cannot fully check; exit 1 against a broken one. |
| **Result** | **PASS** for the auditor's discrimination. **`COMPLETION` stays FALSE** — nothing here touches GATE-001/002/003. |
| **Standing limit, unchanged and not narrowed** | Point-in-time observation. A component that reads and writes correctly during the audit and fails afterwards is invisible to it; that is what an audit is, and continuous assurance is not built. Still never exercised: TLS · DNS · a real payment. |
| **Commit** | written against `0ca3775` |

---

## V-2026-08-22-018 · V0 + V3 + V4 · Verifying the deployment auditor itself

| | |
| --- | --- |
| **Target** | `scripts/smoke-test.mjs`, `test/meta/deploy-audit.test.ts` (new), `src/site/build-id.ts` (new), `/health` |
| **Method** | A 14-step external audit: reconstruct state, locate the deployment command, locate the verification command, execute it, capture raw output, distrust the prose, compare claimed against observed, and prove the auditor fails on false claims before recomputing anything. |
| **Step 2 — the deployment command** | **There is none.** No `wrangler.toml`, no deploy script, no CI workflow, nothing referencing a Cloudflare token — searched, not assumed. Pages builds from the repository, configured in its dashboard. The runbook now says this outright, because "build command `npm run build`" could be read as a command in the repo. |
| **Step 7 — the public URL** | **None exists.** The only origins anywhere are unit-test fixtures and a usage example in a comment. No tags, no deployment records. So DNS and TLS **cannot** be exercised, and the auditor now says which of them a given run did not cover rather than passing in silence. |
| **Step 8 — the build marker was missing** | Nothing identified which build was serving. **A stale deployment would have passed every check.** `src/site/build-id.ts` reads the platform's own record, falls back to git, and returns `unknown` rather than inventing a value — a marker that guesses would be believed. It is stamped into every page and reported by `/health`, so the two can be cross-checked: a deployment where they disagree is half-updated. |
| **Steps 4–6 — execution** | Ran against a real local deployment. **Exit code 0**, checked separately from the prose. 11/11, with the build marker matching `git rev-parse HEAD`. |
| **Steps 9–11 — claimed vs observed: three mismatches, one substantive** | (1) Three documents said "10/10"; the count is 11. (2) The runbook could be read as implying a deploy command exists. (3) **The substantive one: I had written that the function "loads on Workers".** What is verified is that it imports no Node built-in — necessary, not sufficient. The Pages bundler must also resolve **45 explicit `.ts` specifiers across 17 modules**, and nothing has tested that. All three corrected; the third is now recorded as the first thing to check if the deploy fails. |
| **Steps 12–13 — the auditor is now itself verified** | It had only ever run against a working deployment, so every green result was equally consistent with "the deployment is fine" and "the checker cannot tell". `test/meta/deploy-audit.test.ts` stands up servers that are wrong in exactly one way and requires a non-zero exit **naming that specific fault**: nothing listening · a stale build · a half-updated deployment · a missing marker · absent headers · a leaking `referrer-policy` · an exposed sandbox · a leaked credential · a degraded report · a broken link · no 404 · a checkout accepting a nonexistent product · a webhook accepting an unsigned payload. **13 false claims, 13 failures, each for the right reason.** A control case requires it to pass a correct deployment, without which every one of those would also pass against a checker that always fails. |
| **Observed** | 330/330 pass. Smoke test 11/11, exit 0. |
| **Result** | **PASS** — and the auditor's passes now mean something they did not mean yesterday. |
| **Disclosed limit, recorded as a test** | The auditor believes what `/health` says about itself. A deployment reporting `ok` while its storage is broken passes. The health logic is tested separately against the real implementation; from outside, an honest report and a lie are indistinguishable. Written as a passing test so the limit shows in the output, and so it fails if the limit ever closes. |
| **Commit** | written against `0bc5df8` |

---

## V-2026-08-22-017 · V0 + V1 + V3 + V4 · The suite audits itself; the deployment can be checked

| | |
| --- | --- |
| **Target** | `test/meta/suite-audit.test.ts` (new), `/health`, `scripts/smoke-test.mjs` (new), `docs/RUNBOOK.md`, `HUMAN_GATE_QUEUE.md` |
| **Why** | §35 and §53: "296 tests passed" is not evidence, and the suite had never been audited for tests that pass without proving anything. That is the highest propagation risk here — an unsound test silently invalidates every VERIFIED claim resting on it rather than failing. |
| **Defect in my own scanner, found first** | The initial scan reported a false positive: it counted braces without skipping string and regex literals, so a regex containing `}` ended a test body early. **A checker that cannot parse is worse than none, because its output gets trusted.** The permanent version strips comments and literals, and four of its nine tests exist only to check the checker — including two that feed it known-bad input and require it to notice. |
| **Two real findings in the suite** | (1) `spec-conformance` carried an `assert.ok(true)` used as a documentation device — a comment wearing a test's clothes, passing regardless and adding one to a number people read as evidence. Removed; the disclosure lives in prose and in this log. (2) **Four HTTP tests asserted only a status code.** A 404 that still renders the sandbox page, a 503 that still wrote an order, and a 400 that still reached order placement all pass a status-only assertion. All four now assert what must *not* have happened. |
| **Defect in the health check, found by its own test** | The first version probed writability by taking the lock and appending nothing — which never reaches storage at all, so **a deployment whose writes went nowhere reported itself healthy**. It now performs a real zero-byte append: a genuine `open(O_APPEND)` that fails on a read-only filesystem and leaves no record. Caught by M96. |
| **Defect found by the smoke test on its first run** | **Static pages carried no security headers locally.** `_headers` is a Cloudflare file and the local server ignored it, so local and deployed differed — §42 environment drift. A smoke test that passes against production but fails against local cannot gate a deploy, which is the only thing it is for. The local server now applies the same file. |
| **Observed** | 313/313 pass. **Smoke test: 10/10 against a real running deployment** — site answers, health reports `ok / storage available / 0 published / 0 open runs / accepting=false`, no credentials or paths in the health body, security headers served on both the router's responses and the static site, all 10 internal links resolve, unknown path 404s, a nonexistent product is refused 422, an unsigned webhook 400, and the sandbox is not exposed. |
| **Result** | **PASS** |
| **Mutations** | M92 a test asserting nothing → caught. M93 a vacuous assertion → caught. M94 a skipped test → caught. M95 an HTTP test checking only status → caught. M96 the writability probe not writing → caught. M97 health always reports ok → caught by 2. M98 `accepting` always true → caught by 3. M99 the health response leaks the webhook secret → caught. |
| **What `/health` deliberately does not say** | No secret, no path, no identifier, no order count. It is unauthenticated, so everything it returns is public; how many orders exist is the business's information. Asserted by a test that pins the exact key set. |
| **Limitation** | The smoke test has run against a **local** deployment only. It has never run against Cloudflare, which is GATE-001 and needs an account. The suite audit checks structural soundness — assertions exist, are not vacuous, are not status-only — **not that any assertion is the right one**. A wrong assertion still passes it. |
| **Commit** | written against `099f44f` |

---

## V-2026-08-22-016 · V0 + V1 + V2 + V4 + V5 · The deployed function could not have run

| | |
| --- | --- |
| **Target** | `src/persistence/storage.ts` (new), `src/persistence/file-storage.ts` (new), `AppendLog`, all four stores, `functions/[[path]].ts` |
| **Why** | §22 required a repository-wide audit before touching anything. Tracing the deployment adapter's import graph found the highest-risk item in the repository, and it was not a future concern. |
| **Defect — shipped, and worse than previously recorded** | The Pages adapter statically imported `node:fs`, through the domain: adapter → catalogue → `AppendLog` → `node:fs`. Cloudflare Workers have neither `node:fs` nor a writable filesystem, so **the deployed function could not have served one request in any mode**, including the `closed` mode that writes nothing at all. The previous cycle recorded "the adapter has never run there" — true, but an understatement: it *could not*. |
| **Why nothing caught it** | Every unit test passed. The deployment tests passed too — they run under Node, where `node:fs` exists. The defect is not in any module's behaviour; it is in the **shape of the import graph**, which nothing looked at. |
| **Fix** | `LogStorage` names the physical operations; `FileStorage` is the only module that touches `node:fs`; `AppendLog` and everything above it now know nothing about files. The adapter reaches file storage by **dynamic** import, so it loads only on the branch that needs it. |
| **What the seam is for** | PCQ-004 asked where production state lives. That question is now answerable without touching domain code: a durable store implements four methods. The interface documents the four guarantees any implementation must meet, and states plainly that an eventually-consistent key-value store meets neither the append nor the cross-process exclusion guarantee — which is why PCQ-004 stays open rather than being quietly closed with the nearest available store. |
| **Honest refusal** | `UnavailableStorage` reads as empty (nothing recorded *is* the truth) and **throws on write**. A deployment with no durable storage refuses to record rather than accepting a write that goes nowhere — which would be an order the customer believes was placed. |
| **Observed** | 296/296 pass. The live sandbox loop re-run over real HTTP after the refactor: intent recorded, `OLB-2608-0001`, `OLB-CT-001-STN-M ×2`, 144000 JPY, **PAID**, address from the gateway. Visual and performance unchanged: LCP 32–48ms, CLS 0, 0 scripts, no undersized targets. |
| **Result** | **PASS** |
| **New permanent check** | `test/http/runtime-compat.test.ts` walks the adapter's **static** import graph and fails on any Node built-in a Workers runtime lacks. It distinguishes static from dynamic imports, because only the former load with the module. Three of its four tests exist to stop it becoming decoration: one asserts the walk actually reaches the order store, one asserts it reports a `node:fs` import that is definitely there, one pins the dynamic import it deliberately permits. |
| **Mutations** | **M88 restores the original defect** — a static `node:fs` import in the adapter → caught. M90 the interrupted fragment is not removed before the next append → caught by 2. **M89 survived**: `UnavailableStorage.append` silently returning was not caught, because nothing tested the refusal the class exists for. `test/persistence/storage.test.ts` closes it; M89′ now caught by 3. M91 memory storage allows re-entrant locking → caught. |
| **Limitation** | The adapter is now *loadable* on Workers. It has still **never been run there** — that needs credentials. And `live` mode still cannot work on Pages, because no durable store exists yet (PCQ-004); what changed is that adding one no longer means touching the domain. |
| **Commit** | written against `530b4ff` |

---

## V-2026-08-22-015 · V1 + V3 + V4 · Security headers and performance budgets

| | |
| --- | --- |
| **Target** | `SECURITY_HEADERS`, `src/site/headers.ts`, performance measurement in `scripts/visual-check.mjs` |
| **Why** | §31.27 asks whether safe, verifiable work remains inside the frozen scope before stopping. Two Completion Gate criteria stood at PARTIAL — *Security checked* and *Performance checked* — and neither was blocked by anything external. |
| **Defect found by looking** | Router responses carried **no security headers at all**. One part of that is a real leak rather than a hardening gap: **the confirmation URL carries the order's access token in its query string**, so a `Referer` sent to any other origin hands that token away. `no-referrer` is the only setting that cannot do it. |
| **Both halves, one source** | Two things answer requests for this site — the router and the static build. A header set on one and not the other is a gap that depends on which half a customer reaches. `_headers` is now generated from the same constant the router sets, so they cannot drift. |
| **Defect found in my own test** | The first header test compared the headers to themselves, which passes however they are weakened — M83 (`no-referrer` → `origin-when-cross-origin`) survived it. Rewritten to assert the properties: a referrer policy that cannot leak cross-origin, `script-src 'none'` on a site that ships no script, `frame-ancestors 'none'` on a page with a purchase form, `form-action 'self'`. |
| **Performance, measured** | LCP, CLS, transferred bytes and script count read from the browser's own observers across five routes × three widths. **LCP 32–76ms · CLS 0 · 2.0–17.8KB · 0 scripts.** Budgets are set far tighter than the public Core Web Vitals thresholds on purpose: this site ships no JavaScript, no web fonts and no images, so anything near the public threshold means something was added that should not have been. A budget set at the threshold only fails after the damage. |
| **Result** | **PASS** |
| **Mutations** | M81 headers dropped from the router → caught. M82 `_headers` matching no path → caught. **M83 referrer-policy weakened → SURVIVED**, root-caused to a tautological test, now caught. M84 CSP permits script → caught. M85 the purchase form can be framed → caught. M86 a form may post to another origin → caught. M87 payload budget exceeded (200KB of filler CSS) → caught, reported at 284KB. |
| **Limitation** | Measured on **localhost**, which removes the network: these bound what the page costs to render, not what a visitor on a slow link experiences. **INP cannot be measured without a real interaction from a real person.** No external security review and no penetration test. The CSP allows inline styles because these pages carry their own so they render even if the build never ran. |
| **Commit** | written against `efe3391` |

---

## V-2026-08-22-014 · V2 + V3 + V4 + V5 · Confirmation, sandbox, signature, deployment adapter

| | |
| --- | --- |
| **Target** | `src/checkout/intents.ts`, `src/checkout/sandbox.ts`, `src/http/environment.ts`, `functions/[[path]].ts`, the confirmation route |
| **Why** | §31.3 and §31.4: a missing gateway blocks *taking money*, not the checkout, the webhook contract, the failure handling or the confirmation. Treating a boundary as a wall left three Completion Gate items open that nothing external was actually blocking. |
| **Defect found while building** | The webhook could not know what was agreed without either re-deriving it from the catalogue (which moves — the 99,000-against-72,000 defect) or trusting the payload (which lets the message define the price). **Intents are now recorded before the customer is sent to pay**, and the payload is only ever compared against one. |
| **Duplicate encoding removed** | The signed payload carried an idempotency key the intent already held. Two copies of one fact, one of them controlled by an outsider. Removed; the key comes from the agreement. |
| **Signature verification is real** | HMAC-SHA256 over `timestamp.payload`, constant-time comparison, 300-second freshness window — the mechanism Stripe uses, via Web Crypto so the same code runs on Workers. When a human supplies the account and the secret, **what changes is the payload shape, not the security model**. |
| **Configuration** | Three valid states — closed, sandbox, live — and `validateEnvironment` refuses everything between them: a secret with no mode, a mode with no secret, a sandbox on a public origin. It throws rather than defaulting, because a default decides on its own whether a deployment can take money. |
| **Deployment** | `functions/[[path]].ts` is a thin adapter over the same `handleRequest` the local server uses — no second routing implementation, because a deployment that behaves differently from the machine it was tested on was never tested. Driven in tests exactly as Pages drives it. |
| **Observed** | 280/280 pass. **Whole loop over real HTTP in sandbox mode**: `POST /checkout` → 303 to `/sandbox/pay` → page states *"Nothing is charged here"* and 144,000 JPY → `POST` → signed webhook → verified → order `OLB-2608-0001`, `OLB-CT-001-STN-M ×2`, 144000 JPY, **PAID** → confirmation shows it. Also through the deployment adapter: closed refuses, sandbox unreachable unless enabled, live verifies signatures and still refuses to invent a checkout URL, a forged signature manufactures nothing in either mode. |
| **Result** | **PASS** for everything either side of a real payment. |
| **Mutations** | M69 signature never compared → caught. M70 replay window unbounded → caught. M72 paid amount assumed rather than checked → caught. M73 confirmation shows whatever it finds → caught. M74 sandbox enabled by any truthy value → caught. M75 mode defaults to sandbox → caught by 5. M76 a mode may run without a secret → caught by 3. M77 sandbox on a public origin → caught. M79 an agreement rewritten by re-recording → caught. M80 an order stored with no reference → caught. **M71 (constant-time comparison → `===`) is an equivalent mutant** — the difference is timing, which no functional test can observe, and it is stated rather than counted. **M78 survived and was removed rather than tested**: the empty-reference guard was unreachable, so the invariant moved to the write, where it is enforced once and is now caught by M78′. |
| **VISUAL — defect found by extending the check** | The confirmation and sandbox pages are rendered by the router, not the build, so they sat outside `visual-check.mjs`. Adding them found **every control on them under the WCAG 2.2 AA 24px target minimum** — 19px links, a 21px pay button. A page a customer reaches after paying is not a place to relax an accessibility floor. Fixed; re-measured clean at 1280/834/390. |
| **Limitation** | **No real payment has been executed and none can be.** The sandbox proves everything from signature to confirmation; it cannot prove that a real provider's payload parses. Cloudflare has never run the adapter — that needs credentials. **`live` mode cannot run on Pages as configured at all**: the logs are files and Pages Functions have no writable filesystem (PCQ-004). |
| **Commit** | written against `83c93e3` |

---

## V-2026-08-22-013 · V2 + V3 + V4 + V5 · The HTTP layer

| | |
| --- | --- |
| **Target** | `src/http/router.ts`, `scripts/serve.mjs`, price binding in `placeOrder` |
| **Why** | The previous cycle put a form on the page that posted to `/checkout`, and nothing served `/checkout`. That is a **dead-end funnel** — §22.16 names it, and I had just created one. |
| **Shape** | Fetch API `Request`/`Response`, no framework, zero dependencies. Cloudflare Pages Functions speak exactly this and Node has since 18, so one handler serves the deployed site and the local server. Two routes. |
| **Defect found before writing the layer** | A test written first: repricing the catalogue between `beginCheckout` and `completeCheckout` produced **an order recorded at 99,000 against a payment of 72,000**. `placeOrder` re-read the catalogue for the price. The agreed price now binds, and a currency change mid-checkout is refused rather than reconciled. Caught by M68. |
| **Defect found by a router test** | `beginCheckout` never validated the email. Only `placeOrder` did — which runs **after** the payment. A typo would have become a refund instead of a correction. The rule is now applied at both ends from one exported function. Caught by M67. |
| **Idempotency without JavaScript** | A hidden nonce cannot work here: the site is static, so a nonce is minted once at build time and is **the same value for every visitor** — every order would collapse into the first. The key is derived from the selection instead (product, SKU, quantity, email). The cost is stated in the source: one customer cannot place two separate orders for the same size at the same quantity. That is what the quantity field is for, and it is a smaller failure than a double charge. |
| **Trust boundary** | `WebhookVerifier` has no default implementation. Everything downstream trusts the amount, the address and the key, so an unverified payload is never processed — `UnconfiguredVerifier` returns null and the route answers 400. |
| **Observed** | 241/241 pass. **V3 over real HTTP** against a running server: `GET /` 200 · `GET /checkout` 303 home · `POST /checkout` with the repository's real (empty) catalogue → 422 *"PRD_x is not for sale"* · with a fixture product and open run → **503 "Ordering is not open yet — nothing has been charged and nothing has been recorded"** · bad email → 422 with the reason · `POST /webhooks/payment` unsigned → 400 · product page still served · **no order log written**, because nobody paid. |
| **Result** | **PASS.** The funnel is no longer a dead end. It ends, honestly, at the gateway that does not exist. |
| **Mutations** | M64 unverified webhooks processed → caught. M65 a fresh key per submission (a double-click becomes two orders) → caught. M66 a mismatched payment answered with a retryable status → caught. M67 email unvalidated before payment → caught. M68 order written at the catalogue price rather than the paid price → caught. |
| **Limitation** | **No payment has been executed and none can be.** No gateway, no verifier, no legal entity (P0-7, HG-04). The success path through the webhook is verified at V2 with real files and a test verifier; **no signature has ever been validated**, and the test verifier proves only what is downstream of verification. Deployment to Cloudflare Pages Functions is untried — the handler is shaped for it, which is not the same as having run there. |
| **Commit** | written against `a3bec15` |

---

## V-2026-08-22-012 · V1 + V2 + V3 + V4 + V5 · Checkout boundary and visual audit

| | |
| --- | --- |
| **Target** | `src/order/placement.ts`, `src/checkout/checkout.ts`, the purchase form, `scripts/visual-check.mjs` |
| **Why** | The order path had no beginning. `committedUnits` counted orders nothing could create, and the product page had no purchase action at all. |
| **Spec conflict resolved** | The directive's Completion Gate asks for `Cart integrated`; SPEC §2.3 lists a cart under 만들지 않는 것 with its reason. Recorded as **ADR-009** and resolved toward the repository: the criterion becomes *selection-to-order path integrated*. Function delivered in full; only the entity is refused. |
| **Where the order is created** | On the webhook, not the form. ADR-004's *hosted* checkout means **Stripe collects the address**, and an order requires one. Creating the order first would leave abandoned checkouts as orders in a log that `committedUnits` reads. |
| **Payment boundary** | `PaymentGateway` is an interface with one method and no SDK, no secret, no network call. `UnconfiguredGateway` **refuses in as many words** — a stub returning a plausible URL would make a broken funnel pass a funnel audit. Executing a real payment stays a Human Gate (P0-7, HG-04). |
| **Observed** | 225/225 pass. Full path on real files: selection → intent → completion → order placed, priced, snapshotted, PAID, reloaded. Redelivered payment: one order, one payment. Wrong amount: refused, nothing recorded. |
| **Result** | **PASS** for everything either side of the payment. The payment itself is **UNVERIFIED and unexecutable** by design. |
| **Mutations** | M55 placement without the lock → caught by 3. M56 duplicate submission → caught by 2. M57 order with no open run → caught by 2. M59 unpublished garment sold → **SURVIVED**, root-caused to my own fixture (no variants, so it was refused before status was checked); fixture corrected, now caught. M60 returning customer split in two → caught by 2. M61 order numbers counted rather than continued → **SURVIVED**; a gap is unreachable through the API, so the test now seeds the log directly, which is reachable — now caught. **M58 is an equivalent mutant**: copying is enforced by the record shape, not by a branch, and is stated as such rather than counted as coverage. |
| **VISUAL — two defects no unit test could see** | Both found by rendering, both on floors ADR-001 puts outside the tradeable set. **(1)** The purchase button's label was written `var(--surface-page)` — a token that does not exist in this system. An undefined `var()` is silent: it fell back to the inherited colour and rendered **#1A1A1A on #1A1A1A, a 1:1 contrast ratio**, on the one control that completes a purchase. Every test passed. A screenshot showed a black bar with no words on it. **(2)** Navigation links rendered **18px** tall and footer links **15px**, under **WCAG 2.2 SC 2.5.8 (AA) 24×24 CSS px**. These are list links, not links inside a sentence, so the inline exception does not apply. |
| **VISUAL — a third, from adversarial audit** | The header carried **two controls with the same label and the same destination** — the wordmark and the first navigation item, both "OLIBANA", both linking `/`. Invisible in the manifest, where they live in different files; obvious in a screenshot. Removed. |
| **Fixes** | Real tokens (`--content-inverse` on `--surface-inverse`, measured at **17.4:1**). Padding with compensating negative margin lifts nav to **32px** and footer to **31px** with the header's rhythm unchanged (home mobile document height moved 3409→3419px). Home dropped from the navigation manifest. |
| **What stops the recurrence** | Three checks, each mutation-verified against the defect it exists for: `findUndefinedTokens` (unit — a `var()` with nothing behind it; fallbacks are legitimate and ignored, and CSS comments are stripped so quoting the broken token in prose does not read as using it); a unit test that the purchase button's colour and background are different tokens; and **`scripts/visual-check.mjs`** (V3) which builds a fixture product and open run, serves them, and measures target size and computed button contrast at 1280/834/390. M62 (label repainted in its background) → caught, 1:1 reported. M63 (nav padding removed) → caught, 18px reported at all three widths. |
| **Responsive** | Product, shop and home at desktop 1280, tablet 834, mobile 390: no horizontal overflow, no content at opacity 0, no target under 24px, purchase button legible at every width. |
| **Limitation** | The fixture garment does not exist and nothing is published — the real build still emits no `/shop` and no product page, asserted by test. Contrast was measured on the purchase button only, not on every text pair. Screen readers, real devices and Core Web Vitals remain unverified. **No payment has ever been executed**, and none can be until a gateway exists. |
| **Commit** | written against `bfede0d` |

---

## V-2026-08-15-011 · V1 + V2 + V4 + V5 · Pre-order run

| | |
| --- | --- |
| **Target** | `src/preorder/run.ts`, `src/preorder/close.ts`, `OrderStore.committedUnits`, run-aware product page |
| **Why** | The order state machine's `PREORDER_HELD` guards read `committedQuantity` and `minimumQuantity` **from caller-supplied context**. A guard whose inputs are chosen by the party it is guarding is not a guard. This is the entity that supplies both from recorded facts. |
| **The honesty constraint** | `minimumQuantity` is the break-even quantity from a supplier quotation. **No quotation exists, so it is null, and a run with a null minimum cannot open.** No pre-order can open today, and the code says so rather than carrying a plausible placeholder. `test('THE CURRENT REPOSITORY has no open run')` asserts this against the real repository path. |
| **What is derived, not stored** | `committedUnits` is **counted from the order log**. A stored counter drifts: a cancellation that forgets to decrement leaves a run believing it can pay for fabric it cannot. Here a cancelled order simply stops being in `PREORDER_HELD` and stops counting — there is no second step to forget, verified by M45. |
| **What the caller cannot choose** | `closeRun` takes no outcome argument. Committed vs minimum decides it. A run that missed its minimum cannot be recorded as if it had reached one, and `CLOSED_UNDERSUBSCRIBED` is terminal — nothing goes into production. |
| **Rule added mid-cycle, from a surviving mutation** | M47 (close a minimum-less run as REACHED) survived because that branch is unreachable. Chasing why exposed a **real** hole next to it: nothing stopped the terms of an **open** run from being changed under the people who had already committed. Lowering `minimumQuantity` mid-run would turn an undersubscribed run into a "successful" one and put a garment into production the quotation says cannot be paid for. The commercial terms are now frozen once a run opens. |
| **Observed** | 179/179 pass. Two logs on disk, joined and reloaded: commitments counted across instances, a cancellation removing its own commitment, and a close surviving reload. |
| **Result** | **PASS** |
| **Mutations** | M41 close boundary `>=`→`>` → caught by 2. M42 open without a break-even → caught. M43 undersubscribed run may produce anyway → caught by 2. M44 unstated quantity counts as 0 → caught. M45 cancelled orders keep counting → caught. M46 two open runs per garment → caught. **M47 → SURVIVED, root cause identified as an unreachable defensive branch**; the rule it guards is verified directly against `closeOutcome`, and the reachable gap it exposed is now M48. M48 terms freeze removed → caught. M49/M50 freeze **over**-applied (to DRAFT, to `targetQuantity`) → both caught, so the rule is pinned in both directions. M51/M52/M54 page wiring → **all three initially SURVIVED**. |
| **Defect found in my own tests (VERIFICATION attribution)** | M51/M52/M54 survived because every page test called the renderer directly with a hand-built run. That is precisely the "works on mock data" failure the directive refuses to count as complete: the renderer was verified and the **wiring was not**. Two build-level tests now record a real run in a real file and read the emitted HTML; all three mutations are caught. `promisedShipBy ?? closesAt` — the fallback M52 exploited — was deleted rather than tested, by narrowing the page's input to a `PreorderWindow` that has no nulls in it. |
| **Limitation** | No order can yet be *placed* — there is no cart and no checkout, so `committedUnits` counts orders that only a test can create. The run transition table is **inferred**: SPEC Part 2.2 lists run statuses but gives no table, and what is encoded is only what the pre-order model itself requires. That inference is not spec-verified and is disclosed here rather than presented as transcription. |
| **Commit** | written against `cf66d95` |

---

## V-2026-08-15-010 · V2 + V4 + V5 · Concurrency and crash durability

| | |
| --- | --- |
| **Target** | `src/persistence/append-log.ts` (new), `src/order/store.ts`, `src/catalog/catalog.ts` |
| **Why** | Two items had been carried as UNVERIFIED since the store was written, and the catalogue added a **second writer to the same persistence pattern**. Both were tested rather than reasoned about. |
| **Method** | Real processes spawned by `scripts/append-worker.mjs`, `scripts/catalog-worker.mjs` and `scripts/lock-holder.mjs`. No simulation: the defect lives between two syscalls and cannot be reproduced inside one event loop. |
| **Defect 1 — concurrency (CONFIRMED, then fixed)** | 8 processes delivering **one idempotency key** produced **2 accepted records** (`duplicate,duplicate,duplicate,applied,duplicate,duplicate,applied,duplicate`). Each read the log, saw no duplicate, and wrote. In a payment context that is one payment recorded twice. |
| **Defect 2 — crash durability (CONFIRMED, then fixed)** | A partial final line made the **entire history unreadable**: `CorruptLogError` on every read. One interrupted write and no order could be read at all. |
| **Defect 3 — found only because the fix was tested (CONFIRMED, then fixed)** | Discarding the fragment on *read* was not enough. The fragment has no terminating newline, so the **next append welded itself to it**, producing a genuinely corrupt line in the middle of committed history — unrecoverable, and strictly worse than the defect being fixed. The first writer to take the lock now truncates back to the last complete record. |
| **Defect 4 — found in my own test (VERIFICATION attribution)** | The first concurrency test **passed against a store with no mutual exclusion at all**. It was measuring Node startup jitter: processes launched together do not arrive together, so they queued themselves. Rewritten with a wall-clock start barrier, after which the mutation was caught. A concurrency test without a barrier is not evidence. |
| **Fix** | One `AppendLog` shared by both stores. Mutual exclusion by lockfile (`openSync(..., 'wx')` — atomic, dependency-free, visible to every process on the filesystem, which is what a lock between processes must be). Read and decision and write are one critical section. Truncation offsets are measured in **bytes, not characters**, because a Japanese product name makes those differ. |
| **Observed** | 140/140 pass. Order log: 8 simultaneous same-key deliveries → 1 accepted, 1 caller told `applied`. 12 distinct keys → 12 records, no loss, no corruption. 6 simultaneous transitions of one order → 1 accepted, 5 refusals **recorded**. Catalogue: 8 processes claiming one product code → 1 claimant, 7 refused. |
| **Result** | **PASS** |
| **Mutations** | M34 lock never acquired → caught by 4. M35 fragment not removed before append → caught by 3. M36 all corruption forgiven → caught by 6. M37 offset counted in characters not bytes → caught by 1. M38 abandoned lock never reclaimed → caught by 1. M39 code-uniqueness check removed → caught by 2. **M40 uniqueness checked outside the lock** (check-then-write split, the original defect re-introduced in the catalogue) → caught by 1. Control: 0 false failures on unmodified source. |
| **Consequence for the catalogue** | Before this, `record` had no read-then-decide step, so its concurrency test could not discriminate — the lock protected nothing there. SPEC Part 2.2 calls `code` the **public identifier**, and an identifier that is not unique is not one; enforcing that under the lock is what M40 now tests. |
| **Limitation** | The lock is **filesystem-scoped**. It holds for writers sharing a filesystem; it would not hold across machines writing to different mounts of the same data. That deployment does not exist and must not be introduced without replacing the mechanism. `fsync` is not called, so a **power loss** (as opposed to a process kill) can still lose an acknowledged record in the OS page cache — untested and unclaimed. Stale-lock reclaim uses mtime age, not liveness: a writer paused longer than `STALE_LOCK_MS` could have its lock stolen. |
| **Environment** | Node v22.22.2, `--experimental-strip-types`, zero dependencies |
| **Commit** | written against `d06a7ea` |

---

## V-2026-08-15-009 · V1 + V2 + V3 + V4 · Product catalogue and product page

| | |
| --- | --- |
| **Target** | `src/catalog/catalog.ts`, `src/site/product-page.ts`, catalogue-driven routing |
| **Why** | The site rendered from hard-coded strings. The directive's completion contract requires UI → logic → data → persistence to actually connect, and explicitly refuses to count a UI that works only on mock data. |
| **Method** | V1 unit · V2 against a real filesystem catalogue · **V3 real-browser rendering of a product page built from recorded data** · V4 mutation |
| **The honesty constraint** | **No product exists.** A fixture would be a fabricated product, which every directive prohibits. So the mechanism is verified against a temporary catalogue in tests and in one browser run, while the real build emits **no `/shop` and no `/products/*`** — asserted directly by a test that reads the repository's own catalogue path. |
| **Observed** | 111/111 pass. Real build: 10 routes, no commerce pages. Fixture build: 12 routes including `/shop` and `/products/olb-ct-001`. Rendered in Chromium at 1280×1000 and 390×844 — 696 characters visible, no overflow, nothing at opacity 0, price above the natural rule, and an unmeasured size showing an em dash rather than a number. |
| **Result** | **PASS** |
| **Integrity rules enforced at write time** | A PUBLISHED product must have a priced variant — a page that asks for a purchase decision while withholding the price is not publishable. A PUBLISHED product must carry a production lead time, because ADR-003 requires the window to be disclosed before payment, so it must exist before the page does. Prices are positive integers in minor units. A measurement is never zero: an unmeasured size is omitted. SKUs must belong to their product and be unique within it. |
| **Mutations** | M27 publish without a price · M28 publish without a production window · M29 expose DRAFT publicly · M30 fill an unmeasured size with 0 · M31 drop the pre-order disclosure · M32 put the natural rule above the decision layer · M33 emit `/shop` with an empty catalogue — **all 7 caught** (M33 by 4 tests, M29 by 3). |
| **Design note** | Invalid products are refused *before* the write, unlike order rejections, which are recorded. An attempted order transition is evidence of what a system tried to do; a malformed product is a caller mistake with nothing to preserve. |
| **Limitation** | No cart, no checkout, no payment: the page states facts and cannot yet take an order. Concurrency still untested. The rendering run used a fixture; no real garment has been photographed, measured, priced, or published. |
| **Commit** | written against `0ff471e` |

---

## V-2026-08-15-008 · V1 + V2 + V4 · Order persistence

| | |
| --- | --- |
| **Target** | `src/order/store.ts` — append-only order log |
| **Why** | Persistence was the standing limitation on every commerce entry in this file. It is fully specified, depends on no pending input, and was the only thing keeping order handling at V1. |
| **Method** | V1 unit · **V2 integration against a real filesystem**, including reload through a separate store instance over the same file · V4 mutation |
| **Observed** | 87/87 pass. Create → persist → read → reload → identical state. Status is derived by replay and never stored, so no second encoding exists to drift. Earlier bytes are never rewritten. The store exposes no update, delete, remove, set, patch, truncate or clear. A full pre-order lifecycle and the undersubscribed branch both persist and replay. 50 events, 50 distinct well-formed ids. A corrupt line throws rather than being skipped. |
| **Result** | **PASS** |
| **Mutations** | M21 mutable status field stored beside the log · M22 rejected events dropped · M23 rejected events allowed to advance state · M24 corrupt line silently skipped · M25 ADR-008 fix reverted · M26 append replaced with truncating write — **all 6 caught** (M26 by 9 tests, M25 by 4). |
| **Defect found on first run** | Two tests failed. Transcribing the spec's idempotency key literally — `(order_id, from_status, to_status, idempotency_key)` — does not work in a store, because the store derives `from` from its own log. Once the first delivery is applied the current `from` has moved, so the recomputed key can never match the stored record, and **a redelivered webhook is processed a second time**. The four-tuple is correct for the pure function, where `from` is an input, and vacuous for the store. Redelivery identity is now `(orderId, idempotencyKey)`; a key reused for a different destination is rejected and recorded rather than honoured. Recorded as ADR-008 rather than resolved silently. |
| **Limitation closed** | Idempotency was previously proven only against an in-memory key set, which cannot survive a process restart. It is now proven against the store's own history, and a test asserts a fresh instance still detects the redelivery. |
| **Limitation remaining** | **Single writer only, and unverified.** `appendFileSync` will not corrupt a line, but two processes can both pass the idempotency check before either writes. No concurrency test exists. Before a second writer exists this needs a lock or a store with a real unique constraint. Also unverified: crash-during-write durability, and behaviour when the disk is full. |
| **Commit** | written against `3d9ac19` |

---

## V-2026-08-15-007 · V1 + V3 + V4 · Website

| | |
| --- | --- |
| **Target** | `src/site/*` — static site builder and the 10 routes it emits |
| **Method** | V1 unit (67 assertions) · **V3 real-browser rendering** (Chromium via playwright-core, run deliberately, not part of `npm test`) · V4 mutation |
| **Observed** | Build emits 13 files / 10 routes / 44 KB. Served over HTTP: every route 200, unknown paths serve the 404 document. Rendered in Chromium at 1280×900 and 390×844: all pages show visible content (1,400–3,400 characters), 0 children at opacity 0, no horizontal overflow, no console errors, first Tab lands on the skip link. First view 14 KB total, 0 bytes of JavaScript. |
| **Result** | **PASS** |
| **Mutations** | M15 script tag shipped · M16 skip link removed · M17 empty `/journal` route built · M18 empty measurements table rendered · M19 reduced-motion block dropped · M20 production palette guard disabled — **all 6 caught.** |
| **Defect the unit tests could NOT catch** | The page rendered near-blank. `.enter > *` used `animation-fill-mode: both`, which holds each element at its FROM state — opacity 0 — through its stagger delay. The unit test asserted that `both` was present and reasoned that the final state was therefore the resting state. That reasoning was wrong, and the test shared it. **Only the browser screenshot exposed it.** This is the third occasion on which verification shared the implementation's failure mode; unlike the previous two, no amount of reading the code would have shown it. Content entry animation is now removed entirely — it gated comprehension, which ADR-001's C1 resolution forbids — and the test was replaced with the property that matters: no rule starts content at opacity 0. |
| **Other defects found and fixed** | 404 page declared a canonical URL to a path that is not a route, contradicting its own `noindex` (found by an internal-link check). Every page triggered a `/favicon.ico` 404; suppressed with an empty data URI rather than by inventing a brand mark that has not been decided. Home page stated the same sentence twice — a hand-written statement duplicating the opening line of the philosophy text below it; replaced with Brand Bible language and a repeated-sentence test added. |
| **Regression introduced and repaired mid-cycle** | An edit removing the entry animation also deleted the `prefers-reduced-motion` block. Caught by the suite, restored. |
| **Production build** | **Refuses, exit 1**, listing all six construction palette tokens. This is the intended state: the brand palette is deferred pending field measurement, and the guard prevents an unfinished palette shipping by accident. |
| **Limitation** | No screen-reader testing. No automated contrast validation — and the palette under test is the construction palette, not the brand palette, so contrast figures would be meaningless. Rendering verified in Chromium only. No Core Web Vitals measured against a real network. |
| **Commit** | written against `a3e405a` |

---

## V-2026-08-15-006 · V1 + V4 · Independent spec conformance

| | |
| --- | --- |
| **Target** | `src/order/state-machine.ts` vs `docs/business/02_FIRST_GARMENT_EXECUTION.md` §3.2/§3.3, and ADR-007 |
| **Why** | SSOT v2.0 §7 requires the verifier to be independent of the executor; §43-2 prohibits an agent verifying its own output. Measured gap: 3 of 3 test files shared a commit with their implementation. |
| **Method** | A verifier that parses the specification markdown mechanically and diffs the extracted edge set against the implementation. Independence comes from deriving expectations from the authoritative document rather than from a second reading by the same process — not from adding agents (§43-18). |
| **Expected** | Spec edge set ≡ implementation edge set; spec-forbidden transitions rejected; ADR-007 terminal list honoured |
| **Observed** | 47/47 pass. Edge sets identical (20 edges). 4 mechanically checkable forbidden rules all rejected. |
| **Result** | **PASS** |
| **Defects found in the verifier itself** | 2, on first run. (a) Row classifier demoted a checkable rule because its *rationale* cell mentioned a state. (b) An ADR regex assumed the wrong bold span. Attribution: `VERIFICATION` (§25) — not SPEC, not CODE. Both fixed; the two substantive checks passed from the start. |
| **Defect found in the implementation** | 1, by mutation M14. `TERMINAL_STATUSES` (a literal set) and the emptiness of `ALLOWED_TRANSITIONS` were **two independent encodings of the same fact**. Mutating one left the other and the conformance file unaware. Fixed by *deriving* terminality from the edge map, which removes the failure class rather than testing for it. |
| **Mutation results** | M11 undeclared edge added → caught. M12 declared edge removed → caught. M13 forbidden transition permitted → caught. M14 parallel terminal list mutated → **SURVIVED** → root cause fixed → M14′ (remove CANCELLED's edge, now the only route to the same defect) → caught by 5 tests including the independent one. Control: 0 false failures on unmodified source. |
| **Limitation** | Verifies **transcription fidelity**, not specification correctness. Cannot tell whether the spec itself is right, whether the guards encode the intended business rule, or whether any of it survives persistence, concurrency, or real I/O. 4 prose-quantified forbidden rules remain outside machine verification and are disclosed as such by an assertion, not silently assumed covered. |
| **Environment** | Node v22.22.2, `--experimental-strip-types`, zero dependencies |
| **Commit** | written against `8f540e1` |

---

## V-2026-08-15-005 · V1 + V4 · Identity and economics

| | |
| --- | --- |
| **Target** | `src/identity/ids.ts`, `src/economics/break-even.ts` |
| **Observed** | 39/39 pass. Mutations M5–M10 all caught: unknown cost coerced to 0; fixed-cost amortisation removed; largest instead of smallest profitable tier; MOQ ignored above break-even; customer id made sequential; ULID timestamp removed. |
| **Result** | **PASS** |
| **Defect found** | 2 test failures on first run. Attribution: `VERIFICATION` — the expected break-even was asserted at 30 without being computed; tier 20 clears at +6,778. Corrected, and the assertion strengthened from a magic number to a boundary property. |
| **Limitation** | Break-even verified against synthetic tiers only. **No real supplier quotation exists, so no actual `minimumQuantity` has been computed and none is claimed.** |

---

## V-2026-08-15-004 · V1 + V4 · Order state machine

| | |
| --- | --- |
| **Target** | `src/order/state-machine.ts` — first executable verification in the project's history |
| **Observed** | 15/15 pass. Mutations M1–M4 all caught: cancellation after fabric is cut; CANCELLED made terminal; undersubscription boundary off by one; idempotency check disabled. |
| **Result** | **PASS** |
| **Finding** | Spec conflict discovered during transcription — §3.1 diagram marks CANCELLED terminal, §3.2 table gives it an outgoing edge. Resolved under P-01 and recorded as ADR-007. |
| **Limitation** | Idempotency verified against an in-memory key set, **not** a database unique constraint. That remains unverified. |

---

## V-2026-08-15-003 · V0 · Outerwear spec pack
13 measurement points × 3 sizes, 13 construction sections, 8-item dispatch checklist, 0 absolute figures asserted. **PASS.** Verifies structural completeness for dispatch; does not verify that a factory will accept it (that is V6, reachable only by sending).

## V-2026-08-15-002 · V0 · Category decision pack
4/4 categories across rule-execution, measurements, sketch checklists; 0 absolute currency figures; explicit no-recommendation. **PASS.** Narrows the decision; does not resolve it.

## V-2026-08-15-001 · V0 · Resume contract
9/9 resume questions, 18/18 persistence fields, 20/20 invariants, 20/20 governance rules, 10/10 Build Gate criteria evaluated. **PASS.** Verifies the resume contract is structurally satisfiable; verifies no system behaviour.

---

## Standing limitations across all entries

```
Never exercised:  payment · production boundary · power-loss durability (fsync)
Never verified:   that the specification is correct
                  that a factory accepts the spec pack
                  that a real payment succeeds
                  that state survives a process restart
                  screen-reader behaviour · colour contrast · Core Web Vitals
```

Any claim beyond these bounds is unsupported by anything recorded here.
