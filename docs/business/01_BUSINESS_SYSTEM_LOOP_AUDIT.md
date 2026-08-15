# OLIBANA BUSINESS + SYSTEM + LOOP AUDIT

**Document:** `docs/business/01_BUSINESS_SYSTEM_LOOP_AUDIT.md`
**Version:** v1.0
**Date:** 2026-08-15
**Responds to:** *Business / System / Autonomous Loop Failure Elimination Master Prompt* (45 pp.)
**Format:** per that document's §69
**Status:** PHASE 0–4 (Discovery → Business Audit → Loop Audit → Failure Enumeration → Risk Prioritisation). No implementation code (§68).

---

## 0. The Correction This Directive Forces

This directive supersedes my earlier MVP recommendation, and says so more clearly than I did.

> **§58 금지 1** — Do not complete a beautiful UI first and think about the business model later.

The MVP-0 I proposed in `01_SITE_AUDIT.md` §19 — a brand world with no commerce — **is that failure mode.** It was reasoned from a true premise (no products exist, so commerce screens would be hollow) to a conclusion this directive correctly rejects: that the answer is to build the beautiful half first.

The real answer is neither. It is stated in §57:

```
MVP = the minimum actual selling loop
      Product → Pinterest → Website → Purchase → Fulfilment
```

**The smallest honest version of that is one garment, sold end to end.** Not a collection, not a catalogue, and not a brand site waiting for products.

One garment that is actually designed, actually producible, actually costed, actually purchasable, and actually shippable exercises **every node in the business loop at minimum scale**. It generates the first real data. It validates the supplier, the pricing, the checkout, the shipping, and the customer outcome simultaneously. And it is not a compromise of the brand — a single garment executed exactly is a more Olibana statement than a website about garments that do not exist. *Remove every last element until there is nothing left to take away* is the brand's own principle applied to its launch.

**Revised recommendation:**

| Was | Now |
| --- | --- |
| MVP-0: brand world, no commerce | **MVP-1P: one product, complete loop** |
| MVP-1: full commerce when 9 inputs arrive | V1: catalogue, analytics, feedback |
| — | V2: AI discovery, content generation, learning loop |

The brand-world pages are not discarded — they ship *around* the one product, as the context that makes it comprehensible. But they are no longer the milestone.

**This requires owner approval** (recorded as P0-1), because it changes what "first release" means.

---

## 1. 현재 Repository 상태

15 markdown documents, 1 commit-series, **zero code, zero assets**. Full inventory in `01_SITE_AUDIT.md` §1.

Second account repository `ksky0617-ai/-` is an empty placeholder.

Nothing in the repository is business infrastructure. There is no `BUSINESS_MODEL.md`, no `UNIT_ECONOMICS.md`, no supplier record, no product record, no order schema, no automation spec. Of the fourteen documents §66 requires the project to maintain, **two now exist** (this audit and the risk register created alongside it) and twelve do not.

## 2. 현재 Olibana SSOT 상태

| Document | Status |
| --- | --- |
| `README.md`, `Brand_Bible.md` | ✅ Complete as brand doctrine |
| `Character_Bible.md` v1.1 | ✅ Extended; four factual items still `REQUIRED FROM OWNER` |
| `Design_System.md` | ⚠️ Evaluation system, not a UI system |
| Four Atlases | ⚠️ Method present, **zero measured rows** |
| **`Fashion_Specification.*`** | ❌ **Does not exist** |
| Product / commerce / automation specs | ❌ Do not exist |

Per §4, existing brand documents have not been rewritten. Conflicts found between the three master directives are reported in §25 rather than resolved unilaterally.

## 3. 현재 Business Model

**None is documented.** What can be inferred from the three directives, marked by confidence:

| Element | Inferred | Confidence |
| --- | --- | --- |
| Category | Premium / luxury-adjacent apparel and accessories | High |
| Positioning | Original design language derived from measured natural structure | High |
| Geography | Global, Tokyo-based atelier | Medium — atelier existence unverified |
| Channel | Direct-to-consumer via own site | High |
| Acquisition | Pinterest-led | Medium — asserted, unvalidated |
| Price point | **UNKNOWN** | — |
| Target customer | **UNKNOWN** | — |
| Production model | **UNKNOWN** | — |
| Revenue model | Presumed one-time product sales | Low |

**There is no business model document. There is a brand philosophy and an inferred sales channel.** Those are not the same thing, and §46 is explicit that they are different states.

## 4. 현재 Product Model

```
Products defined:        0
Fashion Specification:   does not exist
SKU scheme:              does not exist
Size range:              undefined
Measurements:            none
Materials:               unspecified
Cost per unit:           UNKNOWN
Selling price:           UNKNOWN
Production feasibility:  UNVERIFIED
```

Every downstream system — pricing, checkout, size guidance, production requests, fulfilment, returns — is blocked on this. It is the project's first-order dependency.

## 5. 현재 Supply Model

**This is the most consequential gap in the entire project, and it has not been raised until now because the earlier directives did not ask about it.**

| §7-C question | Answer |
| --- | --- |
| Who produces? | **UNKNOWN — no supplier identified** |
| MOQ? | UNKNOWN |
| Lead time? | UNKNOWN |
| Capacity? | UNKNOWN |
| Defect rate? | UNKNOWN |
| Reproducibility? | UNKNOWN |
| Quality inspection? | UNDEFINED |
| Fabric sourcing? | UNKNOWN |
| Trims / hardware? | UNKNOWN |
| Packaging? | UNDEFINED |
| Labelling? | UNDEFINED — note: care/fibre labelling is a **legal requirement** in most markets |

> **Without a supplier there is no business — only a design practice.**
>
> Every other node in the loop is downstream of a single question: *can this garment actually be made, at what cost, in what time, at what quality?* Until that is answered, price cannot be set, margin cannot be computed, delivery cannot be promised, and no order can be honoured.
>
> This outranks the website entirely. A perfect storefront in front of no production capacity sells nothing it can deliver — and taking money for a garment that cannot be produced is the worst failure available to this project, commercially and legally.

### Inventory model (§6) — analysed, since this is the decision that shapes everything

§6 correctly warns against pursuing "inventory = 0" as a number. The goal is minimising capital locked before sale **without destroying brand or unit economics**.

| Model | Capital risk | Lead time to customer | Unit cost | QC control | **Brand fit** |
| --- | --- | --- | --- | --- | --- |
| **Made-to-order** | Lowest | Longest | Highest | Per-piece, highest | **Highest** — matches the craft claim exactly |
| **Pre-order (batch)** | Low | Long, predictable | Medium | Batch | **High** |
| Print-on-demand | None | Shortest | High | **None** | **Disqualified — see below** |
| Small batch | Medium | Short (stocked) | Lower | Batch | High |
| Supplier fulfilment | Low | Varies | Varies | **Low** | Risk |
| 3PL | Medium (stock still owned) | Short | + storage | — | Neutral |

**Print-on-demand is disqualified on brand grounds, and this matters because it is where a zero-inventory instinct naturally points.** Olibana's premise is construction derived from measured natural structure: panel seams from fracture angles, hems from meander curvature, proportion from branching ratios. POD produces printed graphics on blank garments. It cannot express a single one of the brand's actual design rules. Choosing it to reach zero inventory would eliminate the reason the brand exists.

**Recommendation: pre-order for launch**, with an honestly stated production window.

- Demand is validated **before** capital is committed — which is precisely the loop structure §5 describes
- Batch production keeps unit cost below made-to-order
- It is honest, provided the lead time is stated before payment and not buried
- **Principal risk:** long waits cause cancellations and refund pressure. Mitigation is disclosure at the point of purchase, not after.

Made-to-order remains the purest expression of the brand and should be revisited once unit economics are known.

## 6. 현재 Commerce Model

