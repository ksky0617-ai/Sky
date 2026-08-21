# VERIFICATION LOG

**Required by:** SSOT v2.0 §20 (`LAST_VERIFICATION`), §28 (verification evidence)
**Scope:** every verification run whose result was used to justify a state claim.

Tiers: `V0` static · `V1` unit · `V2` integration · `V3` end-to-end · `V4` adversarial/mutation · `V5` regression · `V6` production-boundary.

> **V3 reached for the website** (real browser, real HTTP). **V2 reached for order persistence** (real filesystem, reload across instances). Payment and the production boundary remain unexercised, and no concurrency has ever been tested.

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
Never exercised:  concurrency · payment · production boundary · crash durability
Never verified:   that the specification is correct
                  that a factory accepts the spec pack
                  that a real payment succeeds
                  that state survives a process restart
                  screen-reader behaviour · colour contrast · Core Web Vitals
```

Any claim beyond these bounds is unsupported by anything recorded here.
