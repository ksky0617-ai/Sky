# STATE — Olibana Resume Entrypoint

**Updated:** 2026-08-22 · **Commit at write time:** `a3bec15` · **Branch:** `claude/olibana-project-spec-76ivk7`
**Governance:** [`PROTOCOL_LOCK.md`](./PROTOCOL_LOCK.md) (LOCKED)

> Read this file first. Then verify every claim below against actual repository state — **repository state outranks this file** (I-18). This file is a pointer, not an authority.

---

## 1. Persistence Contract (§36)

| Field | Value |
|---|---|
| `CURRENT_LAYER` | **L1 — System Development** |
| `BUILD_GATE` | **FALSE** |
| `COMPLETION_GATE` | **FALSE** |
| `REFINEMENT_MODE` | FALSE (requires COMPLETION_GATE=TRUE + human approval) |
| `CURRENT_STATE` / `CURRENT_PHASE` | **Website, order persistence, product catalogue and pre-order runs — all data-driven, all multi-process safe.** Product pages render from recorded data and state a run's real dates when one is open. The real catalogue is empty and no run is open, so no shop, product page or window is published — verified against the repository's own paths, not assumed. Not connected: cart, checkout, payment, shipping. |
| `CURRENT_CYCLE` | Cycle 14 |
| `CURRENT_CRITICAL_PATH` | ~~품목 결정~~ ✅ → **실측·사양 기입 → 견적 발송** → 원가 → 가격 → minimum_quantity → pre-order |
| `LAST_VERIFIED_STATE` | Green on `npm run verify`. **Figures are not restated here** — they went stale in three consecutive cycles because they were copied into prose. `VERIFICATION_LOG.md` is the single source; run the command for the current count. Highest tier reached: **V3** (website, real browser) and **V2** (persistence across spawned processes, real filesystem). |
| `OPEN_BLOCKERS` | **6 × P0** (P0-1 closed by ADR-005), 8 × P1 — see [`RISK_REGISTER.md`](./RISK_REGISTER.md) and §4 below |
| `CURRENT_BLOCKER` | **P0-2** — supplier quotation. Not a decision: awaits the user filling `05_OUTERWEAR_SPEC_PACK.md`. No autonomous action can advance it. |
| `LAST_FAILED_STATE` | None outstanding. **Cycle 10 confirmed two real defects by measurement** — concurrent writers producing two records for one idempotency key, and a crash mid-write making the whole log unreadable — plus a third found only by testing the fix, and a fourth in the test itself (a concurrency test that passed against a store with no locking at all). All fixed and re-verified. **Cycle 11** found three mutations surviving because the page tests exercised the renderer and not the wiring; two build-level tests closed that. Cycle 9 had no implementation failure. Cycle 8: redelivered webhooks were processed twice because the spec's four-part idempotency key cannot match once the order has advanced — diagnosed, corrected, recorded as ADR-008, re-verified. Cycle 7's five defects are in `VERIFICATION_LOG.md`. |
| `ACTIVE_DECISIONS` | ADR-001…009, index at `docs/adr/README.md`. **Open:** ADR-006 (brand direction, non-blocking). |
| `DEFERRED_ITEMS` | HTTP layer · payment gateway · shipping · Pinterest · media cluster · dropshipping · analytics · AI/learning loop — none started. **Cart is not deferred; it is refused (ADR-009).** No longer deferred: website (7), order persistence (8), product catalogue (9), multi-process durability (10), pre-order run (11), order placement (12), checkout boundary (13). |
| `LAST_VERIFICATION` | V-2026-08-22-013 — see `VERIFICATION_LOG.md` |
| `RECOVERY_INSTRUCTIONS` | `npm run verify` must pass (builds the site, then runs the suite). If it does not, the last verified state does not hold: read `VERIFICATION_LOG.md`, re-run, and treat any prior VERIFIED claim as invalidated until re-established. No database, no external service, and no secret is required to reach a working state — `git clone` plus Node ≥22.6 is sufficient. |
| `RECENT_CHANGE` | **Cycle 14: the HTTP layer.** `src/http/router.ts` (Fetch API, no framework), `scripts/serve.mjs` now mounts it, so the funnel is runnable rather than only unit-tested. **Cycle 13: checkout boundary and visual audit.** `src/checkout/checkout.ts` (payment boundary as an interface; the unconfigured gateway refuses rather than pretending), the purchase form on the product page, `scripts/visual-check.mjs`, ADR-009. **Cycle 12: order placement.** `src/order/placement.ts`; orders, customers, price and SKU snapshots. **Cycle 11: pre-order run.** `src/preorder/run.ts` (append-only; a run cannot open without a break-even quantity, and its terms freeze once it does), `src/preorder/close.ts` (the close outcome is derived from counted commitments, never chosen), `OrderStore.committedUnits`, run-aware product page. **Cycle 10: multi-process durability.** `src/persistence/append-log.ts` — lockfile mutual exclusion and crash-tolerant reads, shared by the order log and the catalogue. **Cycle 9: product catalogue.** `src/catalog/catalog.ts` (append-only, integrity enforced at write), `src/site/product-page.ts`, catalogue-driven routing. **Cycle 8: order persistence.** `src/order/store.ts` — append-only log, state derived by replay, store-enforced idempotency; ADR-008. **Cycle 7: the website.** `src/site/*` (markdown renderer, design tokens, route manifest, layout, builder), 10 routes, `scripts/render-check.mjs`. **Cycle 6:** independent spec-conformance verifier; terminality derived rather than duplicated; `VERIFICATION_LOG.md`. **Cycle 5:** `src/identity/ids.ts`, `src/economics/break-even.ts` + tests. Cycle 4: first code — order state machine, ADR-007. Cycle 3: ADR-005/006, `05_OUTERWEAR_SPEC_PACK.md`, HG-R1. Cycle 2: `04_…`. Cycle 1: `PROTOCOL_LOCK.md`, `STATE.md`. Zero runtime dependencies throughout. |
| `RECENT_VERIFICATION` | V-2026-08-15-011 (V1+V2+V4+V5) — pre-order run; two logs joined on a real filesystem; mutations pinned in **both** directions, so the terms-freeze rule cannot be over-applied either. A test asserts the **real** repository has no open run, alongside the existing one asserting it publishes no product. Full history: `VERIFICATION_LOG.md`. |
| `CURRENT_RISKS` | 17 recorded, 0 resolved. New: R-17 (an acknowledged order lost to power failure — no `fsync`; must close before the first real payment). Dominant: no supplier (R-01), unit economics unknown (R-03), fabricated-claim risk (R-08) |
| `PENDING_HUMAN_DECISIONS` | HG-2026-001 **RESOLVED** (ADR-005). Open: **ADR-006 brand-direction conflict** (non-blocking, required before design spec); **P0-7 legal entity** (HG-04, required before payment). |
| `NEXT_ACTION_1` | **User (parallel, unblocked):** fill `05_OUTERWEAR_SPEC_PACK.md` A–D → dispatch per §E |
| `NEXT_ACTION_2` (`NEXT_ACTIONS`) | **Autonomous:** deployment — a Cloudflare Pages Function that calls `handleRequest`, and the order-confirmation page. The handler is shaped for that runtime but has never run there. |
| `NEXT_ACTION_3` | **Autonomous:** deploy the site to Cloudflare Pages — the only obstacle is the palette guard, which is intended and clears when measurement happens |
| `NEXT_ACTION_4` | **Blocked on quotation:** populate real `PriceTier` data → compute actual `minimumQuantity`. Module is ready and waiting for inputs. |
| `RELEVANT_FILES` | §7 below |
| `RESUME_ENTRYPOINT` | This file |

