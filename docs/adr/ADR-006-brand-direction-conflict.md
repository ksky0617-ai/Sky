# ADR-006 — Brand Direction Conflict: "Vintage × Luxury × Y2K"

**Status:** `OPEN — CONFLICT REPORTED` · **Date:** 2026-08-15
**Raised under:** §31 SPEC CHANGE CONTROL, §70 NO SILENT CONTRACT CHANGE, G-02
**Blocking:** **No.** Current critical-path work proceeds unaffected — see §6.

## 1. Conflict Detected

The instruction resolving HG-2026-001 stated the brand direction as **"Vintage × Luxury × Y2K 융합"**. This phrase appears in no repository document. Checked: all 28 tracked files, all commits.

It conflicts with LOCKED specifications on three points.

## 2. Authoritative Sources

| Source | Status | Text |
| --- | --- | --- |
| `README.md` §Design Principles 3 | LOCKED | *"**Timelessness:** Avoid fleeting trends or fads. A design should feel fresh independent of era… A great design doesn't chase trends."* |
| `README.md` §Design Principles 6 | LOCKED | *"**Originality:** Never copy existing luxury brand clichés or pastiche…"* |
| `README.md` §Core Philosophy | LOCKED | *"Every visual element must be traceable to measurable structures found in nature."* |
| `Brand_Bible.md` §Core Values | LOCKED | *"**Timeless Quality:** Designs that gain depth over time, not date."* |
| Directive 1 §74 | Governing | Prohibits *"excessive black/gold luxury aesthetic"* and copied luxury-house design |

## 3. Classification

**Type:** Brand Logic conflict — not an implementation defect.

| Element | Conflict |
| --- | --- |
| **Y2K** | Era-specific trend aesthetic. Directly opposes the Timelessness principle, which requires a design to *"feel fresh independent of era"* and not chase trends. |
| **Vintage** | Era-referential sourcing. The LOCKED philosophy derives form from *measured natural structure*, not from period reference. |
| **Luxury** | Compatible in positioning (`Brand_Bible.md` already says *"Tokyo-based luxury design atelier"*), but **not** as a visual vocabulary — Principle 6 and §74 both prohibit luxury-brand clichés. |

So the conflict is not uniform: *Luxury* is largely compatible as market position; *Vintage* and *Y2K* conflict with two LOCKED principles at their core.

## 4. Why This Is Not Resolved Here

Per precedence, **P2 (explicit current user instruction) outranks P4 (repository specifications)** — the brand owner may redirect the brand. But:

- G-02 forbids unapproved Brand Logic change, and G-04 forbids unapproved Design System change.
- §70 forbids silently changing a contract.
- The instruction stated this as *rationale for a category choice*, not as an instruction to rewrite `Brand_Bible.md` or `README.md`. Treating a rationale as a spec rewrite would be an assumption (P7, lowest precedence).

Resolving it silently in either direction would violate the protocol. So it is recorded, not decided.

## 5. Options When It Is Resolved

| | Option | Consequence |
| --- | --- | --- |
| **A** | Direction stands as-is; LOCKED principles unchanged | Contradiction persists. Every design decision has two conflicting authorities. **Not viable.** |
| **B** | Amend LOCKED principles to admit era-referential design | `README.md` Principles 3 and 6, `Brand_Bible.md` Core Values, and `Design_System.md` evaluation criteria all require revision. The four Atlases lose their status as the sole design source. This is a brand rebuild, not an adjustment. |
| **C** | Treat the phrase as market positioning, not visual vocabulary | Compatible. Olibana can occupy a luxury market position and take *structural* cues that read as considered rather than trend-driven, while form still derives from measured nature. Requires no LOCKED change. |
| **D** | Narrow the phrase to specific silhouette references for this garment only | Scoped exception recorded as an ADR; LOCKED principles preserved for the system. |

## 6. Impact on Current Work — None

The active work item is the outerwear measurement sheet, specification form, and quotation dispatch pack.

**None of these depend on aesthetic direction.** A back length, a shoulder width, and a pocket count are the same measurements whichever direction is chosen; a factory quotes on construction complexity, not on styling references.

This conflict becomes load-bearing at the **design stage** — after quotations return, when silhouette, seam placement, and detailing are actually determined. It must be resolved before then.

## 7. Required Resolution Point

```
BEFORE:  design specification (silhouette, seam placement, detailing)
AFTER:   quotation received
STATUS:  recorded, not escalated — the brand owner has been informed and
         the work continues; no answer is requested at this time
```