Nothing exists. Revised architecture from `21_UX_PERFORMANCE_COST_AUDIT.md` §19: Cloudflare Pages plus hosted Stripe Checkout, $0 fixed cost, per-transaction only.

Undefined: tax handling, international duties, shipping rates, refund mechanics, exchange mechanics, currency strategy.

**Cross-border tax and duty is an underestimated risk.** A global brand shipping from Japan to the US and EU faces import duty and VAT/GST obligations that determine whether the customer receives an unexpected bill on delivery — a documented driver of refusal and return. This is unresolved and appears in the risk register as R-06.

## 7. 현재 Pinterest / Acquisition Model

**Assumed, not validated.** No Pinterest account is documented, no account risk assessment exists, and no funnel measurement is defined.

§16 correctly separates four distinct functions that "Pinterest strategy" usually conflates:

```
Discovery Engine  ·  Demand Signal Engine  ·  Content Distribution  ·  Traffic Acquisition
```

The second is the most valuable and the least used: Pinterest search and engagement data is a **demand signal that can inform what to make**, before anything is made. For a brand with no products, that is more useful than traffic.

**Risks from §17, assessed:**

| Risk | Assessment |
| --- | --- |
| Automated publishing → spam detection → account loss | **High impact.** An account ban removes the entire assumed acquisition channel at once |
| Broken links / stale products / wrong pricing on pins | High — pins outlive product state; a pin pointing at a sold-out or mispriced item damages trust |
| Content duplication penalties | Medium |
| API rate limits / API changes | Medium |
| Attribution failure | High — without it, the learning loop cannot close |

**Recommendation:** manual or human-approved publishing until the loop is proven. §12 classifies mass publishing as high-risk automation, and automating into a channel the business fully depends on, before that channel is validated, concentrates risk rather than reducing cost.

**Confirming the earlier conclusion:** do not drive Pinterest acquisition before a product exists. Traffic to a site with nothing to buy converts at zero and teaches the platform that Olibana content does not satisfy intent.

## 8. 현재 Fulfillment Model

**None.** No carrier, no packaging, no labelling, no tracking integration, no returns logistics, no customer notification system.

The order state machine required by §23 does not exist. Designed below in §27.

## 9. 현재 Data Model

No schema, no event definitions, no identifiers, no storage. Analytics events were drafted in earlier documents but nothing connects them to business outcomes.

**Traceability (§51) does not exist**, which means the learning loop cannot close even in principle. The identifier chain — signal → product → content → campaign → session → cart → order → fulfilment → feedback — must be designed before the first sale, because it cannot be reconstructed afterwards.

## 10. 현재 Automation Model

**None exists**, which is the correct state for this stage.

Applying §12's classification to the launch phase:

| Task | Classification | Rationale |
| --- | --- | --- |
| Product approval | **Human Required** | §12 names it high-risk; irreversible brand consequence |
| Pricing | **Human Required** | Directly determines solvency |
| Quality approval | **Human Required** | Cannot be inspected remotely by rule |
| Legal / policy text | **Human Required** | §12; also required by the earlier directives |
| Refund exceptions | **Human Required** | Judgement and goodwill |
| Customer disputes | **Human Required** | |
| Supplier changes | **Human Required** | |
| Mass advertising | **Human Required** | Spend risk |
| Product copy drafting | AI Assisted | Human reviews against source data |
| Image optimisation | Rule Automated | Deterministic |
| Order confirmation email | Rule Automated | Deterministic, idempotent |
| Analytics aggregation | Fully Automated | Read-only |

**Nothing that spends money, changes price, publishes publicly, or promises a customer anything runs unattended at launch.** §56 is right that human-in-the-loop is safer early; automation is earned by a stable process, not assumed at the start.

## 11. 전체 Business Loop

The target loop from §5, with the real state of every node:

