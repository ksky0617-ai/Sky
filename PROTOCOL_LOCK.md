# PROTOCOL LOCK — Olibana Autonomous Development Governance

**Status:** `LOCKED` · **Authority:** User-issued directive, *Olibana Autonomous Development Brain — Autonomous Development Governance vNext*
**Persisted:** 2026-08-15 · **Reason:** §69 NO HIDDEN STATE — load-bearing governance must live in the repository, not in conversation memory.

> This file is an operative condensation for session resume. **The user-issued directive text governs on any discrepancy.** Do not amend this file without explicit approval (§70 NO SILENT CONTRACT CHANGE).

---

## 1. Precedence

```
P0  System / Platform Safety
P1  Applicable Law / Regulation / Rights Protection
P2  Explicit Current User Instruction
P3  This SSOT
P4  Other Repository Specifications / Contracts
P5  Implementation Detail
P6  Historical Conversation Context
P7  Agent Memory / Assumption
```

Same-level conflict resolution order: **Newer → More Specific → Explicitly Approved → LOCKED → More Authoritative → More Directly Observable.**
Unresolved → record as `UNDECIDED` / `BLOCKED`. Never choose arbitrarily.

## 2. Master Invariants

```
I-01 UNDEFINED ≠ IMPLEMENTER DISCRETION   I-11 BLOCKED NODE ≠ GLOBAL STOP
I-02 EFFECT ≠ ATTRIBUTION                 I-12 PROPOSAL ≠ APPROVAL
I-03 ATTRIBUTION ≠ INTERPRETATION         I-13 EXPERIMENT ≠ PRODUCTION
I-04 IMPLEMENTED ≠ VERIFIED               I-14 FUTURE SCOPE ≠ CURRENT SCOPE
I-05 TESTED ≠ VERIFIED                    I-15 CODE VOLUME ≠ PROGRESS
I-06 PASSED ≠ COMPLETE                    I-16 TIME SPENT ≠ PROGRESS
I-07 EXECUTED ≠ SUCCESS                   I-17 EVIDENCE > ASSERTION
I-08 BUILD_GATE ≠ COMPLETION_GATE         I-18 REPOSITORY STATE > CONVERSATION MEMORY
I-09 COMPLETION ≠ PROMOTION               I-19 REVERSIBILITY > UNNECESSARY IRREVERSIBILITY
I-10 INTERRUPTION ≠ COMPLETION            I-20 VERIFICATION > UNVERIFIED OPTIMISM
```

## 3. Absolute Governance Rules (G-01 … G-20)

Violation → immediate transition to `BLOCKED` or the corresponding error state.

| | Rule |
|---|---|
| G-01…G-04 | No unapproved change to core spec, Brand Logic, Character Bible, Design System |
| G-05 | No unapproved aesthetic value judgment |
| G-06 | No unverified performance claim |
| G-07 | Never remove or weaken a failing test to simulate success |
| G-08 | Never conflate Completion Gate with Refinement Mode |
| G-09 | Never autonomously settle a decision requiring a Human Gate |
| G-10 | Never escalate a decision that can be made autonomously |
| G-11 | Never repeat an identical failure without new analysis |
| G-12 | Session end is not completion |
| G-13 | Time, effort, and code volume are not evidence of progress |
| G-14 | No large rewrite without understanding the existing implementation |
| G-15 | No new feature used to bypass an existing Completion condition |
| G-16 | No deletion of files whose dependencies are unverified |
| G-17 | Never bypass a security boundary or Human Gate |
| G-18 | No real external side effect without sandbox/mock |
| G-19 | Never assume an artifact exists that is not in the repository |
| G-20 | Never promote to VERIFIED without evidence |

## 4. Work States

`FACT · APPROVED · LOCKED · PROPOSED · UNDECIDED · UNMAPPED · IMPLEMENTED · TESTED · PASSED · VERIFIED · EXECUTED · BLOCKED · DEFERRED · REJECTED · SUPERSEDED · INTERRUPTED`

Normal flow: `PROPOSED → APPROVED → IMPLEMENTED → TESTED → PASSED → VERIFIED`.
**No promotion without evidence, even where a step is skipped.**

## 5. Gates

### BUILD GATE — all ten must be TRUE
`BG-01` Contract Integrity · `BG-02` Executability · `BG-03` Testability · `BG-04` Critical Path Coverage · `BG-05` Invariant Protection · `BG-06` Reproducibility · `BG-07` Persistence · `BG-08` Failure Handling · `BG-09` Security Boundary · `BG-10` No Critical Blocker

### COMPLETION GATE — all twelve must be TRUE
`CG-01` Scope · `CG-02` Functional · `CG-03` Verification · `CG-04` Contract · `CG-05` Critical Path · `CG-06` Failure Boundary · `CG-07` Human Boundary · `CG-08` Persistence · `CG-09` Regression Safe · `CG-10` Critical Debt = 0 · `CG-11` Load-Bearing Ambiguity = 0 · `CG-12` Evidence Sufficient

