# STATE — Olibana Resume Entrypoint

**Updated:** 2026-08-15 · **Commit at write time:** `1c17dce` · **Branch:** `claude/olibana-project-spec-76ivk7`
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
| `CURRENT_PHASE` | Pre-implementation. Specification complete, zero code. |
| `CURRENT_CYCLE` | Cycle 2 under governance vNext |
| `CURRENT_CRITICAL_PATH` | 품목 결정 → Fashion Spec → 견적 → 원가 → 가격 → minimum_quantity → pre-order |
| `LAST_VERIFIED_STATE` | Repository forensic audit, 2026-08-15. 26 tracked files (25 `.md` + 1 `.xlsx`), **0 source files, 0 tests, 0 manifests, 0 assets**. Verified by direct `find`/`git ls-files` scan. |
| `OPEN_BLOCKERS` | 7 × P0, 7 × P1 — see [`RISK_REGISTER.md`](./RISK_REGISTER.md) and §4 below |
| `RECENT_CHANGE` | Cycle 2: created `docs/business/04_GARMENT_CATEGORY_DECISION_PACK.md`. Cycle 1: created `PROTOCOL_LOCK.md`, `STATE.md`. No code change in either. |
| `RECENT_VERIFICATION` | V-2026-08-15-002 (V0) — decision-pack completeness. V-2026-08-15-001 (V0) — resume contract. |
| `CURRENT_RISKS` | 16 recorded, 0 resolved. Dominant: no supplier (R-01), unit economics unknown (R-03), fabricated-claim risk (R-08) |
| `PENDING_HUMAN_DECISIONS` | **HG-2026-001 — garment category selection** (see §6) |
| `NEXT_ACTION_1` | Resolve HG-2026-001 (human) |
| `NEXT_ACTION_2` | On resolution: user records measurements + flat sketch per `04_GARMENT_CATEGORY_DECISION_PACK.md` §3/§4 (checklists already prepared) |
| `NEXT_ACTION_3` | Assemble dispatch pack and send to 3–5 candidates (`02_…` §1.2/§1.3 + `03_SUPPLIER_SOURCING.md`). No further user decision needed past this point until quotes return. |
| `RELEVANT_FILES` | §7 below |
| `RESUME_ENTRYPOINT` | This file |

## 2. Auto-Resume Contract (§35) — the nine questions

| Question | Answer |
|---|---|
| **What is complete?** | The specification corpus: brand doctrine, four Atlases (method only), website design system, business loop audit, risk register, ADR-001…004, first-garment execution pack, supplier sourcing, unit-economics calculator. |
| **What is verified?** | Only repository facts, at tier V0 (static inspection): file inventory, git history, absence of code. **No functional behaviour has ever been verified — there is no code to verify.** |
| **What is not verified?** | Everything functional. Every entity, state machine, identifier scheme, and price is `SPEC_ONLY`. |
| **What is blocked?** | The entire build. See §4. |
| **Why is it blocked?** | Root cause is a single unresolved value judgment: **which garment Olibana sells first.** Supplier quotation, cost, price, and pre-order minimum are all downstream of it. |
| **What is the current critical path?** | 품목 → 도식화·치수 → 견적 → 원가 → 가격 → `PreorderRun.minimum_quantity` → pre-order open |
| **What is the next action?** | Resolve HG-2026-001. |
| **What files matter?** | §7. |
| **What human decision is pending?** | HG-2026-001 (§6). |

## 3. Gate Evaluation — evidence for each FALSE

### BUILD_GATE = **FALSE**

| | Criterion | Value | Evidence |
|---|---|:---:|---|
| BG-01 | Contract Integrity | TRUE | ADR supersessions marked in place; no unresolved spec conflict |
| BG-02 | Executability | **FALSE** | 0 manifests, 0 source files, no runtime |
| BG-03 | Testability | **FALSE** | 0 test files |
| BG-04 | Critical Path Coverage | **FALSE** | 0 of 13 MVP nodes implemented |
| BG-05 | Invariant Protection | **FALSE** | No test or guard mechanism exists |
| BG-06 | Reproducibility | **FALSE** | Nothing to re-run |
| BG-07 | Persistence | **TRUE** (this cycle) | This file + `PROTOCOL_LOCK.md` |
| BG-08 | Failure Handling | **FALSE** | Specified only (`02_FIRST_GARMENT_EXECUTION.md` Part 3) |
| BG-09 | Security Boundary | UNVERIFIED | No system exists; attack surface is 0 but untested |
| BG-10 | No Critical Blocker | **FALSE** | 7 open P0 |

### COMPLETION_GATE = **FALSE**
CG-02, CG-03, CG-05, CG-06, CG-09, CG-10, CG-11 all FALSE. CG-08 now TRUE. Not re-evaluated further while BUILD_GATE is FALSE.

## 4. Open Blockers