```
DEMAND DISCOVERY      ❌ no research, no Pinterest signal collection
MARKET SIGNAL         ❌ none
PRODUCT HYPOTHESIS    ❌ none
DESIGN                ⚠️  philosophy exists; no Fashion Specification
VALIDATION            ❌ no criteria applied to any actual design
CONTENT CREATION      ❌ no assets
DISTRIBUTION          ❌ no channel active
TRAFFIC               ❌ no site
PRODUCT DISCOVERY     ❌ no products
CONSIDERATION         ❌
PURCHASE              ❌
PAYMENT               ❌ no provider
ORDER                 ❌ no system
PRODUCTION            ❌ NO SUPPLIER
FULFILLMENT           ❌
SHIPPING              ❌ no carrier
DELIVERY              ❌
CUSTOMER EXPERIENCE   ❌
REVIEW / FEEDBACK     ❌
DATA                  ❌ no schema
LEARNING              ❌
NEXT PRODUCT          ❌
```

**Nodes connected: 0 of 22.** One node is partially present — design philosophy without design output.

This is not a criticism of progress. It is the accurate statement of where a brand stands when it has written its doctrine and not yet made anything. The value of stating it plainly is that it makes the ordering obvious.

## 12. Loop Breakpoints

§15 asks the decisive question at every arrow: *does this stage's output actually become the next stage's input?*

| Break | Missing connection | Severity |
| --- | --- | --- |
| **B1** | Design philosophy → production-ready specification | **P0** |
| **B2** | Specification → producible garment (no supplier) | **P0** |
| **B3** | Garment → price (no cost data) | **P0** |
| **B4** | Product → purchasable listing (no commerce) | **P0** |
| **B5** | Order → production request | **P0** |
| **B6** | Production → shipment (no carrier) | **P0** |
| **B7** | Delivery → customer outcome measurement | P1 |
| **B8** | Outcome → data (no schema, no identifiers) | P1 |
| **B9** | Data → next decision (no diagnostic logic) | P1 |
| **B10** | Pinterest signal → product hypothesis | P1 |
| **B11** | Atlas measurement → design rule → garment | P1 — *this is the brand's differentiator and it is broken at the first arrow* |

**B1 and B2 are the loop's origin.** Everything downstream is unreachable until a garment can be specified and made. B11 is the one that makes Olibana Olibana rather than a generic small label, and it is broken because the Atlases contain no measurements.

## 13. Failure Tree

```
BUSINESS FAILS
├── NO DEMAND
│   ├── No customer research                          UNKNOWN
│   ├── Positioning untested                          UNKNOWN
│   └── Willingness-to-pay unknown                    UNKNOWN
├── NOTHING TO SELL                                   ← CURRENT STATE
│   ├── No Fashion Specification                      P0
│   └── No supplier                                   P0
├── BAD UNIT ECONOMICS
│   ├── Cost unknown → price cannot be set            P0
│   ├── Shipping cost may exceed margin               P0
│   └── Return cost on cross-border unknown           P1
├── SUPPLY FAILURE
│   ├── No supplier / no backup                       P0
│   ├── MOQ exceeds demand                            P1
│   └── Lead time exceeds customer tolerance          P1
├── QUALITY FAILURE
│   ├── No QC process                                 P1
│   └── Sample ≠ production                           P1
├── FULFILMENT / SHIPPING FAILURE
│   ├── No carrier                                    P0
│   ├── Duty/VAT surprises customer on delivery       P1
│   └── No tracking                                   P1
├── RETURN FAILURE
│   ├── No policy                                     P0 (legally required in several markets)
│   └── Cross-border return cost may exceed item value P1
├── LEGAL / COMPLIANCE FAILURE
│   ├── No entity / no company information            P0
│   ├── No privacy policy, no terms                   P0
│   ├── Fibre and care labelling obligations          P1
│   └── Consumer withdrawal rights (EU/KR/JP differ)  P1
├── AUTOMATION FAILURE
│   └── Not applicable yet — none exists              —
├── TECHNICAL FAILURE
│   └── No system exists yet                          —
├── SECURITY FAILURE
│   └── Mitigated by design: hosted checkout, no card data held  —
└── BRAND DILUTION
    ├── Fabricated claims destroy the only trust asset P0
    └── SKU growth mistaken for brand growth           P2
```