## 2. Auto-Resume Contract (§35) — the nine questions

| Question | Answer |
|---|---|
| **What is complete?** | The specification corpus: brand doctrine, four Atlases (method only), website design system, business loop audit, risk register, ADR-001…008, first-garment execution pack, category decision pack, outerwear spec pack, supplier sourcing, unit-economics calculator. |
| **What is verified?** | **Website at V3** — renders in a real browser, serves over real HTTP. **Persistence at V2** — append-only logs on a real filesystem, state derived by replay, redelivery safe across restart, and safe against **concurrent processes and a crash mid-write**, both measured with spawned processes rather than reasoned about. **Pre-order runs at V2** — production is decided by commitments counted from the order log, and the run's terms freeze the moment it opens. **Pure modules at V1+V4** — order transitions (also checked mechanically against the spec document), identifiers, break-even. Counts and mutation results: `VERIFICATION_LOG.md`. Everything else remains V0 or unverified. |
| **What is not verified?** | Payment execution and shipment. **No payment has ever been executed and none can be**: there is no gateway and no signature verifier, and configuring them needs a legal entity (P0-7, HG-04). The webhook's success path is verified with real files and a test verifier, which proves what is downstream of verification and nothing about any signature. Deployment to Cloudflare Pages Functions is untried. Concurrency and crash-during-write **are now tested with spawned processes** (V-2026-08-15-010): both were confirmed as real defects and fixed. Still unverified: **power-loss durability** — nothing calls `fsync`, so an acknowledged record can sit in the OS page cache when the machine loses power. The write lock is filesystem-scoped and would not hold across machines. For the website: screen readers, colour contrast (the palette under test is the construction palette), browsers other than Chromium, Core Web Vitals on a real network. Conformance verifies transcription fidelity, **not that the specification is itself correct**; 4 prose-quantified forbidden rules sit outside machine verification and are disclosed as such. |
| **What is blocked?** | Nothing autonomous. The commerce path awaits the user's spec fill → quotation; implementation continues in parallel on pure, spec-determined modules. |
| **Why is it blocked?** | Category resolved (ADR-005: Outerwear). The build now waits on cost and price, which wait on a quotation, which waits on the spec pack being filled. No decision is outstanding on this path. |
| **What is the current critical path?** | ~~품목~~ ✅ → **실측·사양 기입 → 견적 발송** → 원가 → 가격 → `PreorderRun.minimum_quantity` → pre-order open |
| **What is the next action?** | User: fill `docs/business/05_OUTERWEAR_SPEC_PACK.md` A–D, then dispatch per §E. Autonomous: cart and checkout, so that an order can be placed at all. |
| **What files matter?** | §7. |
| **What human decision is pending?** | None on the critical path. Two off-path: ADR-006 (before design spec), P0-7 (before payment). See §6. |