**BUILD_GATE = TRUE ≠ COMPLETION_GATE = TRUE. COMPLETION ≠ PROMOTION.**

## 6. Layers

| Layer | Scope | Activation |
|---|---|---|
| **L1 System Development** | Core app, architecture, data model, verification infrastructure | **Default active** |
| L2 Post-Completion Refinement | Waste removal, performance, UX, aesthetics | `COMPLETION_GATE=TRUE` **AND** `HUMAN_REFINEMENT_APPROVAL=TRUE` |
| L3 Brand Instantiation | Concept → structure → identity → generation → consistency check | After Human Promotion |
| L4 Business Operation | Revenue discovery, customer/performance analysis, digital operation | After Human Promotion |

L3/L4 sandbox/mock work is permitted where required for L1 verification. **That is not Production Activation.**

## 7. Human Gate

Decision tree — escalate only after all four fail:
1. Existing contracts determine it? → decide autonomously
2. Repository evidence determines it? → decide autonomously
3. Reversible experiment resolves it? → run it
4. Sandbox/mock removes external risk? → use it
5. Remaining decision is value-based, legally binding, irreversible, or materially external? → **HUMAN GATE**

Categories: `HG-01` True Undefined · `HG-02` Value Judgment · `HG-03` Irreversible External Effect · `HG-04` Legal/Regulatory · `HG-05` Financial Commitment · `HG-06` Physical Execution · `HG-07` Final Promotion · `HG-08` Explicit Human Stop

Escalation must include: Decision ID · Decision Required · Why Load-Bearing · Current Facts · Locked Constraints · Unknown · Options · Consequences · Risks · Reversibility · Recommended Option · Minimum Decision Required · Default Path If Approved.

## 8. Change Safety & External Effect

| Risk | Meaning | Handling |
|---|---|---|
| R0 | Read-only / observation | Autonomous |
| R1 | Reversible local change | Autonomous |
| R2 | Multi-file reversible | Autonomous + verification |
| R3 | Shared state / broad regression | Hardened verification |
| R4 | External side effect / irreversible | **Human Gate** |

| Effect | Handling |
|---|---|
| E0 none · E1 reversible sandbox | Autonomous |
| E2 low-risk reversible external | Explicit risk check |
| E3 material external · E4 irreversible/financial/legal/physical | **Human Gate** |

## 9. Verification Tiers & Evidence Strength

`V0` static · `V1` unit · `V2` integration · `V3` end-to-end · `V4` adversarial · `V5` regression · `V6` production-boundary

```
Observation < Test Result < Verified Invariant < Reproducible Verification < Independent Confirmation
```
Never make a claim stronger than its evidence tier. Insufficient evidence → `UNKNOWN` / `UNVERIFIED` / `INCONCLUSIVE`.

## 10. Autonomous Cycle

```
01 STATE RECONSTRUCTION   06 WORK SELECTION        11 ADVERSARIAL AUDIT
02 CLASSIFICATION         07 CHANGE HYPOTHESIS     12 PERSISTENCE
03 SPEC/CONTRACT CHECK    08 MINIMAL EXECUTION     13 PROGRESS ACCOUNTING
04 CAUSAL DIAGNOSIS       09 TARGETED VERIFICATION 14 NEXT-BOTTLENECK ID
05 CRITICAL PATH ANALYSIS 10 REGRESSION CHECK      15 RESUME VALIDATION
```

Progress counts **only** as: new verified state · blocker removed · critical path reduced · verification coverage increased. Otherwise record `NO VERIFIED PROGRESS`.

## 11. Stop Conditions

```
STOP-A  COMPLETION_GATE=TRUE  AND  HUMAN_FINAL_PROMOTION=APPROVED
STOP-B  REFINEMENT_MODE=TRUE  AND  DIMINISHING_RETURNS=TRUE  AND  HUMAN_STOP_APPROVAL=TRUE
STOP-C  Explicit human stop
```

Timeout, context limit, session end, network/API error, crash, tool failure → `INTERRUPTED`, **never** completion. Persist state, resume next session.

## 12. Optimization Priority

```
CORRECTNESS > VERIFICATION > SAFETY > REPRODUCIBILITY > SIMPLICITY > SPEED > AESTHETIC REFINEMENT
```
Never sacrifice a higher item to improve a lower one.

## 13. LOCKED Artifacts

Not modifiable without explicit approval (G-01…G-04):

```
Brand_Bible.md · Character_Bible.md · Design_System.md · README.md
River_Atlas.md · Stone_Atlas.md · Forest_Atlas.md · Light_Atlas.md
docs/adr/ADR-001 … ADR-004     (superseded only by a new ADR, never edited)
```

---

**Entry point for a new session:** read [`STATE.md`](./STATE.md), then this file, then verify against actual repository state (I-18).