## 14. P0 Risks

*Business cannot operate.*

| ID | Risk |
| --- | --- |
| **R-01** | **No supplier.** Nothing can be produced; no order could be honoured |
| **R-02** | **No Fashion Specification.** Nothing can be specified for production |
| **R-03** | **Unit economics unknown.** Price may be set below cost; solvency unverifiable |
| **R-04** | **No legal entity or policies.** Cannot lawfully take consumer payment in target markets |
| **R-05** | **No payment provider.** No revenue path |
| **R-08** | **Fabricated claim risk.** A single invented measurement, origin, or handcraft claim destroys the brand's only credibility mechanism |

## 15. P1 Risks

*Money, customer, or brand can be materially damaged.*

| ID | Risk |
| --- | --- |
| **R-06** | Cross-border duty and VAT surprise customers at delivery |
| **R-07** | No returns policy or returns logistics |
| **R-09** | Pinterest account loss removes the entire assumed acquisition channel |
| **R-10** | Pre-order lead time causes cancellations and refund pressure |
| **R-11** | No traceability identifiers — the learning loop cannot close and cannot be retrofitted |
| **R-12** | Sample-to-production quality drift with no QC gate |
| **R-13** | Single points of external dependency (payment, hosting, Pinterest) |

## 16. P2 Risks

| ID | Risk |
| --- | --- |
| **R-14** | SKU proliferation dilutes identity |
| **R-15** | Content templating produces sameness across products |
| **R-16** | Atlas data never collected — brand differentiator stays theoretical |

Full detail for every risk is in `RISK_REGISTER.md`.

## 17. Unknowns

Per §11, these are recorded as `UNKNOWN` rather than estimated. Fabricating any of them would violate §11 and §58 금지 3.

| Unknown | Required data | Collection method |
| --- | --- | --- |
| Who buys | Customer definition | Owner articulates; validate against Pinterest engagement |
| Willingness to pay | Price acceptance | Comparable market scan; pre-order response |
| Production cost | Unit cost | **Supplier quotation** |
| MOQ / lead time / capacity | Supplier terms | Supplier conversation |
| Defect rate | Quality baseline | First sample run |
| Fabric cost and availability | Material sourcing | Mill or supplier quotation |
| Shipping cost by region | Carrier rates | Carrier quotation |
| Duty / VAT exposure | Tax treatment | Professional advice per market |
| Return rate | Behavioural baseline | Cannot be known pre-launch — plan for a range |
| CAC | Acquisition cost | Only measurable after traffic |
| Conversion rate | Funnel baseline | Only measurable after launch |

**Eleven unknowns, and the first six are answerable by conversations rather than by building anything.**

## 18. Unit Economics Gaps

Per §10, computed as far as data allows. Detail in `docs/business/UNIT_ECONOMICS.md`.

```
Selling price              UNKNOWN
− Production cost          UNKNOWN
− Material cost            UNKNOWN
− Packaging                UNKNOWN
− Payment fee              KNOWN     2.9% + $0.30 (Stripe, US card)
− Platform fee             KNOWN     $0 (Cloudflare Pages + Stripe, no subscription)
− Shipping subsidy         UNKNOWN
− Return cost              UNKNOWN
− Support cost             UNKNOWN
− Content cost allocation  UNKNOWN
− Acquisition cost         UNKNOWN
= Contribution profit      UNCOMPUTABLE
```

**Two of eleven line items are known — and both are the ones that were researched rather than assumed.** Contribution profit cannot be computed, which means §59's stop condition *"Unit Economics Unknown > 0"* is currently violated. **By this directive's own criteria, the project cannot be declared ready to sell.**

The single input that unlocks the most: **a supplier quotation.** It resolves production cost, material cost, MOQ, and lead time in one conversation, and price can then be set from evidence.

