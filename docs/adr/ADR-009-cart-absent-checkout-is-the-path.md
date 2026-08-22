# ADR-009 — The Completion Gate asks for a cart; the SPEC forbids one

**Status:** Accepted · **Date:** 2026-08-22
**Raised under:** §31 SPEC CHANGE CONTROL · **Resolved:** autonomously under P-01 and ADR-001

## Context

The Autonomous Development & Visual Optimization Engine directive lists, in its Completion Gate, `[ ] Cart integrated`, and in §12 traces the commerce loop as `PRODUCT → CATALOG → PRODUCT DETAIL → CART → CHECKOUT → ORDER → PAYMENT BOUNDARY → PERSISTENCE`, requiring that no stage be broken.

The repository's own specification says the opposite.

## Problem

| Source | Says |
| --- | --- |
| Directive §12, §17 | `CART` is a stage of the commerce loop, and `Cart integrated` is a Completion Gate criterion |
| `docs/business/02_FIRST_GARMENT_EXECUTION.md` §2.3 | `✗ Cart — 단일 상품 · 단일 variant. Stripe 세션이 대신한다` |

§2.3 is not an omission. It is a list titled *만들지 않는 것* — what is deliberately not built — and the cart appears on it with its reason attached.

## Why this is not implementer discretion

Under §1.2 of the directive itself, an undefined matter is only genuinely undefined after the repository has been searched for an existing decision. Here the search finds one, and three facts determine the resolution:

1. **The MVP is one garment (ADR-002).** A cart exists to hold several line items until a customer is finished choosing. With one product and one variant selection there is nothing to hold: the basket and the order are the same object, created at the same instant.

2. **The architecture has nowhere to put one (ADR-004).** The site is static, ships zero JavaScript, and is hosted on Cloudflare Pages with Stripe hosted checkout. A cart requires either client-side state (JavaScript this site does not ship) or a session store (a runtime this architecture does not have). Building one would mean reopening ADR-004, which was decided on a $0 fixed-cost constraint that still holds.

3. **The directive's own priority rule resolves it.** §1.1 puts Repository Evidence and ADR above Conversation Context, and §0 of the second directive repeats it: *이미 결정된 것을 다시 결정하지 않는다*. The Completion Gate is a checklist of intent, not a specification that outranks the spec it is checking.

## Decision

**No cart entity is built.** The Completion Gate item `Cart integrated` is satisfied by the path it exists to protect:

```
PRODUCT PAGE → variant selection → ORDER (created, priced, snapshotted) → PAYMENT BOUNDARY → PERSISTENCE
```

The criterion is renamed in this project's terms to **`Selection-to-order path integrated`**, and it is FALSE until a customer's variant selection can produce a persisted order.

This is a narrowing of form, not of function. What the directive asks for — an unbroken purchase path with no stage that silently drops the customer — is delivered in full. What is refused is a specific entity the spec removed for stated reasons.

## Consequence

- If Olibana ever sells more than one garment at a time, this ADR is void and a cart becomes necessary. That is a change to ADR-002's MVP boundary, not a change to this decision.
- `OrderItem` still carries `quantity` (SPEC Part 2.2), so a single order may commit several units of one variant. That is not a cart; it is a quantity field.
- The refusal is recorded here so that a future reader does not read §2.3 as an oversight and "fix" it.

## Reversibility

**Reversible.** Nothing is deleted and no data shape forecloses a cart; adding one later means adding an entity between the page and the order, not unwinding anything built now.
