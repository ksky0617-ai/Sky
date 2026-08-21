# VERIFICATION LOG

**Required by:** SSOT v2.0 §20 (`LAST_VERIFICATION`), §28 (verification evidence)
**Scope:** every verification run whose result was used to justify a state claim.

Tiers: `V0` static · `V1` unit · `V2` integration · `V3` end-to-end · `V4` adversarial/mutation · `V5` regression · `V6` production-boundary.

> **V3 reached for the website only** (real browser, real HTTP). Persistence, payment, and the production boundary remain unexercised; every commerce claim stays at V1 or below.

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
Never exercised:  persistence · concurrency · payment · production boundary
Never verified:   that the specification is correct
                  that a factory accepts the spec pack
                  that a real payment succeeds
                  that state survives a process restart
                  screen-reader behaviour · colour contrast · Core Web Vitals
```

Any claim beyond these bounds is unsupported by anything recorded here.
