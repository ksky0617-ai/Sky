# ADR-002 — MVP Boundary: One Product, Complete Loop

**Status:** Accepted · **Date:** 2026-08-15
**Supersedes:** the MVP-0 / MVP-1 split in `docs/website/01_SITE_AUDIT.md` §19

## Context

Olibana has brand doctrine and no products. An earlier audit proposed shipping a brand world first (MVP-0: home, nature, philosophy, journal — no commerce), on the reasoning that commerce screens without products would be hollow.

D3 §57 defines MVP differently: *the minimum actual selling loop* — Product → Pinterest → Website → Purchase → Fulfilment. D3 §58 금지 1 prohibits completing a beautiful UI and considering the business model afterwards.

## Problem

MVP-0 is the prohibited pattern. The premise was true — commerce screens with no products *would* be hollow — but the conclusion drawn from it was wrong: that the answer is to build the beautiful half first. The correct response to "there is nothing to sell" is to obtain something to sell, not to ship the part that does not require one.

## Options

1. **MVP-0 — brand world first.** Ships soonest. Produces no revenue, no customer, and no data. Violates D3 §58 금지 1. If the business never materialises, the outcome is a beautiful site for a brand that does not exist.
2. **Full commerce launch.** Requires nine business inputs simultaneously. Longest path, highest coordination risk, and nothing is validated until everything is.
3. **One product, complete loop.** One garment: specified, produced, priced, purchasable, shippable, supported.

## Decision

**Option 3 — MVP-1P: one garment, sold end to end.**

Ship condition: every node is real, none simulated.

```
Product      1 garment, fully specified, sample approved
Supplier     identified, quoted, capacity confirmed
Economics    cost known → price set → positive contribution margin
Content      real photography of the actual garment
Site         home · the product · philosophy · nature · policies
Payment      hosted checkout, live
Order        state machine, idempotent, recorded
Production   written procedure, triggered by a paid order
Fulfilment   carrier chosen, rates known, tracking provided
Support      real channel with a stated response time
Legal        entity, privacy, terms, returns — reviewed
Data         identifier chain threaded end to end
```

Excluded: catalogue, search, wishlist, accounts, automation, AI generation, Pinterest publishing at scale.

Subsequent: **V1** — catalogue, analytics, customer feedback, measured Pinterest funnel. **V2** — AI-assisted discovery and content, experimentation, closed learning loop.

## Reason

One garment exercises **every node of the business loop at minimum scale**. It validates the supplier, the pricing, the checkout, the shipping, and the customer outcome simultaneously, and produces the first real data — which is the input the learning loop needs and which no amount of building can substitute for.

It is also not a brand compromise. A single garment executed exactly is a stronger Olibana statement than a website about garments that do not exist. The brand's own principle — remove every last element until there is nothing left to take away — applied to its launch.

## Trade-offs

- **Lost:** early public presence. The site does not exist until a garment does.
- **Lost:** the option of building the enjoyable work first.
- **Gained:** revenue, a real customer, and real data at the first release rather than the second.
- **Gained:** every assumption is tested at the smallest possible cost of being wrong.
- **Risk:** a single garment carries the entire first impression. Selection and execution matter more than they would in a collection.

## Consequences

- Implementation order is re-sequenced by blocker rather than by buildability: supplier → specification → economics → legal → measurement → photography → **build** → failure injection → E2E → loop closure. Engineering is step 7 of 10.
- The brand-world pages still ship — as the context surrounding the product, not as the milestone.
- `docs/website/03_INFORMATION_ARCHITECTURE.md` §3's MVP-0 build set is reinterpreted: those routes remain correct, and `/products/[slug]` joins them.
- Pinterest acquisition stays paused until a product exists.
