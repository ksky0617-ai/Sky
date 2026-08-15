# RISK REGISTER

**Version:** v1.0 · **Date:** 2026-08-15
**Required by:** *Business / System / Autonomous Loop Failure Elimination* §44
**Scoring:** Risk Score = Probability (1–5) × Severity (1–5)
**Closure rule (§45):** a risk is `RESOLVED` only when cause identified **and** fix implemented **and** test passed **and** failure re-tested **and** evidence recorded. Nothing below meets that bar yet.

| Priority | Meaning | Open |
| --- | --- | :---: |
| **P0** | Business cannot operate | **6** |
| **P1** | Money, customer, or brand materially damaged | **7** |
| **P2** | Operational inefficiency or long-term erosion | **3** |

---

## P0 — Business cannot operate

### R-01 · No supplier
- **Domain:** Supply · **Probability:** 5 · **Severity:** 5 · **Score: 25**
- **Failure:** Nothing can be produced; no order could be honoured.
- **Cause:** No manufacturer identified, quoted, or contracted.
- **Impact:** Every downstream node is unreachable. Taking payment in this state would mean selling something that cannot be delivered.
- **Detection:** Trivially visible — no supplier record exists.
- **Prevention:** Do not open sales before a supplier is confirmed.
- **Mitigation:** Identify and quote at least two candidates; never a single source.
- **Recovery:** N/A until one exists.
- **Owner:** Brand owner · **Status:** `OPEN` · **Evidence:** No supplier documentation in repository

### R-02 · No Fashion Specification
- **Domain:** Product · **Probability:** 5 · **Severity:** 5 · **Score: 25**
- **Failure:** No garment can be specified for production, priced, or described truthfully.
- **Cause:** Document does not exist in either account repository.
- **Impact:** Blocks product page, size guidance, materials, care, and every Atlas→product connection — the brand's differentiator.
- **Detection:** Repository search, both repositories, all branches.
- **Prevention:** —
- **Mitigation:** Specify **one** garment completely rather than many partially.
- **Recovery:** —
- **Owner:** Brand owner · **Status:** `OPEN` · **Evidence:** `docs/website/01_SITE_AUDIT.md` §4

### R-03 · Unit economics unknown
- **Domain:** Financial · **Probability:** 5 · **Severity:** 5 · **Score: 25**
- **Failure:** Price may be set below true cost; solvency cannot be verified.
- **Cause:** 9 of 11 cost lines are UNKNOWN; no supplier quotation exists.
- **Impact:** Selling at a loss is indistinguishable from selling at a profit until it is too late to correct.
- **Detection:** `docs/business/UNIT_ECONOMICS.md` — contribution profit currently uncomputable.
- **Prevention:** Do not publish a price before cost is known.
- **Mitigation:** Supplier quotation resolves four unknowns at once.
- **Recovery:** Withdraw or reprice — expensive after launch, free before.
- **Owner:** Brand owner · **Status:** `OPEN` · **Evidence:** `docs/business/UNIT_ECONOMICS.md`

### R-04 · No legal entity or policies
- **Domain:** Legal · **Probability:** 5 · **Severity:** 5 · **Score: 25**
- **Failure:** Cannot lawfully take consumer payment in target markets.
- **Cause:** No company information, privacy policy, terms, or returns policy exists; none reviewed.
- **Impact:** Regulatory exposure; payment provider onboarding will require entity details regardless.
- **Detection:** No legal documentation in repository.
- **Prevention:** Policies reviewed by a qualified person before first payment. **AI does not finalise legal text.**
- **Mitigation:** Draft placeholders carry a visible `REQUIRES LEGAL REVIEW` banner and are never presented as final.
- **Recovery:** Suspend sales until resolved.
- **Owner:** Brand owner + legal adviser · **Status:** `OPEN` · **Evidence:** Repository contains no legal documents

### R-05 · No payment provider
- **Domain:** Commerce · **Probability:** 5 · **Severity:** 5 · **Score: 25**
- **Failure:** No revenue path exists.
- **Cause:** No provider account or integration.
- **Impact:** The loop cannot close at its most important node.
- **Detection:** Visible.
- **Prevention:** —
- **Mitigation:** Stripe hosted checkout — $0 fixed cost, no card data touches Olibana systems, satisfies "checkout must never be experimental".
- **Recovery:** Alternative PSPs exist; migration is real but bounded work.
- **Owner:** Brand owner · **Status:** `OPEN` · **Evidence:** `docs/website/21_UX_PERFORMANCE_COST_AUDIT.md` §19

### R-08 · Fabricated claim destroys brand credibility
- **Domain:** Brand · **Probability:** 3 · **Severity:** 5 · **Score: 15 → P0 by severity**
- **Failure:** An invented measurement, origin, handcraft claim, certification, or delivery promise is published.
- **Cause:** Structural pressure — empty Atlas rows, absent product data, and pages designed to display data that does not exist.
- **Impact:** **Unrecoverable.** Olibana has no press, no stockists, and no reviews. Its only trust asset is that its claims are verifiable. One invented number removes it permanently.
- **Detection:** QA honesty checklist on every page; components that render only from real data.
- **Prevention:** Honesty enforced structurally — the Rule Layer disables itself where no measurement exists, rather than relying on anyone to remember.
- **Mitigation:** Every published figure cites its source row.
- **Recovery:** Public correction. Trust does not fully return.
- **Owner:** Brand owner + build · **Status:** `OPEN — controls designed, not yet implemented` · **Evidence:** `docs/website/02_BRAND_EXPERIENCE_SYSTEM.md` §7

---

## P1 — Material damage to money, customer, or brand

