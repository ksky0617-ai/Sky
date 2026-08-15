# ADR-003 — Inventory Model: Pre-Order

**Status:** Accepted · **Date:** 2026-08-15
**Supersedes:** the unqualified "Zero-Inventory Commerce" framing in D1 §60

## Context

D1 §60 directs that the site connect to a future zero-inventory sales system. D3 §6 corrects this: the objective is **minimising capital locked before sale**, not the number zero — and warns that pursuing zero inventory as a target can destroy brand or unit economics.

Olibana has no supplier, no cost data, and no products.

## Problem

Which production and inventory model should the launch use, given that capital risk must be low, quality must be controllable, and the brand's entire premise is construction derived from measured natural structure?

## Options

| Model | Capital risk | Lead time | Unit cost | QC control | Brand fit |
| --- | --- | --- | --- | --- | --- |
| Made-to-order | Lowest | Longest | Highest | Per-piece, highest | Highest |
| **Pre-order (batch)** | Low | Long, predictable | Medium | Batch | High |
| Print-on-demand | None | Shortest | High | **None** | **Fails** |
| Small batch | Medium | Short (stocked) | Lower | Batch | High |
| Supplier fulfilment | Low | Varies | Varies | Low | Risk |
| 3PL | Medium (stock owned) | Short | + storage | — | Neutral |

## Decision

**Pre-order for launch,** with the production window stated before payment.

**Print-on-demand is disqualified outright, on brand grounds.**

## Reason

**On print-on-demand.** This matters more than it first appears, because a zero-inventory instinct points there naturally — it is the only option with literally zero capital risk. Olibana's design rules are structural: panel seams from fracture angles, hems from meander curvature, proportion from branching ratios, edges that are carved rather than cut. Print-on-demand applies graphics to blank garments. It cannot execute a single one of these rules. Adopting it to reach zero inventory would remove the reason the brand exists — precisely the outcome D3 §6 warns against.

**On pre-order.** It validates demand before capital is committed, which is the same shape as the loop D3 §5 describes: signal → hypothesis → validation → production. Batch production keeps unit cost below made-to-order. And it is honest, provided the lead time is disclosed at the point of purchase rather than buried in terms.

**On made-to-order.** The purest expression of the brand and the right long-term answer if margins support it. Deferred until unit economics are known, because its higher unit cost cannot be evaluated against an unknown price.

## Trade-offs

- **Lost:** immediate delivery. Customers wait, and some will not.
- **Lost:** the simplicity of stocked fulfilment.
- **Gained:** no capital locked in unsold garments.
- **Gained:** demand evidence before production commitment.
- **Risk (R-10):** long waits cause cancellations and chargebacks. Mitigated by disclosure before payment and proactive updates at each order state transition — not by hoping customers are patient.

## Consequences

- Product pages state production and delivery windows **before** the purchase action, prominently.
- The order state machine includes `PRODUCTION_PENDING` and `PRODUCTION` as customer-visible states with honest dates.
- Cancellation terms are published and honoured without argument.
- Pre-order windows may close — genuine scarcity from a real production run is legitimate; manufactured scarcity is prohibited (D3 §58 금지 6).
- Revisit once unit economics exist: made-to-order if margins support it, small batch if lead time proves to be the binding constraint on conversion.