## 3. Gate Evaluation — evidence for each FALSE

### BUILD_GATE = **FALSE**

| | Criterion | Value | Evidence |
|---|---|:---:|---|
| BG-01 | Contract Integrity | TRUE | Spec conflict found during implementation and recorded as ADR-007 rather than silently resolved |
| BG-02 | Executability | **TRUE** | `package.json`; `npm test` runs on Node 22 via `--experimental-strip-types`, 0 deps |
| BG-03 | Testability | **TRUE** | `node:test` suite plus a real-browser render check and a real-filesystem persistence check; the order state machine is additionally checked against the spec document mechanically |
| BG-04 | Critical Path Coverage | **FALSE** | The selection-to-order path is connected end to end and reachable over real HTTP: page → form → `POST /checkout` → gateway boundary → webhook → placed, priced, snapshotted, paid, persisted. It ends at a **gateway that does not exist**, which is a Human Gate (P0-7, HG-04), not an unfinished piece. Still absent: a configured gateway, the deployed runtime, shipment, analytics. Cart is refused by ADR-009, not missing. |
| BG-05 | Invariant Protection | **PARTIAL** | Mutation-verified: order transitions, SKU/identifier integrity, UNKNOWN-never-zero, append-only history, redelivery safety across restart, **mutual exclusion between processes**, **product-code uniqueness under contention**. Not protected: availability integrity, power-loss durability. |
| BG-06 | Reproducibility | **TRUE** | `npm test` re-runs deterministically; the site build is byte-identical across runs (asserted) |
| BG-07 | Persistence | **TRUE** | This file + `PROTOCOL_LOCK.md` |
| BG-08 | Failure Handling | **PARTIAL** | Order rejection paths implemented, persisted and tested; a corrupt log fails loudly rather than losing history; **a crash mid-write is survived — the fragment is discarded on read and removed before the next append, and the log keeps accepting writes**. Payment, production and shipping recovery unimplemented. |
| BG-09 | Security Boundary | UNVERIFIED | No system exists; attack surface is 0 but untested |
| BG-10 | No Critical Blocker | **FALSE** | 6 open P0 (P0-1 closed) |

### COMPLETION_GATE = **FALSE**
CG-02, CG-03, CG-05, CG-06, CG-09, CG-10, CG-11 all FALSE. CG-08 now TRUE. Not re-evaluated further while BUILD_GATE is FALSE.

## 4. Open Blockers

| ID | Blocker | Class | Human Gate |
|---|---|---|:---:|
| ~~P0-1~~ | ~~Garment category undefined~~ — **CLOSED** by ADR-005 (Outerwear) | resolved | — |
| **P0-2** | No supplier, no quotation — **now the live critical-path node** | unblocked, awaiting spec fill | no |
| P0-3 | Unit economics unknown (11 of 13 lines) | Downstream of P0-2 | no |
| P0-4 | No payment integration | Downstream of P0-3 | no |
| P0-5 | No order persistence | Downstream of P0-4 | no |
| P0-6 | No website | Downstream of product definition | no |
| P0-7 | No legal entity or policies | HG-04 legal | **YES** |

**No open P0 on the critical path requires a human decision.** P0-2 is live and needs the spec pack filled, not a decision. P0-3/4/5/6 are mechanically downstream. P0-7 (legal) is a Human Gate but sits off the current path until payment activation.

## 5. Verification

**Full history: [`VERIFICATION_LOG.md`](./VERIFICATION_LOG.md)** — that file is the single source of truth for verification evidence. It is not duplicated here; a second copy would drift, which is the defect this cycle removed from the code.

**Current headline:**

