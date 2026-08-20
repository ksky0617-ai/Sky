# STATE — Olibana Resume Entrypoint

**Updated:** 2026-08-15 · **Commit at write time:** `8f540e1` · **Branch:** `claude/olibana-project-spec-76ivk7`
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
| `CURRENT_STATE` / `CURRENT_PHASE` | **Implementation, 3 pure modules.** Verification is now independent of implementation for the order state machine (SSOT v2.0 §7). |
| `CURRENT_CYCLE` | Cycle 6 — first under SSOT v2.0 |
| `CURRENT_CRITICAL_PATH` | ~~품목 결정~~ ✅ → **실측·사양 기입 → 견적 발송** → 원가 → 가격 → minimum_quantity → pre-order |
| `LAST_VERIFIED_STATE` | **V1 unit + V4 mutation, 2026-08-15.** `npm test` → **47/47 pass**. **14 mutations run across 3 modules; 13 caught, 1 survived and exposed a real defect** (duplicate terminality encoding) which was fixed at the root rather than tested around; sources restored byte-identical. Verified: order transitions (20 edges, 3 terminal, guards, idempotency) — **additionally checked against the spec document mechanically**; identifiers (ULID sortability, UUIDv4 non-enumerability, round-trips); break-even (UNKNOWN never zero, amortisation, MOQ binding). |
| `OPEN_BLOCKERS` | **6 × P0** (P0-1 closed by ADR-005), 7 × P1 — see [`RISK_REGISTER.md`](./RISK_REGISTER.md) and §4 below |
| `CURRENT_BLOCKER` | **P0-2** — supplier quotation. Not a decision: awaits the user filling `05_OUTERWEAR_SPEC_PACK.md`. No autonomous action can advance it. |
| `LAST_FAILED_STATE` | None outstanding. Cycle 6 had 2 verifier defects and 1 implementation defect (M14, duplicate terminality encoding) — all diagnosed, fixed, re-verified. See `VERIFICATION_LOG.md`. |
| `ACTIVE_DECISIONS` | ADR-001…007, index at `docs/adr/README.md`. **Open:** ADR-006 (brand direction, non-blocking). |
| `DEFERRED_ITEMS` | Persistence layer · payment integration · website · Pinterest · analytics · AI/learning loop. All deferred behind P0-2, none started. |
| `LAST_VERIFICATION` | V-2026-08-15-006 — see `VERIFICATION_LOG.md` |
| `RECOVERY_INSTRUCTIONS` | `npm test` must show 47/47. If it does not, the last verified state does not hold: read `VERIFICATION_LOG.md`, re-run, and treat any prior VERIFIED claim as invalidated until re-established. No database, no external service, and no secret is required to reach a working state — `git clone` plus Node ≥22.6 is sufficient. |
| `RECENT_CHANGE` | **Cycle 6:** independent spec-conformance verifier; terminality derived rather than duplicated; `VERIFICATION_LOG.md`. **Cycle 5:** `src/identity/ids.ts`, `src/economics/break-even.ts` + tests. Cycle 4: first code — order state machine, ADR-007. Cycle 3: ADR-005/006, `05_OUTERWEAR_SPEC_PACK.md`, HG-R1. Cycle 2: `04_…`. Cycle 1: `PROTOCOL_LOCK.md`, `STATE.md`. Zero runtime dependencies throughout. |
| `RECENT_VERIFICATION` | V-2026-08-15-006 (V1+V4, independent) — 47/47 pass; 4 mutations run, 1 survived and exposed a real defect, fixed, re-verified. Full history: `VERIFICATION_LOG.md`. |
| `CURRENT_RISKS` | 16 recorded, 0 resolved. Dominant: no supplier (R-01), unit economics unknown (R-03), fabricated-claim risk (R-08) |
| `PENDING_HUMAN_DECISIONS` | HG-2026-001 **RESOLVED** (ADR-005). Open: **ADR-006 brand-direction conflict** (non-blocking, required before design spec); **P0-7 legal entity** (HG-04, required before payment). |
| `NEXT_ACTION_1` | **User (parallel, unblocked):** fill `05_OUTERWEAR_SPEC_PACK.md` A–D → dispatch per §E |
| `NEXT_ACTION_2` (`NEXT_ACTIONS`) | **Autonomous:** order aggregate binding transitions to identifiers + append-only transition log (pure, no persistence) |
| `NEXT_ACTION_3` | **Blocked on quotation:** populate real `PriceTier` data → compute actual `minimumQuantity`. Module is ready and waiting for inputs. |
| `RELEVANT_FILES` | §7 below |
| `RESUME_ENTRYPOINT` | This file |

## 2. Auto-Resume Contract (§35) — the nine questions