## 19. Technical Gaps

No code, no hosting, no CI, no data layer, no order system, no webhook handling, no idempotency, no observability. Architecture is proposed in `21_UX_PERFORMANCE_COST_AUDIT.md` §25 and extended in §26 below.

## 20. Operational Gaps

No runbook, no order handling procedure, no QC procedure, no packing standard, no customer support channel or SLA, no escalation path, no backup or recovery plan.

**At launch scale these are procedures a person follows, not software.** §2 explicitly permits temporarily manual operation. The requirement is that the procedure exists and is written down — not that it is automated.

## 21. Customer Experience Gaps

No support channel, no order visibility, no delivery estimate, no size confidence, no returns path, no post-purchase communication, no care guidance.

**Size confidence remains the highest-impact gap in fashion commerce** and is blocked on the same measurement data as everything else.

## 22. Brand Integrity Risks

All three directives converge on the same prohibitions, which is a strong signal they are the real constraint:

- No fabricated measurements, origins, handcraft claims, sustainability claims, or certifications
- No fake reviews or user content
- No false scarcity
- No unreviewed AI-generated content published at volume
- No production process depicted that does not occur

**For Olibana specifically this is commercial, not just ethical.** A new brand with no press, no stockists, and no reviews has no borrowed credibility. Its only trust asset is that its claims are verifiable — the Atlas method shown as genuine work with genuine measurements. **One invented number destroys the only credibility mechanism available**, and it cannot be rebuilt afterwards.

§39's Brand Integrity Engine — every generated artefact checked against Brand Bible, Character Bible, Fashion Specification, Design System, and Atlas rules — is adopted, and can only operate once the Fashion Specification exists.

## 23. Security Risks

At current scale, the largest security decision is architectural and already resolved: **hosted checkout means card data never touches Olibana infrastructure.** That removes the highest-severity category before any code is written.

Remaining, for when a system exists: secrets management, webhook signature verification, admin access control, rate limiting, audit trail, backup and recovery. None are urgent while nothing is deployed; all must precede first payment.

## 24. External Dependency Risks

| Provider | Purpose | Failure impact | Alternative | Lock-in |
| --- | --- | --- | --- | --- |
| Cloudflare Pages | Hosting | Site offline | Any static host — output is portable | **Low** |
| Stripe | Payment | No revenue | Other PSPs exist; migration is real work | Medium |
| Pinterest | Acquisition | Traffic to zero | Other channels — but none is currently developed | **High** |
| Supplier | Production | **Business stops** | None identified | **Critical** |
| Carrier | Delivery | No fulfilment | Alternatives exist | Medium |

**§58 금지 10 — do not make the whole business dependent on one external API — is currently violated twice**, and neither is a technical dependency: the supplier (no alternative identified) and Pinterest (no second channel developed).

Per §33, business-critical data — products, customers, orders, content, design specifications — stays in Olibana's own store, never solely inside a vendor's UI. The git-based content approach already satisfies this for content and specifications.

## 25. Architecture Problems

### Conflicts across the three master directives (§4 procedure applied)

| ID | Conflict | Resolution proposed |
| --- | --- | --- |
| **X1** | D1 §7 ranks Performance last; D2 §97/§75 rank decoration last | D1 decides *what exists*; D2 decides *what form it takes*. Accessibility, Core Web Vitals, comprehension are floors. *(from `21_…` §0)* |
| **X2** | D1 §9 slow cinematic opening vs D2 §81 three-second comprehension | Opening may not gate comprehension; motion layers over an already-readable page |
| **X3** | D1 §60 "Zero-Inventory Commerce" vs **D3 §6 do not blindly target zero inventory** | **D3 governs.** Goal is minimising pre-sale capital risk, not the number zero. Pre-order recommended; print-on-demand disqualified on brand grounds |
| **X4** | My MVP-0 (brand world first) vs **D3 §58 금지 1 / §57** | **D3 governs.** Revised to one product, complete loop — see §0 |
| **X5** | D1's extensive motion programme vs **D3 §62 failure outranks feature** | **D3 governs.** No motion work proceeds while a P0 business failure is open |
| **X6** | D2 §92 near-$0 vs D1's implied platform commerce | Already resolved in favour of $0 — and D3 §55 (automation ROI) reinforces it |

