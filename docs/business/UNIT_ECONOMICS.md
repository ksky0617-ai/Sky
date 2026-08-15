# UNIT ECONOMICS

**Version:** v1.0 · **Date:** 2026-08-15
**Required by:** *Business / System / Autonomous Loop Failure Elimination* §10, §66
**Rule applied (§11):** where real data does not exist, the value is `UNKNOWN`. **No figure on this page is estimated, illustrative, or placeholder-numeric.** Inventing a number here would make an unprofitable product look profitable, which is the specific failure this document exists to prevent.

---

## 1. Current State

```
Products defined:  0
Suppliers:         0
Quotations:        0
Prices set:        0

Contribution profit:  UNCOMPUTABLE
```

## 2. Per-Unit Contribution (template, one garment)

| Line | Value | Source | Status |
| --- | --- | --- | --- |
| Selling price | `UNKNOWN` | Set from cost + margin target + market acceptance | **Blocked by cost** |
| − Production cost (CMT) | `UNKNOWN` | Supplier quotation | **Blocked** |
| − Material cost | `UNKNOWN` | Mill / supplier quotation | **Blocked** |
| − Trims, labels, hardware | `UNKNOWN` | Supplier quotation | **Blocked** |
| − Packaging | `UNKNOWN` | Packaging supplier | **Blocked** |
| − Payment fee | **2.9% + $0.30** | Stripe, US card, Aug 2026 | ✅ **KNOWN** |
| − Platform / subscription fee | **$0.00** | Cloudflare Pages + Stripe, no subscription | ✅ **KNOWN** |
| − Shipping subsidy | `UNKNOWN` | Carrier rates by destination | **Blocked** |
| − Duty / import VAT exposure | `UNKNOWN` | Per-market tax treatment | **Blocked** |
| − Return cost (allocated) | `UNKNOWN` | Return rate × return logistics cost | **Blocked — rate unknowable pre-launch** |
| − Customer support cost | `UNKNOWN` | Time per order × cost of time | **Blocked** |
| − Content cost allocation | `UNKNOWN` | Photography + production ÷ units | **Blocked** |
| − Acquisition cost | `UNKNOWN` | Only measurable after real traffic | **Blocked** |
| **= Contribution profit** | **`UNCOMPUTABLE`** | | |

**2 of 13 lines are known.** Both are the ones that were researched rather than assumed — which is a fair illustration of the difference between the two.

## 3. Aggregate Metrics

| Metric | Value | Earliest knowable |
| --- | --- | --- |
| Contribution margin % | `UNKNOWN` | After supplier quotation + price |
| Gross margin % | `UNKNOWN` | After supplier quotation + price |
| AOV | `UNKNOWN` | After sales |
| CAC | `UNKNOWN` | After paid or measured acquisition |
| LTV | `UNKNOWN` | After repeat purchase data — months out |
| Return rate | `UNKNOWN` | After deliveries |
| Refund rate | `UNKNOWN` | After deliveries |
| Conversion rate | `UNKNOWN` | After traffic |
| Break-even ROAS | `UNKNOWN` | Requires contribution margin + CAC |

**No aggregate metric is computable, because all of them depend on either a supplier quotation or actual sales.** There is no analytical shortcut.

## 4. Unknown Resolution Plan (§11)

| Unknown | Required data | Collection method | Effort | Unblocks |
| --- | --- | --- | --- | --- |
| Production cost | CMT quote | **Supplier conversation** | Low | Price, margin, R-03 |
| Material cost | Fabric price + consumption | Supplier / mill quote | Low | Price |
| Trims, packaging | Component quotes | Supplier quote | Low | Price |
| MOQ, lead time, capacity | Supplier terms | Same conversation | Low | Inventory model, delivery promise |
| Shipping cost | Rate card by destination and weight | Carrier quote | Low | Shipping policy, price |
| Duty / VAT | Treatment per market | Professional advice | Medium | Market selection, R-06 |
| Return rate | Behavioural baseline | **Cannot be known pre-launch** | — | Plan against a range, not a point |
| Support cost | Time per order | Measure during first orders | Low | — |
| Content cost | Photography spend ÷ units | Owner records actual spend | Low | — |
| CAC | Channel cost ÷ customers | Measure after traffic | — | — |

> **One supplier conversation resolves the first four rows.** It is the highest-leverage action available to this project, and it costs a conversation rather than a build.

## 5. Decision Rules — set now, before any number exists

Fixing these in advance prevents the number from being rationalised once it arrives.

1. **No product is published before its contribution profit is computed and positive.** A product that cannot be shown to make money does not launch.
2. **Shipping is never subsidised below contribution margin** without an explicit, recorded decision and a stated duration.
3. **Return cost is modelled as a range, never as zero.** Fashion return rates are material; assuming zero is the most common way a margin turns out to be imaginary.
4. **Price is set from cost and value, never from a competitor's price.** A competitor's price reflects their cost structure, which is unknown here.
5. **The lowest-margin variant is the one that must clear the bar** — not the average. Averages conceal loss-making sizes and colourways.
6. **`UNKNOWN` is never replaced by an estimate in this document.** Estimates belong in planning scenarios, clearly labelled as such and stored separately.

## 6. Stop Condition

> §59: *Unit Economics Unknown > 0 → do not declare completion.*

**Currently violated.** By this project's own criteria, Olibana is not in a position to sell, and the blocker is a supplier quotation rather than any amount of engineering.
