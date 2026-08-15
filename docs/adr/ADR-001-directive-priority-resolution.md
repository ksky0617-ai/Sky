# ADR-001 — Directive Priority Resolution

**Status:** Accepted · **Date:** 2026-08-15

## Context

Three master directives govern this project, issued in sequence:

| | Directive | Length |
| --- | --- | --- |
| **D1** | Immersive Animated Commerce Website | — |
| **D2** | Zero-Cost / Cognitive-UX / Performance / Design-System Optimization | 50 pp. |
| **D3** | Business / System / Autonomous Loop Failure Elimination | 45 pp. |

Each is internally coherent. Together they give conflicting instructions.

## Problem

The three documents state incompatible priority orders:

```
D1 §7    Brand Integrity > Visual Experience > Usability > Commerce > Performance
D2 §97   Remove > Simplify > Clarify > Optimize > Enhance > Decorate
D2 §75   Correctness > Reliability > Performance > Accessibility > Maintainability > Cost > DX > Novelty
D3 §62   Failure always outranks feature
```

D1 ranks performance last. D2 ranks decoration last. D3 ranks *everything* below a working business. Applied literally to the same screen, they produce opposite outcomes. Six concrete collisions were identified (`docs/website/21_UX_PERFORMANCE_COST_AUDIT.md` §0, `docs/business/01_BUSINESS_SYSTEM_LOOP_AUDIT.md` §25).

## Options

1. **Latest directive wins outright.** Simple, but discards D1's brand doctrine, which is the reason the project exists.
2. **Earliest wins — brand doctrine is foundational.** Preserves identity but reproduces the failure D3 §58 names: a beautiful site with no business.
3. **Separate the questions the directives conflate.** Assign each directive the domain it actually governs.

## Decision

**Option 3.** The three directives govern different questions and are ordered accordingly:

```
D3 decides WHETHER to build at all      — is there a business behind this?
D1 decides WHAT exists                  — does this belong in Olibana?
D2 decides WHAT FORM it takes           — remove, simplify, clarify, optimize, then enhance
```

And three floors are not tradeable by any directive, because all three state them independently:

```
1. Accessibility        D1 §42 · D2 §22
2. Core Web Vitals      D1 §41 · D2 §34
3. Comprehension        D1 §76 · D2 §81
```

**Operative rule: no experience work proceeds while a P0 business failure is open** (D3 §62).

## Reason

The conflicts are not genuine contradictions once the domains are separated. D1 is a brand document and is authoritative on identity. D2 is an engineering and cognition document and is authoritative on implementation. D3 is a business document and is authoritative on whether the thing being built can operate at all.

Ranking performance last (D1 §7) is defensible as a statement about *brand decisions* and indefensible as a statement about *engineering practice*. The separation lets each directive be right about its own subject.

## Trade-offs

- **Lost:** the ability to cite a single ordering for every decision. Reviewers must identify which question they are answering.
- **Lost:** some of D1's most cinematic ambitions, wherever they collide with comprehension or performance floors.
- **Gained:** each directive is honoured where it has authority instead of being partially overridden everywhere.
- **Risk:** boundary disputes — "is this a brand question or a form question?" Resolved by ADR when it recurs.

## Consequences

- The Home opening sequence may not gate comprehension. Brand name, statement, and navigation paint immediately; light-emergence layers over an already-readable page, is skippable, does not replay for returning visitors, and is absent under reduced motion.
- Motion work is deprioritised below open P0 business failures.
- Performance budgets become CI gates rather than aspirations.
- `docs/website/02_BRAND_EXPERIENCE_SYSTEM.md` and `04_MOTION_LANGUAGE.md` remain valid as specifications; their *scheduling* moves behind business viability.