```
LATEST:      V-2026-08-22-013 (V2 + V3 + V4 + V5, the HTTP layer)
COMMAND:     npm run verify   (build + suite; counts deliberately not restated here)
MUTATIONS:   68 run to date · 66 caught · 2 standing survivors, both root-caused and disclosed
             (M47 unreachable defensive branch · M58 equivalent mutant)
HIGHEST TIER: V3 website and product page (real browser) · V2 multi-process persistence · V4 throughout
NEVER EXERCISED: payment execution · production boundary · power-loss durability (no fsync)
```

**Standing caveat.** Conformance verifies that the implementation matches the specification document. It does not verify that the specification is correct, and 4 prose-quantified forbidden rules sit outside machine verification — disclosed by an assertion in `test/conformance/`, not assumed covered.

## 6. Pending Human Decisions

**HG-2026-001 — RESOLVED 2026-08-15.** Category = **Outerwear** ([ADR-005](./docs/adr/ADR-005-garment-category.md)).

Two items remain open. **Neither blocks the current critical path.**

```
ADR-006 — Brand direction conflict          STATUS: OPEN, non-blocking
  "Vintage x Luxury x Y2K" conflicts with LOCKED Timelessness and
  Originality principles. Recorded, not decided (G-02, §70).
  REQUIRED BY: design specification stage — after quotes, before silhouette.
  NOT REQUIRED: for measurements, construction spec, or quotation.

P0-7 — Legal entity and policies            STATUS: OPEN (HG-04)
  REQUIRED BY: payment activation.
  NOT REQUIRED: for quotation or costing.
```

## 7. Relevant Files

| Purpose | File |
|---|---|
| Governance (LOCKED) | `PROTOCOL_LOCK.md` |
| Resume entrypoint | `STATE.md` |
| Risk register | `RISK_REGISTER.md` |
| Decisions | `docs/adr/ADR-001 … ADR-009` |
| Critical-path execution pack | `docs/business/02_FIRST_GARMENT_EXECUTION.md` |
| Category decision pack | `docs/business/04_GARMENT_CATEGORY_DECISION_PACK.md` |
| **Active work item (user)** | `docs/business/05_OUTERWEAR_SPEC_PACK.md` |
| **Source** | `src/order/`, `src/catalog/`, `src/preorder/`, `src/checkout/`, `src/http/`, `src/persistence/`, `src/identity/`, `src/economics/`, `src/site/` |
| **Tests** | `test/order/`, `test/catalog/`, `test/preorder/`, `test/checkout/`, `test/http/`, `test/persistence/`, `test/identity/`, `test/economics/`, `test/conformance/`, `test/site/` — run `npm test` for the count |
| **Render check** | `scripts/render-check.mjs` and **`scripts/visual-check.mjs`** (target size, button contrast, three breakpoints) — both need a browser; run deliberately, not in `npm test` |
| **Durability workers** | `scripts/append-worker.mjs`, `scripts/catalog-worker.mjs`, `scripts/lock-holder.mjs` — spawned by the concurrency tests; not entry points |
| **Verification history** | `VERIFICATION_LOG.md` |
| Supplier routes | `docs/business/03_SUPPLIER_SOURCING.md` |
| Unit economics | `docs/business/UNIT_ECONOMICS.md`, `docs/business/tools/UNIT_ECONOMICS_CALCULATOR.xlsx` |
| Business loop audit | `docs/business/01_BUSINESS_SYSTEM_LOOP_AUDIT.md` |
| Brand doctrine (LOCKED) | `Brand_Bible.md`, `Character_Bible.md`, `Design_System.md`, `README.md`, four Atlases |
| Website design system | `docs/website/01 … 05`, `21` |

## 8. Verification Result — V-2026-08-15-001

```
EXPECTED:   9/9 resume questions · 18/18 persistence fields · governance operative
            sections present · 0 LOCKED artifacts modified
OBSERVED:   9/9 resume questions resolvable
            18/18 persistence fields present
            14/14 governance sections present
            20/20 invariants I-01…I-20 present
            20/20 governance rules G-01…G-20 present
            10/10 BUILD GATE criteria evaluated with evidence
            12/12 COMPLETION GATE criteria listed
            8/8 Human Gate categories present
            0 LOCKED artifacts modified
            change scope: 2 files added, 0 modified
PASS/FAIL:  PASS
INVARIANT:  LOCKED artifacts unmodified — held
VIOLATION:  none
LIMITATION: V0 static inspection only. This verifies that the resume contract is
            *structurally* satisfiable from the repository. It does not verify any
            system behaviour, because no system exists.
CONCLUSION: BG-07 Persistence → TRUE. CG-08 Persistence → TRUE.
            BUILD_GATE remains FALSE (BG-02/03/04/05/06/08/10 still FALSE).
```

---

**Update rule:** rewrite this file at the end of any cycle that changes gate state, blockers, critical path, or pending decisions. Do not let it drift from repository reality — a stale `STATE.md` is worse than none, because it will be trusted.