| Question | Answer |
|---|---|
| **What is complete?** | The specification corpus: brand doctrine, four Atlases (method only), website design system, business loop audit, risk register, ADR-001…007, first-garment execution pack, category decision pack, outerwear spec pack, supplier sourcing, unit-economics calculator. |
| **What is verified?** | **Three pure modules at V1 + V4, with the order state machine additionally verified independently of its implementation (spec-derived conformance):** order transitions (20 edges, 3 terminal, guards, idempotency), identifiers (ULID time-sortable, customer UUIDv4 non-enumerable, SKU/order-number round-trip), break-even (UNKNOWN never zero, amortisation, MOQ binding). 47/47 pass; 14 mutations run, 13 caught, 1 survivor root-caused and eliminated. Everything else remains V0 or unverified. |
| **What is not verified?** | Product, variant, pre-order run, payment, shipment, website — all `SPEC_ONLY`. **No persistence, no I/O, no integration, no concurrency verified.** Idempotency is proven against an in-memory key set, not a database constraint. Conformance verifies transcription fidelity, **not that the specification is itself correct**; 4 prose-quantified forbidden rules remain outside machine verification and are disclosed as such. |
| **What is blocked?** | Nothing autonomous. The commerce path awaits the user's spec fill → quotation; implementation continues in parallel on pure, spec-determined modules. |
| **Why is it blocked?** | Category resolved (ADR-005: Outerwear). The build now waits on cost and price, which wait on a quotation, which waits on the spec pack being filled. No decision is outstanding on this path. |
| **What is the current critical path?** | ~~품목~~ ✅ → **실측·사양 기입 → 견적 발송** → 원가 → 가격 → `PreorderRun.minimum_quantity` → pre-order open |
| **What is the next action?** | Fill `docs/business/05_OUTERWEAR_SPEC_PACK.md` A–D, then dispatch per §E. |
| **What files matter?** | §7. |
| **What human decision is pending?** | None on the critical path. Two off-path: ADR-006 (before design spec), P0-7 (before payment). See §6. |

## 3. Gate Evaluation — evidence for each FALSE

### BUILD_GATE = **FALSE**

| | Criterion | Value | Evidence |
|---|---|:---:|---|
| BG-01 | Contract Integrity | TRUE | Spec conflict found during implementation and recorded as ADR-007 rather than silently resolved |
| BG-02 | Executability | **TRUE** | `package.json`; `npm test` runs on Node 22 via `--experimental-strip-types`, 0 deps |
| BG-03 | Testability | **TRUE** | `node:test`, 47 assertions; order state machine additionally checked against the spec document mechanically |
| BG-04 | Critical Path Coverage | **FALSE** | Order transitions + identity + economics primitives exist. No product, product page, payment, persistence, shipment, or analytics. |
| BG-05 | Invariant Protection | **PARTIAL** | Mutation-verified: order transitions, SKU/identifier integrity, UNKNOWN-never-zero. Terminality now has a single encoding (duplicate removed in cycle 6). Not protected: availability integrity, price/order consistency across persistence. |
| BG-06 | Reproducibility | **TRUE** | `npm test` re-runs deterministically; no network, no clock dependency in assertions |
| BG-07 | Persistence | **TRUE** | This file + `PROTOCOL_LOCK.md` |
| BG-08 | Failure Handling | **PARTIAL** | Order rejection paths implemented, recorded, and tested. Payment, production, and shipping recovery unimplemented. |
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

## 5. This Cycle's Verification (§28)

```
VERIFICATION ID:  V-2026-08-15-005
TARGET:           src/identity/ids.ts, src/economics/break-even.ts
TEST METHOD:      V1 unit (node:test) + V4 adversarial mutation
OBSERVED:         39/39 tests pass (15 order + 12 identity + 12 economics)
                  Mutations injected, all caught:
                    M5  unknown cost coerced to 0            -> 3 failures
                    M6  fixed-cost amortisation removed      -> 2 failures
                    M7  largest instead of smallest tier     -> 2 failures
                    M8  MOQ ignored when above break-even    -> 1 failure
                    M9  customer id made sequential          -> 1 failure
                    M10 ULID timestamp removed               -> 2 failures
                  Sources restored byte-identical; 39/39 re-pass
RESULT:           PASS
TEST DEFECT FOUND: The first run failed 2 of 39. Cause was a TEST bug, not an
                  implementation bug (SPEC §78 classification): the expected
                  break-even was asserted at 30 without computing it, while tier
                  20 clears at +6,778. Expectation corrected and the test
                  strengthened to assert the break-even is a boundary — every
                  tier below unprofitable, every tier at or above profitable —
                  rather than a single magic number.
LIMITATION:       Pure logic only. No persistence, no I/O, no concurrency.
                  Break-even is verified against synthetic tiers; no real
                  supplier quotation exists, so no actual minimumQuantity is
                  computed and none is asserted.
CONCLUSION:       BG-05 coverage widened. BUILD_GATE still FALSE (BG-04, BG-10).

--- prior ---
V-004 order state machine (V1+V4) — PASS, 4/4 mutations caught
V-003 outerwear spec pack (V0) — PASS
V-002 category decision pack (V0) — PASS
V-001 resume contract (V0) — PASS
```

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
| Decisions | `docs/adr/ADR-001 … ADR-007` |
| Critical-path execution pack | `docs/business/02_FIRST_GARMENT_EXECUTION.md` |
| Category decision pack | `docs/business/04_GARMENT_CATEGORY_DECISION_PACK.md` |
| **Active work item (user)** | `docs/business/05_OUTERWEAR_SPEC_PACK.md` |
| **Source** | `src/order/state-machine.ts`, `src/identity/ids.ts`, `src/economics/break-even.ts` |
| **Tests** | `test/order/`, `test/identity/`, `test/economics/`, **`test/conformance/`** — 47 assertions |
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