**X3, X4, and X5 are the ones that change the plan.** In each case the business directive outranks the experience directive, because a brand experience with no business behind it is the failure mode all three documents warn about.

### Structural problems

1. **The plan was ordered by what could be built rather than by what was blocking.** Corrected in §29.
2. **No traceability design.** Cannot be retrofitted after the first sale.
3. **No order state machine.** Designed in §27.
4. **No idempotency model.** Duplicate webhooks would double-charge or double-produce.

## 26. Proposed Architecture

```
BRAND / DESIGN LAYER  (git, low frequency, owner-controlled)
    Atlas measurements · Natural rules · Fashion Specification · Visual direction
                              │  stable IDs only
COMMERCE LAYER  (transactional, high frequency)
    Product · SKU · Variant · Price · Order · Payment · Fulfilment · Customer
                              │
OPERATIONS LAYER  (manual at launch, written procedures)
    Production request · QC · Packing · Shipping · Support · Returns
                              │
DATA LAYER  (identifiers threaded through every layer above)
    Signal → Product → Content → Campaign → Session → Cart → Order → Fulfilment → Feedback

Infrastructure:  Cloudflare Pages ($0) · Stripe hosted checkout ($0 fixed)
                 Content and specifications in git — Olibana owns its data (§33)
```

**Launch posture: manual operations, automated only where deterministic and safe.** §2 permits this explicitly. The system's job at launch is to record truthfully and never lose an order — not to run itself.

## 27. Proposed Closed Loop

### Order state machine (§23)

```
CREATED → PAID → PRODUCTION_PENDING → PRODUCTION → QC → PACKING
        → SHIPPED → IN_TRANSIT → DELIVERED
                                      ↓
                          RETURN_REQUESTED → RETURNED → REFUNDED

Terminal side-states:  CANCELLED · PAYMENT_FAILED · PRODUCTION_FAILED
```

Invalid transitions are rejected, not logged and permitted. Every transition records actor, timestamp, and reason.

### Failure recovery (§24) — business recovery, not just try/catch

| Failure | Recovery chain |
| --- | --- |
| Payment failed | Retry → alternate method → cart preserved → customer notified |
| Production failed | Retry → supplier escalation → alternative supplier → **customer notified with honest revised date** → refund or replacement offered |
| QC failed | Remake → revised date communicated → refund offered if beyond promised window |
| Shipment lost | Carrier claim → replacement or refund → customer informed before they have to ask |
| Duty refused at delivery | Return handling → refund minus stated costs, per published policy |

**The customer is informed before they need to ask.** For a brand whose persona is quiet confidence, proactive honesty about a delay is more on-brand than any animation.

### Idempotency and reliability (§30, §31)

- Every order mutation carries an idempotency key; duplicate webhooks are no-ops
- External calls: timeout, bounded retry with backoff, dead-letter queue, manual recovery path
- One production request per order, enforced by unique constraint — never by hoping the webhook fires once

### Kill switch (§29)

A single control halting all automated publishing, all outbound customer messaging, and all spend. Required before any automation is enabled, not after. At launch, when everything is manual, it is trivial to implement — which is the right time to build it.

### Loop closure test (§49)

> *Does data from the first sale actually improve the second product or content decision?*

Answerable only once identifiers thread end to end. **Designed before the first sale, because it cannot be reconstructed after.**

### Diagnostic logic (§27)

```
High save,  low click        → creative or CTA problem
High click, low product view → landing problem
High view,  low cart         → product, price, or trust problem
High cart,  low purchase     → checkout, shipping, or payment problem
High purchase, high return   → fit, quality, or expectation problem
```

