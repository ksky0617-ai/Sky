# VERIFICATION LOG

**Required by:** SSOT v2.0 §20 (`LAST_VERIFICATION`), §28 (verification evidence)
**Scope:** every verification run whose result was used to justify a state claim.

Tiers: `V0` static · `V1` unit · `V2` integration · `V3` end-to-end · `V4` adversarial/mutation · `V5` regression · `V6` production-boundary.

> **V3 reached for the website** (real browser, real HTTP). **V2 reached for order persistence** (real filesystem, reload across instances). **Concurrency and crash durability are now exercised** with spawned processes (V-2026-08-15-010). Payment and the production boundary remain unexercised.

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