### R-06 · Cross-border duty and VAT surprise the customer
- **Domain:** Commerce/Legal · **P:** 4 · **S:** 4 · **Score: 16**
- **Failure:** Customer receives an unexpected bill at delivery, refuses the parcel, or demands refund.
- **Cause:** Duty and import VAT treatment undefined for a Japan-origin global shipper.
- **Detection:** Refusal rate, delivery-stage complaints.
- **Prevention:** State the duty position **before** payment; consider DDP where feasible.
- **Mitigation:** Restrict launch to markets whose treatment is confirmed.
- **Recovery:** Published policy covering refused parcels.
- **Owner:** Brand owner + tax adviser · **Status:** `OPEN`

### R-07 · No returns policy or returns logistics
- **Domain:** Operations/Legal · **P:** 5 · **S:** 4 · **Score: 20**
- **Failure:** No lawful, workable path for a customer to return a garment.
- **Cause:** Policy undefined; return address and logistics unarranged. Withdrawal rights differ across EU, KR, and JP.
- **Prevention:** Policy defined and reviewed before first sale.
- **Mitigation:** Return cost on cross-border may approach item value — model this before setting price.
- **Owner:** Brand owner · **Status:** `OPEN`

### R-09 · Pinterest account loss removes the whole acquisition channel
- **Domain:** Acquisition · **P:** 3 · **S:** 5 · **Score: 15**
- **Failure:** Automated or duplicative publishing triggers spam detection; account suspended.
- **Cause:** Sole reliance on one platform, plus automation pressure.
- **Prevention:** Human-approved publishing until the loop is proven; no bulk automation.
- **Mitigation:** **Develop a second channel before depending on the first.** Currently violates "do not make the business dependent on one external API".
- **Recovery:** No recovery for a banned account — only prevention.
- **Owner:** Brand owner · **Status:** `OPEN`

### R-10 · Pre-order lead time causes cancellations
- **Domain:** Operations · **P:** 4 · **S:** 3 · **Score: 12**
- **Failure:** Customers cancel or charge back during a long production wait.
- **Cause:** Pre-order model inherently separates payment from delivery.
- **Prevention:** State the production window **before** payment, prominently — not in terms.
- **Mitigation:** Proactive progress updates at each state transition.
- **Recovery:** Clear cancellation terms honoured without argument.
- **Owner:** Brand owner · **Status:** `OPEN`

### R-11 · No traceability — learning loop cannot close
- **Domain:** Data · **P:** 5 · **S:** 3 · **Score: 15**
- **Failure:** Cannot connect a sale back to the signal, content, or product decision that produced it.
- **Cause:** No identifier chain designed.
- **Impact:** **Cannot be retrofitted.** Data not captured at the first sale is gone.
- **Prevention:** Design the chain before the first sale — this is unblocked work that can start now.
- **Owner:** Build · **Status:** `OPEN — designable immediately`

### R-12 · Sample-to-production quality drift
- **Domain:** Quality · **P:** 3 · **S:** 4 · **Score: 12**
- **Failure:** Delivered garments differ from the approved sample.
- **Cause:** No QC gate or acceptance standard defined.
- **Prevention:** Written acceptance criteria; approved sample retained as reference.
- **Recovery:** Remake, honest revised date, refund if beyond the promised window.
- **Owner:** Brand owner · **Status:** `OPEN`

### R-13 · Single points of external dependency
- **Domain:** Technical/Business · **P:** 3 · **S:** 4 · **Score: 12**
- **Failure:** One provider's outage or policy change halts the business.
- **Cause:** Supplier (no alternative), Pinterest (no second channel), payment (migration cost).
- **Prevention:** Two supplier candidates; a second acquisition channel; business data kept in Olibana's own store, never only in a vendor UI.
- **Mitigation:** Hosting is genuinely portable — static output moves to any host.
- **Owner:** Brand owner · **Status:** `OPEN`

---

## P2 — Efficiency and long-term erosion

### R-14 · SKU proliferation dilutes identity
- **Domain:** Brand · **P:** 3 · **S:** 3 · **Score: 9**
- **Failure:** Catalogue growth mistaken for brand growth; identity weakens, perceived value falls.
- **Prevention:** Every product passes the brand gate. Range growth is a deliberate decision, never a default.
- **Owner:** Brand owner · **Status:** `OPEN`

### R-15 · Template sameness across product content
- **Domain:** Brand/Content · **P:** 3 · **S:** 2 · **Score: 6**
- **Failure:** Every product page reads identically; editorial value collapses.
- **Prevention:** Each product's natural rule is genuinely different — if the copy is interchangeable, the design rule was never applied.
- **Owner:** Brand owner · **Status:** `OPEN`

### R-16 · Atlas measurement never happens
- **Domain:** Brand · **P:** 3 · **S:** 4 · **Score: 12 → held at P2 (no immediate operational harm)**
- **Failure:** The differentiator stays theoretical; `/nature` remains a description of method, the Rule Layer never activates, and the palette cannot be derived as chosen.
- **Cause:** Field work is easy to defer indefinitely because nothing breaks when it slips.
- **Prevention:** 12 sessions defined concretely in `docs/website/05_VISUAL_SYSTEM.md` §8 — one effort unblocks palette, `/nature`, and the Rule Layer together.
- **Owner:** Brand owner · **Status:** `OPEN`

---

## Summary

```
P0 open   6     ← business cannot operate
P1 open   7
P2 open   3
Resolved  0

Stop condition (§59): ALL NINE CONDITIONS CURRENTLY VIOLATED
```

**Highest-leverage single action: obtain a supplier quotation.** It closes or substantially reduces R-01, R-03, and R-12, and provides the input required to price the product and compute margin.
