# ADR-007 — Spec Conflict: is CANCELLED terminal?

**Status:** Accepted · **Date:** 2026-08-15
**Raised under:** §31 SPEC CHANGE CONTROL · **Resolved:** autonomously under P-01

## Context

Implementing the order state machine required transcribing `docs/business/02_FIRST_GARMENT_EXECUTION.md` Part 3. Two parts of that section disagree.

## Problem

| Location | Says |
| --- | --- |
| §3.1 state diagram | `CANCELLED ●` — and `● = terminal (더 이상 전이 없음)` |
| §3.2 transition table | `` | `CANCELLED` | `REFUNDED` | 환불 실행 | `` |

The diagram marks CANCELLED terminal. The table gives it an outgoing edge. Both are in the same document.

## Why this is not "UNDEFINED"

P-01 states that a matter logically determined by existing contracts is not implementer discretion. Three facts determine it:

1. **The table is the normative enumeration**; the diagram is a rendering of it. Where a picture and a list disagree, the list is the specification.
2. **CANCELLED is only reachable from `PAID`, `PREORDER_HELD`, and `PRODUCTION_PENDING`** — every one of them post-payment. There is no path from `CREATED` to `CANCELLED`. Therefore **a cancelled order always holds customer money.**
3. ADR-003 commits to *"cancellation terms published and honoured without argument."* A terminal CANCELLED would strand customer funds with no state to move to, contradicting that commitment.

So the answer is uniquely determined. No Human Gate.

## Decision

**CANCELLED is not terminal.** It has exactly one outgoing transition: `CANCELLED → REFUNDED`.

Terminal states are **`DELIVERED`, `REFUNDED`, `PAYMENT_FAILED`** — three, not four.

## Trade-offs

- **Accepted:** the state diagram in `02_FIRST_GARMENT_EXECUTION.md` §3.1 now carries a known error. It is not edited here — that document records a superseded rendering, and this ADR is the authority. A reader following the diagram alone would be wrong on one marker.
- **Gained:** refund obligation is structurally guaranteed. A cancelled order cannot come to rest holding money.

## Consequences

- `src/order/state-machine.ts` encodes `TERMINAL_STATUSES` as three states, with the reasoning in a comment referencing this ADR.
- Two tests protect it: *"CANCELLED is not terminal"* and *"terminal states have no outgoing edges."*
- Mutation-verified: marking CANCELLED terminal fails 2 of 15 tests.
- When `02_FIRST_GARMENT_EXECUTION.md` is next revised, §3.1's `●` on CANCELLED should be removed. Not done now — editing a spec to match an implementation mid-cycle is the drift §31 exists to prevent.
