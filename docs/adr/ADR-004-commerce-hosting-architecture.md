# ADR-004 — Commerce and Hosting Architecture

**Status:** Accepted · **Date:** 2026-08-15
**Supersedes:** the Shopify Headless recommendation in `docs/website/01_SITE_AUDIT.md` §15.4

## Context

An earlier audit recommended Shopify Headless, reasoning that it removes operational burden (tax, shipping, orders, admin) and that D1 §20 forbids an experimental checkout — so there is no reason to build one.

That recommendation was made before D2 §38 and §92 introduced a near-zero recurring cost constraint, and before D3 established that the brand has no products and no revenue.

## Problem

What commerce and hosting architecture supports a real selling loop at near-zero fixed cost, without reducing security or reliability?

## Options

Verified August 2026:

| | Fixed cost | Variable | Cost before first sale |
| --- | --- | --- | --- |
| **Cloudflare Pages + Stripe Checkout** | **$0/yr** | 2.9% + $0.30 | **$0** |
| Shopify Basic (headless) | ~$468/yr | 2.9% + $0.30 | **$468** |
| Medusa / self-hosted | Hosting + time | varies | Highest in effort |

Cloudflare Pages serves static output with unmetered bandwidth at no cost; Workers, R2, and D1 free tiers cover the small dynamic surface a pre-order shop needs. Stripe charges no monthly fee. Shopify Basic additionally surcharges 2% on Basic if a third-party processor is used instead of Shopify Payments.

## Decision

**Cloudflare Pages (static) + Stripe hosted checkout.** $0 fixed, per-transaction only.

Content and design specifications stay in git — Olibana owns its data (D3 §33).

Migration to a platform is revisited **when order volume makes operational burden cost more in time than a subscription costs in money** — a real threshold, crossed on evidence rather than anticipation.

## Reason

For a brand with no products and no revenue, Shopify bills roughly $468 before a single garment sells. That is not a large sum in absolute terms; it is significant as a fixed cost incurred against zero validated demand, which is exactly what D2 §92 and D3's capital-risk logic direct against.

Stripe's **hosted** checkout also satisfies D1 §20 better than a custom build would: it is a maintained, trusted, PCI-handled surface, and card data never touches Olibana infrastructure. The requirement never to make checkout experimental is met by not building a checkout at all.

The earlier reasoning was not wrong on its merits — Shopify does remove genuine operational burden. It answered a question posed without a cost constraint. With the constraint applied, and at a scale where the operational burden is a handful of orders, near-$0 wins clearly.

## Trade-offs

- **Lost:** Shopify's built-in tax calculation, shipping rate integration, order admin, and customer accounts. **These become manual procedures at launch** — acceptable at one-product scale, and D3 §2 explicitly permits temporarily manual operation.
- **Lost:** a ready-made admin UI. Order state lives in Olibana's own store instead.
- **Gained:** $0 fixed cost; no spend before revenue.
- **Gained:** low lock-in — static output is portable to any host.
- **Risk:** manual operations do not scale. This is a deliberate, bounded trade with a defined exit.

## Consequences

- Tax, duty, and shipping rates must be determined and encoded manually — see R-06.
- Order management is Olibana's responsibility: state machine, idempotency, and recovery paths are specified in `docs/business/DATA_MODEL.md`.
- Security posture is simplified: no card data is stored, so the highest-severity category is removed by architecture rather than by controls.
- The brand and commerce data layers stay separate, keeping the migration path open.
- Cost figures are vendor-reported and summarised by third parties. **Re-verify against official pricing pages before committing**, since tiers change.
