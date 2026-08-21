# ADR-008 — Idempotency key scope in a persistent store

**Status:** Accepted · **Date:** 2026-08-15
**Raised under:** SSOT v2.0 §31 (spec change control), R3 (undefined ≠ discretion)
**Resolved:** autonomously — the contracts determine it uniquely

## Context

`docs/business/02_FIRST_GARMENT_EXECUTION.md` §3.4 states the idempotency key as:

```
(order_id, from_status, to_status, idempotency_key)
```

`src/order/state-machine.ts` implements exactly that, and it is correct there: the pure function receives `from` as an argument, so the caller decides which `from` the key describes.

`src/order/store.ts` derives `from` from the log instead of receiving it. Transcribing the four-tuple literally produced a failing test on first run.

## Problem

A webhook is redelivered. The first delivery has already been applied, so the order's current status has moved.

```
delivery 1   from = CREATED   key = ORD|CREATED|PAID|evt_1   → applied, recorded
delivery 2   from = PAID      key = ORD|PAID|PAID|evt_1      → no match → processed again
```

The stored record carries `from = CREATED`; the recomputed key carries `from = PAID`. They can never match. **Applied literally in a store, the four-tuple guarantees nothing against the one failure it exists to prevent.**

## Why this is not "UNDEFINED"

R3 requires exhausting existing contracts before escalating. Three of them settle it:

1. §3.4's stated purpose is that *"동일 웹훅 재수신 → no-op, 에러 아님"* — a redelivered webhook is a no-op. A key that cannot match a redelivery does not serve its own stated purpose.
2. §3.4 also requires *"생산 지시는 주문당 1건, DB unique 제약으로 강제 — 웹훅이 한 번만 오기를 기대하지 않는다"*. A constraint that admits a second row for the same delivery is not that constraint.
3. ADR-003's pre-order model takes payment before production. Processing one payment event twice is the concrete harm.

The correct scope follows uniquely. No Human Gate.

## Decision

**Redelivery identity in the store is `(orderId, idempotencyKey)`.**

- Same key, same destination → `duplicate`. Nothing is written; the original record is returned.
- Same key, **different** destination → rejected and recorded. One key must not authorise two distinct effects; that is a caller error, not a redelivery.
- The state machine's four-tuple is unchanged. It remains right for the pure layer.

## Trade-offs

- **Lost:** literal agreement between store and spec text. The spec's §3.4 wording now describes the pure layer only; this ADR governs the store.
- **Lost:** the ability to reuse one idempotency key across an order's lifecycle. That is a constraint on callers, and a reasonable one — Stripe event ids are already unique per delivery.
- **Gained:** redelivery is detected however far the order has since advanced, which is the property that was claimed and did not hold.

## Consequences

- Three tests pin it: a redelivery at distance is a no-op; a reused key for a different transition is rejected and recorded; a distinct key is judged on its own merits.
- When §3.4 is next revised, its key should be qualified as applying to the pure function. Not edited now — changing a spec to match an implementation mid-cycle is the drift §31 exists to prevent.
- The clash case is recorded in the log rather than thrown, consistent with §3.4's requirement that refusals be recorded.
