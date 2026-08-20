# ADR-005 — First Garment Category: Outerwear

**Status:** Accepted · **Date:** 2026-08-15 · **Authority:** Brand owner (explicit instruction)
**Resolves:** HG-2026-001

## Context

`STATE.md` recorded HG-2026-001 as the single live node on the critical path. No quotation could be requested, and therefore no cost, price, or pre-order minimum could be established, until a garment category was named. `docs/business/04_GARMENT_CATEGORY_DECISION_PACK.md` narrowed the decision to one word across four options.

## Problem

Which garment category is Olibana's first product?

## Options

Per `04_GARMENT_CATEGORY_DECISION_PACK.md`, scored on Atlas rule-execution capacity against construction complexity:

| | Rules executable (of 10) | Relative cost / lead time |
| --- | :---: | --- |
| **(a) Outerwear** | **9–10** | highest |
| (b) Knitwear | 5–6 | moderate |
| (c) Shirt / cut-and-sew | 6–7 | low |
| (d) Accessory | 4–5 | lowest |

## Decision

**Outerwear.**

## Reason

Stated by the brand owner. Outerwear is also the only category in which the documented Atlas rules are near-fully executable — panel seams can carry Stone Atlas fracture angles, hemlines can carry River Atlas meander curvature, proportion can carry Forest Atlas branching ratios, and drape behaviour is present. The two axes in the decision pack run in opposite directions, and this decision weights rule-carrying capacity over capital risk.

## Trade-offs

- **Accepted:** highest unit cost, longest lead time, and the largest capital exposure at the pre-order minimum of the four options.
- **Accepted:** highest sample-iteration count, so the path to an approved sample is the longest.
- **Gained:** the first product can express nearly the whole documented design system rather than a fragment of it.
- **Risk carried forward:** R-10 (pre-order lead time causing cancellations) is at its most acute in this category. Mitigation is disclosure before payment, per ADR-003.

## Consequences

- `docs/business/05_OUTERWEAR_SPEC_PACK.md` becomes the active work item — measurement sheet, specification form, dispatch checklist.
- Quotation requests use the outerwear measurement set from `04_…` §3(a).
- Fabric MOQ is expected to be the binding constraint rather than sewing MOQ, given outerwear fabric consumption per unit.
- P0-1 closes. P0-2 (supplier/quotation) becomes the live critical-path node.
- The aesthetic direction accompanying this instruction raises a separate, non-blocking conflict — see [ADR-006](./ADR-006-brand-direction-conflict.md).