| ID | Blocker | Class | Human Gate |
|---|---|---|:---:|
| **P0-1** | Garment/Fashion Specification undefined | HG-02 value judgment | **YES** |
| P0-2 | No supplier, no quotation | Downstream of P0-1 | no |
| P0-3 | Unit economics unknown (11 of 13 lines) | Downstream of P0-2 | no |
| P0-4 | No payment integration | Downstream of P0-3 | no |
| P0-5 | No order persistence | Downstream of P0-4 | no |
| P0-6 | No website | Downstream of P0-1 | no |
| P0-7 | No legal entity or policies | HG-04 legal | **YES** |

**Only P0-1 and P0-7 require human decision. The remaining five are mechanically downstream** — they unblock automatically as their dependencies resolve. This is why the critical path has exactly one live node.

## 5. This Cycle's Verification (§28)

```
VERIFICATION ID:  V-2026-08-15-002
TARGET:           Garment category decision pack — decision-scope minimisation (§23)
PRECONDITION:     HG-2026-001 open; post-decision work undefined
EXPECTED:         4/4 categories covered for rule-execution, measurements, sketch
                  checklist; zero fabricated absolute figures; no recommendation (G-05)
TEST METHOD:      V0 static inspection
OBSERVED:         4/4 categories in rule-execution matrix
                  4/4 measurement blocks · 4/4 sketch checklist blocks
                  0 absolute currency figures asserted · 7 UNKNOWN markers
                  explicit no-recommendation present · 0 advocacy lines
                  0 LOCKED artifacts modified
RESULT:           PASS
LIMITATION:       V0 only. Narrows the decision; does not resolve it.
                  Relative complexity ordering is derived from construction
                  (pattern pieces, operations) — absolute values remain UNKNOWN
                  and are obtainable only by quotation.
CONCLUSION:       Decision scope reduced. BUILD_GATE unchanged (FALSE).
                  No critical-path blocker removed.

--- prior ---
VERIFICATION ID:  V-2026-08-15-001
TARGET:           Persistence & auto-resume artifacts (BG-07, CG-08)
RESULT:           PASS — 9/9 resume questions, 18/18 fields, 20/20 invariants,
                  20/20 governance rules, 10/10 BG criteria evaluated
VERSION:          written against 8b37d2e
```

## 6. Pending Human Decision

```
DECISION ID:            HG-2026-001
DECISION REQUIRED:      Which garment category is Olibana's first product?
CATEGORY:               HG-02 — Value Judgment
WHY LOAD-BEARING:       Every downstream node depends on it. A quotation cannot be
                        requested without an item; cost, price, and the pre-order
                        minimum all derive from that quotation.
CURRENT FACTS:          No Fashion Specification exists (repository-wide search).
                        No supplier contacted. Quote calculator input columns empty.
LOCKED CONSTRAINTS:     Brand_Bible.md, Character_Bible.md v1.1, Design_System.md,
                        four Atlases. Print-on-demand disqualified (ADR-003).
                        Pre-order is the launch model (ADR-003).
UNKNOWN:                Production cost, MOQ, lead time, fabric availability —
                        all resolve only after the item is chosen.
OPTIONS:                (a) Outerwear — coat or jacket
                        (b) Knitwear
                        (c) Shirt / cut-and-sew
                        (d) Accessory or object
CONSEQUENCES:           (a) strongest expression of structural design rules
                            (panel seams from fracture angles, hem from meander
                            curvature); highest unit cost and longest lead time
                        (b) texture-led; branching ratios express well in knit
                            structure; moderate cost
                        (c) lowest cost and shortest lead time; weakest carrier
                            of the brand's construction logic
                        (d) typically lowest MOQ — materially relevant given
                            trade minimums cluster at 50–100 units
RISKS:                  (a) high MOQ capital exposure at pre-order minimum
                        (d) may under-express the brand on first impression
REVERSIBILITY:          High before a quotation is requested. Low afterwards —
                        pattern and sample costs are sunk.
RECOMMENDED OPTION:     No recommendation. This is a brand value judgment and
                        G-05 forbids an unapproved aesthetic determination.
MINIMUM DECISION:       One word — the category. Nothing else is required now.
DECISION SCOPE:         Narrowed in Cycle 2. Rule-execution capacity per category,
                        relative cost/lead ordering, per-category measurement lists
                        and flat-sketch checklists are all now fixed in
                        docs/business/04_GARMENT_CATEGORY_DECISION_PACK.md.
                        The remaining decision is the single trade-off: the category
                        that carries the most brand rules also carries the most
                        capital risk and the longest lead time.
DEFAULT PATH IF APPROVED: User records measurements + flat sketch from the prepared
                        checklist; dispatch pack assembles automatically thereafter.
```

`P0-7` (legal entity, HG-04) is a second pending gate but is not on the critical path until payment is enabled.

## 7. Relevant Files

| Purpose | File |
|---|---|
| Governance (LOCKED) | `PROTOCOL_LOCK.md` |
| Resume entrypoint | `STATE.md` |
| Risk register | `RISK_REGISTER.md` |
| Decisions | `docs/adr/ADR-001 … ADR-004` |
| Critical-path execution pack | `docs/business/02_FIRST_GARMENT_EXECUTION.md` |
| Category decision pack | `docs/business/04_GARMENT_CATEGORY_DECISION_PACK.md` |
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