Each pattern maps to a defined intervention, so data changes a decision rather than filling a dashboard.

## 28. MVP Boundary

### MVP-1P — one product, complete loop

**Ship condition: every node below is real. Not one of them is simulated.**

```
Product        1 garment, fully specified, sample approved
Supplier       identified, quoted, capacity confirmed
Economics      cost known → price set with positive contribution margin
Content        real photography of the actual garment
Site           home · the product · philosophy · nature · policies
Payment        Stripe hosted checkout, live
Order          state machine, idempotent, recorded
Production     written procedure, triggered by a paid order
Fulfilment     carrier chosen, rates known, tracking provided
Support        real contact channel with a stated response time
Legal          entity, privacy, terms, returns — reviewed
Data           identifier chain threaded end to end
```

**Excluded:** catalogue, search, wishlist, accounts, automation, AI generation, Pinterest publishing at scale.

### V1 — analytics, feedback, second product, measured Pinterest funnel
### V2 — AI-assisted discovery and content, experimentation, closed learning loop

**Automation is earned by a stable manual process.** §56.

## 29. Implementation Order

**Ordered by what unblocks the most, not by what is easiest to build.**

```
STEP 1   SUPPLIER          identify · quote · sample · confirm capacity     ← unblocks 5 P0 risks
STEP 2   FASHION SPEC      one garment, fully specified                     ← unblocks the product
STEP 3   UNIT ECONOMICS    cost known → price set → margin verified         ← unblocks the decision to sell
STEP 4   LEGAL             entity · policies · labelling                     ← unblocks lawful selling
STEP 5   ATLAS FIELD WORK  12 sessions                                       ← unblocks palette + /nature + Rule Layer
STEP 6   PHOTOGRAPHY       the actual garment                                ← unblocks the product page
STEP 7   BUILD             site · checkout · order system · data layer      ← the only engineering step
STEP 8   FAILURE INJECTION break it deliberately, verify recovery
STEP 9   E2E               one real purchase, start to finish
STEP 10  LOOP CLOSURE      confirm data reaches the next decision
```

**Steps 1–6 are not engineering.** Step 7 is the only one that is, and it is seventh. Any plan that starts at step 7 builds a machine with nothing to put in it — which is the exact failure §58 금지 1 describes.

**What can proceed in parallel right now, safely:** the data model, order state machine, and identifier design (§27), because they are pure design work that must precede the first sale and depend on none of the blocked inputs.

## 30. Acceptance Criteria

**Gate 0 — decisions**
- [ ] Owner approves the revised MVP (one product, complete loop) — §0
- [ ] Owner approves pre-order as the launch inventory model — §5
- [ ] Owner approves the six conflict resolutions in §25

**Gate 1 — business viability** *(none of this is code)*
- [ ] Supplier identified, quoted, sample approved
- [ ] Fashion Specification written for one garment
- [ ] Unit economics computed; contribution margin positive
- [ ] Legal entity and reviewed policies in place
- [ ] Carrier chosen; rates and duty treatment known

**Gate 2 — system**
- [ ] Order state machine implemented; invalid transitions rejected
- [ ] Idempotency verified against duplicate webhooks
- [ ] Every failure path has a defined business recovery
- [ ] Kill switch operational
- [ ] Identifier chain threaded end to end
- [ ] Failure injection passed for payment, production, shipping, and duplicate webhook

**Gate 3 — loop**
- [ ] One real end-to-end sale completed and delivered
- [ ] Customer outcome recorded
- [ ] Data from that sale demonstrably informs the next decision (§49)

**Stop condition (§59).** Completion is not declared while any of these is greater than zero: Critical risk, High risk, Unvalidated business assumption, Broken E2E flow, Broken recovery path, Unknown critical dependency, Data integrity failure, **Unit economics unknown**, Brand integrity failure.

> **All nine are currently greater than zero.** The project is at the beginning of the work this directive describes, and the honest thing to do is say so and start at step 1.
