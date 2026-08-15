# OLIBANA — UX / PERFORMANCE / DESIGN / COST AUDIT

**Document:** `21_UX_PERFORMANCE_COST_AUDIT.md`
**Version:** v1.0
**Date:** 2026-08-15
**Responds to:** *Zero-Cost / Cognitive-UX / Performance / Design-System Master Optimization Prompt* (「ブラッシュアップ」, 50 pp.)
**Format:** per that document's §99
**Status:** Analysis and design only. No implementation code (§98).

> **Read `01_SITE_AUDIT.md` first.** Sections 1–12 below would otherwise repeat it. They are kept brief and cross-referenced; the substance of this document is §13 onward, which is new.

---

## 0. The Finding That Governs Everything Else

The two master directives issued for this project **give conflicting priority orders.** This must be resolved before any code is written, because nearly every design decision resolves differently depending on which order applies.

```
DIRECTIVE 1 (Immersive Animated Commerce) §7
  Brand Integrity > Visual Experience > Usability > Commerce > Performance

DIRECTIVE 2 (Zero-Cost / Cognitive-UX) §97
  Remove > Simplify > Clarify > Optimize > Enhance > Decorate

DIRECTIVE 2 §75
  Correctness > Reliability > Performance > Accessibility > Maintainability > Cost > DX > Novelty
```

Directive 1 places Performance last. Directive 2 places Enhancement and Decoration last. Applied literally to the same screen, they produce opposite outcomes.

### Concrete collisions

| # | Directive 1 requires | Directive 2 requires | Collision |
| --- | --- | --- | --- |
| C1 | §9: Home opens dark, light *gradually* enters, form emerges, then OLIBANA | §81: a first-time visitor understands what this is and what it sells within ~3 seconds | A slow cinematic reveal **is** a comprehension delay |
| C2 | §11: cinematic hero, slow zoom, fabric movement, cursor-reactive | §89: premium must not be expressed through large video or heavy animation | Directly opposed means to the same end |
| C3 | §7: Performance ranks last | §35: performance budget breach fails CI | One treats performance as a residual, the other as a gate |
| C4 | §50: page transitions morph through texture | §30/§41: minimise JavaScript, prefer native browser capability | Morph transitions are the expensive kind |
| C5 | §15/§24: rich Natural Rule and Atlas storytelling on product pages | §47/§49: the product page is a decision-compression system; do not bury price, size, shipping, returns | Competition for the same vertical space |
| C6 | §70: Shopify-class commerce infrastructure implied | §92: near-$0 recurring cost | ~$468/yr fixed vs. $0 fixed |

### Proposed resolution

These are reconcilable, but only by separating two questions that both directives conflate:

> **Directive 1 decides *what exists*. Directive 2 decides *what form it takes*.**
>
> Brand integrity governs whether an element belongs in Olibana at all — that is a brand question and Directive 1 owns it.
> Once an element is judged to belong, Directive 2's ladder governs its implementation: remove what is not needed, simplify what remains, clarify it, make it fast, and only then enhance and decorate.

And three floors are **not tradeable by either directive**, because both state them independently:

```
1. Accessibility        D1 §42  ·  D2 §22   — never an "additional feature"
2. Core Web Vitals      D1 §41  ·  D2 §34   — LCP/INP/CLS are gates, not aspirations
3. Comprehension        D1 §76  ·  D2 §81   — beauty that obscures the offer is failure in both
```

Applied to C1 — the sharpest collision — the resolution is specific and buildable:

> The opening sequence **may not gate comprehension.** Brand name, statement, and navigation are present in the DOM and painted immediately. The light-emergence plays *over* an already-comprehensible page, not *before* it. It is skippable, it does not replay for returning visitors, and it is absent entirely under reduced motion. The visitor who reads and leaves in three seconds got the message; the visitor who stays gets the atmosphere.

**This resolution needs owner confirmation** — it is recorded in §31 as the first acceptance item.

---

## 1. Current Architecture

None. Repository contains 14 markdown documents and zero code. No framework, no build, no hosting, no CI. See `01_SITE_AUDIT.md` §1, §6.

Consequence for this directive: §31 ("audit the existing framework before adopting a new one") and §74 (dependency audit) have **no legacy to audit**. Every dependency admitted from here on is a deliberate act, and the near-zero-dependency target of §40 is achievable in a way it never is on an existing codebase. This is the single largest advantage the project currently holds.

## 2. Current UI

None.

## 3. Current Design System

`Design_System.md` is an *evaluation* system — criteria, checklist, metrics, workflow. It contains no tokens. Token architecture now exists in `05_VISUAL_SYSTEM.md`, with all brand colour values deliberately deferred pending field measurement (owner decision). See §26 below for how Directive 2's requirements fold into it.

## 4. Current Components

None. Component architecture is unwritten (`09_COMPONENT_ARCHITECTURE.md` pending).

## 5. Current Assets

Zero bytes. No image, video, font, icon, or 3D asset exists. See `01_SITE_AUDIT.md` §8.

This is the binding constraint on Directive 2's §13–§17 (image and video pipelines): there is a pipeline to design but nothing yet to put through it.

## 6. Current Typography

No typeface is specified in any brand document. Selection criteria are recorded in `05_VISUAL_SYSTEM.md` §5; the choice itself requires an owner decision and a licence budget.

Directive 2 §19 (subset, WOFF2, `font-display`, preload) and §20 (do not abuse low contrast, tiny text, or excessive letter-spacing in the name of luxury) are adopted into that document — see §26.

## 7. Current Motion

No implementation. The motion grammar is specified in `04_MOTION_LANGUAGE.md`: five tokens, each citing an Atlas source, each marked `provisional` because it derives from qualitative observation rather than field measurement.

Directive 2 §10–§12 largely **confirms** that specification — purpose-bound motion, per-page budgets, reduced-motion support. Its §11 adds a requirement not previously captured: each motion must record **GPU cost, CPU cost, mobile impact, and accessibility impact**. Adopted into the motion gate (§26 below).

## 8. Current Performance

Nothing to measure. Budgets are defined in `01_SITE_AUDIT.md` §15.5 and tightened in §28 below.

Directive 2 §35 adds the requirement that breaching a budget **fails CI**. This is a meaningful upgrade: a budget nobody enforces is a preference. Adopted.

## 9. Current Accessibility

Nothing built. Requirements are stated across both directives and are consistent. `14_ACCESSIBILITY_SPEC.md` is pending.

## 10. Current Commerce UX

None, and — more importantly — no products, no measurements, no prices, no payment provider, no carrier, no returns policy. See `01_SITE_AUDIT.md` §7. MVP-0 contains no commerce at all.

## 11. Current Mobile UX

Nothing built. Both directives require mobile to be a distinct interaction hierarchy rather than a scaled-down desktop (D1 §40, D2 §45–§46).

## 12. Current Pinterest Journey

**None — and this is a genuinely new requirement introduced by Directive 2.**

Directive 2 §58 and §80 make Pinterest the assumed primary acquisition channel:

```
Pinterest → Olibana → comprehension within 3s → product discovery → trust → purchase
```

Nothing in the existing documentation addresses this, and it has real consequences:

- **A Pinterest visitor arrives with intent to see a *thing*.** They clicked an image. Landing them on a philosophy page is a mismatch, however beautiful.
- **MVP-0 has no products.** Pinterest traffic driven to a product-less site converts at zero and teaches the algorithm that Olibana pins do not satisfy. **Recommendation: do not drive Pinterest acquisition until MVP-1.** Pinning during MVP-0 should be limited to Atlas and research imagery pointing at `/nature` and `/journal`, where the content genuinely matches the pin.
- Pin images must carry Olibana's visual language while working as thumbnails at ~236 px wide — a constraint that conflicts with quiet, low-contrast composition and needs to be designed for deliberately, not discovered later.

---

## 13. Cognitive Load Map

Directive 2 §2 correctly narrows the target to **extraneous** load. Since no site exists, this is a **design-time predictive model**, not a measurement — stated plainly here because §63 forbids dressing assertion as evidence. Each entry becomes a hypothesis to validate once there is something to test.

| Surface | Intrinsic (keep) | Germane (keep) | **Extraneous (eliminate)** |
| --- | --- | --- | --- |
| Home | What Olibana sells | Nature-as-structure premise | Decoding an abstract opening; unclear next action; nav that hides its own scope |
| Nature/Atlas | Observation → rule | Rule ↔ garment link | Method exposition with no visible outcome; measurement jargon without translation |
| Collection | Range, price band | Collection's natural source | Filters that overwhelm; grid that hides count; unclear sort state |
| Product | Price, size, material, delivery | Why this form exists | Natural Rule pushed above price; size guide requiring navigation away; hidden shipping cost |
| Cart | Line items, total | — | Total that changes at checkout; unclear removal; hidden shipping estimate |
| Checkout | Required fields only | — | Optional fields presented as required; account creation friction; late fee reveal; ambiguous errors |

### The load hotspot

**The product page is where the two directives fight for the same vertical space** (collision C5). Directive 1 wants the Natural Rule to be the page's differentiator; Directive 2 requires price, size, material, shipping, and returns to be immediately findable.

Resolution: **the decision layer precedes the meaning layer.** Everything needed to decide sits above the fold and never moves below it. The Natural Rule sits directly beneath — first in the narrative section, not buried at the bottom — and the Rule Layer toggle offers it in-place for visitors who want it without costing the others a single scroll. Neither directive loses.

## 14. Abandonment Map

Per Directive 2 §52. Predictive, ranked by expected impact for a new fashion brand with no reputation.

| Exit point | Cause | Detection | Intervention | Metric |
| --- | --- | --- | --- | --- |
| Landing, < 5 s | No comprehension of what is sold | Bounce with low scroll depth | 3-second test enforced (§81); static-first hero | Bounce, scroll depth |
| Landing | Slow first paint | LCP RUM | Static first frame; motion after LCP | LCP p75 |
| Product | **Size uncertainty** | Size-guide opens without add-to-cart | Measurements on-page; model height/size; in-place guide | Guide-open → ATC rate |
| Product | Price shock | Exit at price view | Price visible without interaction; no reveal-on-hover | Exit rate at PDP |
| Cart | **Shipping shock** | Cart → checkout drop | Shipping estimate in cart, before checkout | Cart → checkout rate |
| Checkout | Forced account | Exit at account step | Guest checkout default | Step completion |
| Checkout | Payment failure | Failed intent | Error copy per §26 form: what/why/next | Recovery rate |
| Any | **Trust failure** — no company info, no policy, no evidence of a real brand | High exit, low return | Company info, contact, honest policies; **no fabricated signals** | Return-visit rate |

**Trust is the dominant risk for Olibana specifically.** A new brand with no press, no stockists, and no reviews has no borrowed credibility. Directive 2 §50 asks *"Is this real?"* — and Olibana's honest answer today is *"new, and not hiding it."* The Atlas method, shown as genuine work with genuine measurements, is the strongest trust asset available. **A fabricated measurement would destroy the only credibility mechanism the brand has.** This is why the honesty prohibitions are commercial policy, not just ethics.

Directive 2 §53 is adopted without qualification: no dark patterns, no exit-intent popups, no fake scarcity, no countdowns. The goal is removing reasons to leave.

## 15. UX Failure Tree

```
PURCHASE DOES NOT HAPPEN
├── Visitor never understood the brand
│   ├── Opening sequence gated comprehension          → C1 resolution (§0)
│   ├── Copy abstract where it needed to be concrete  → Character Bible web voice
│   └── Nav concealed the site's scope                → route-manifest nav (03 §4)
├── Visitor understood but found nothing to buy
│   ├── No products exist                             → MVP-0 reality; do not drive paid/Pinterest traffic
│   └── Discovery path unclear                        → primary action per screen (D2 §4)
├── Visitor found a product but could not decide
│   ├── Size uncertainty                              → measurements required (BLOCKED: data)
│   ├── Material unclear                              → material spec (BLOCKED: data)
│   ├── Fit on body unclear                           → on-body imagery (BLOCKED: assets)
│   └── Meaning buried the facts                      → decision layer above meaning layer (§13)
├── Visitor decided but did not complete
│   ├── Shipping cost revealed late                   → estimate in cart
│   ├── Account forced                                → guest checkout
│   └── Payment error unrecoverable                   → what/why/next error copy
└── Visitor completed but did not return
    ├── No confirmation clarity                       → facts before feeling (D1 §21)
    ├── No order visibility                           → tracking (BLOCKED: fulfilment)
    └── No reason to return                           → Journal, new collection
```

Four of the five branches terminate in **blocked on data or assets, not on engineering.** This is the same conclusion `01_SITE_AUDIT.md` reached from a different direction, and it should determine where effort goes next.

## 16. Performance Failure Tree

```
CORE WEB VITALS FAIL
├── LCP
│   ├── Hero video/animation on critical path        → static first frame, mandatory
│   ├── Unoptimised hero image                       → AVIF/WebP, responsive, ≤400 KB
│   ├── Font blocking render                         → subset, preload, font-display: swap
│   └── Slow TTFB                                    → static/pre-rendered, edge-served
├── INP
│   ├── Scroll event handlers                        → CSS scroll-driven / IntersectionObserver
│   ├── Main-thread animation                        → transform/opacity only
│   ├── Heavy hydration                              → static-first, minimal JS islands
│   └── Third-party scripts                          → strict budget, deferred, non-blocking
├── CLS
│   ├── Images without dimensions                    → explicit width/height always
│   ├── Late-loading fonts                           → metric-compatible fallback
│   └── Content injected after paint                 → reserve space
└── Transfer weight
    ├── Motion library in initial bundle             → route-level dynamic import
    ├── Full-quality images at all breakpoints       → responsive srcset
    └── Unused CSS/JS                                → no framework not paying for itself
```

## 17. Dependency Audit

Nothing is installed, so this is a **budget rather than a review** — the more valuable form, since it is set before the first `install`.

| Need | Native capability first (D2 §41) | Library only if |
| --- | --- | --- |
| Scroll-linked motion | CSS scroll-driven animations, `IntersectionObserver` | Firefox parity genuinely required for a key surface |
| Page transitions | View Transitions API | Cross-browser continuity is essential to the experience |
| Modal / drawer | `<dialog>`, popover | Focus management proves insufficient |
| Accordion | `<details>` / `<summary>` | Animation requirements exceed native |
| Forms / validation | Constraint Validation API | Complex multi-step state |
| Image optimisation | Build-time pipeline | — |
| Carousel | CSS scroll-snap | — |
| Date / i18n formatting | `Intl` | Never |
| State | URL, `<form>`, server | Genuine client state exists |

**Admission rule (D2 §39, §40, §93):** every dependency records purpose, why native cannot serve, bundle cost, licence, last release, open security advisories, and an exit path. Preference goes to the smallest sufficient dependency surface, never the most featureful library. Dead projects are not adopted — activity is verified at adoption time, not assumed from popularity.

## 18. OSS Opportunities

| Function | Direction | Note |
| --- | --- | --- |
| Hosting | Static hosting on a free tier | §19 |
| Image pipeline | `sharp` at build time | Build-time only; nothing ships to the client |
| Analytics | Self-hosted or privacy-first, cookieless | Must not block commerce if it fails (D2 §37) |
| Search | Client-side index for a small catalogue | A hosted search service is unjustifiable at this catalogue size |
| CMS | Git-based or self-hosted headless | Content in the repository costs nothing and versions naturally |
| E2E / a11y / visual regression | Playwright + axe-core | Playwright is already installed in this environment |
| Performance CI | Lighthouse CI | Enforces §35 |

**A git-based CMS deserves particular consideration.** Olibana's content — Atlas entries, journal articles, materials, policies — is low-frequency, versioned, and reviewed. That is exactly what git already does well, at zero cost, with full history. A hosted CMS would be a recurring bill for capabilities the repository already provides. The trade-off is editing convenience for a non-technical owner, which is a real cost and should decide the question honestly rather than be dismissed.

## 19. Free / Near-$0 Architecture

**This section revises the commerce recommendation in `01_SITE_AUDIT.md` §15.4.** That recommendation was made before Directive 2's cost constraint was known, and it does not survive it unchanged.

### Verified costs (August 2026)

| Component | Free tier | Notes |
| --- | --- | --- |
| **Cloudflare Pages** | **$0, unmetered bandwidth** | Strongest fit for an asset-heavy static front end |
| Cloudflare Workers | 100k requests/day | Sufficient well past early traffic |
| Cloudflare R2 | 10 GB storage, 1M ops/month | Image and video hosting |
| Cloudflare D1 | 5 GB, 5M reads/month | Where a database is genuinely needed |
| **Stripe** | **$0/month**, 2.9% + 30¢ per US card charge | No monthly fee, no PCI fee, no termination fee |
| **Shopify Basic** | **~$39/month** + 2.9% + 30¢ | Plus a **2% surcharge** on Basic if a third-party processor is used instead of Shopify Payments |

### The comparison that matters

```
Cloudflare Pages + Stripe Checkout
    Fixed cost:        $0 / year
    Variable:          2.9% + 30¢ per sale
    Cost before first sale:   $0

Shopify Basic (headless)
    Fixed cost:        ~$468 / year
    Variable:          2.9% + 30¢ per sale (Shopify Payments)
    Cost before first sale:   $468
```

For a brand that currently has **no products and no revenue**, the Shopify path bills roughly $468 before a single garment is sold.

### Revised recommendation

> **Withdraw the earlier Shopify Headless recommendation for the launch stage.**
>
> **MVP-0:** Cloudflare Pages, static, $0. No payment provider needed — there is nothing to sell.
> **MVP-1:** Stripe Checkout, hosted. $0 fixed, per-transaction only. Stripe's hosted checkout also satisfies D1 §20 ("never make checkout experimental") *better* than a custom build, because it is a maintained, trusted, PCI-handled surface that Olibana does not have to secure.
> **Later:** migrate to Shopify or a self-hosted platform **when order volume makes the operational burden — tax, returns, inventory, customer accounts — cost more in time than the subscription costs in money.** That is a real threshold, and it should be crossed on evidence rather than anticipation.

The earlier reasoning was not wrong on its merits — Shopify does remove genuine operational burden. It was answering a question asked without a cost constraint. With §92 applied, near-$0 wins clearly at this stage, and the migration path stays open because the data layers are kept separate (`01_SITE_AUDIT.md` §15.3).

**Caveat, stated because §38 requires it:** cost minimisation must not reduce security or reliability. Stripe-hosted checkout satisfies this — payment data never touches Olibana infrastructure. A self-built payment form to save fees would violate it, and is excluded.

### Cost gate (D2 §92)

| Line | MVP-0 | MVP-1 target |
| --- | --- | --- |
| Hosting | $0 | $0 |
| CDN / bandwidth | $0 | $0 |
| Storage | $0 | $0 |
| Database | $0 | $0 |
| Payments | — | per-transaction only |
| Analytics | $0 | $0 |
| Email | $0 tier | $0 tier |
| CMS | $0 (git-based) | $0 |
| **Fixed recurring** | **$0** | **$0** |

## 20. Research Gaps

Directive 2 §62 requires a cognitive-UX knowledge base; §63 sets the evidentiary bar: primary research, meta-analyses, systematic reviews, peer-reviewed work, established standards, official documentation — **not UX blogs or viral threads.**

**Honest statement of what that costs.** Twenty-one topics researched to that standard is substantial scholarly work. It cannot be produced quickly, and producing it quickly would mean citing half-remembered claims — precisely what §63 prohibits. Attempting it that way would be the worst possible outcome, because a knowledge base full of confident, unverifiable assertions is more damaging than none.

Proposed handling, by evidentiary confidence:

| Tier | Topics | Approach |
| --- | --- | --- |
| **Verifiable against standards/specs** | WCAG criteria, Core Web Vitals thresholds, browser API behaviour, `prefers-reduced-motion` semantics | Cite the standard directly. Safe to write now. |
| **Well-established, primary source identifiable** | Hick's Law, Fitts's Law, cognitive load theory, serial position, Von Restorff, peak-end | Cite original literature; state scope conditions and **known limits of applicability** (§62 requires "when *not* applicable") |
| **Contested or context-dependent** | Processing fluency, trust formation, decision fatigue, information scent | Write only with real sources; mark contested where contested |
| **Marketing folklore** | Any "law" traceable only to design blogs | **Excluded.** §62 warns against applying UX laws decoratively. |

**Recommendation:** build `docs/knowledge/` with the structure of §65 and populate it **incrementally, one properly-sourced topic at a time**, each entry carrying Definition / Evidence / When applicable / **When not applicable** / Olibana application / Measurement. An empty, honestly-structured knowledge base is better than a full, unsourced one.

**This is a scope decision for the owner** — it is real research effort, and it competes directly with building the site.

## 21. Highest-Impact Improvements

Ranked by impact per unit of effort, given the project's actual state.

| # | Action | Why it ranks here |
| --- | --- | --- |
| 1 | **Resolve the directive conflict (§0)** | Every subsequent decision depends on it. Costs one conversation. |
| 2 | **Field measurement: 12 Atlas sessions** | Simultaneously unblocks the palette, the `/nature` pages, and the Rule Layer. One effort, three unlocks. |
| 3 | **Define the Fashion Specification** | Unblocks the entire product page, size/fit, materials, and every Atlas→product connection |
| 4 | **Adopt the $0 architecture** | Removes ~$468/yr of pre-revenue cost; decision costs nothing |
| 5 | **Hero asset** | The only remaining blocker on MVP-0 launch |
| 6 | **Performance budget in CI** | Prevents regression permanently, cheaply, before there is anything to regress |
| 7 | **Product photography** | Gates MVP-1 entirely |

Items 2, 3, 5, and 7 are **not engineering work.** The critical path for this project runs through field research, garment definition, and photography — not through code. Any plan that schedules engineering first will produce a finished machine with nothing to put in it.

## 22. P0 Fixes

*Blocking — must be settled before implementation begins.*

- [ ] **P0-1** Owner confirms the §0 priority resolution
- [ ] **P0-2** Owner confirms the $0 architecture (supersedes the earlier Shopify recommendation)
- [ ] **P0-3** Comprehension is never gated by the opening sequence (C1)
- [ ] **P0-4** Performance budgets wired to CI failure before the first feature merges
- [ ] **P0-5** Accessibility floor fixed as non-negotiable in both directives
- [ ] **P0-6** No Pinterest acquisition push until MVP-1 has products

## 23. P1 Fixes

*Required before MVP-0 ships.*

- [ ] Static-first architecture; no framework admitted that does not pay for itself
- [ ] Hero: static first frame; motion attaches after LCP
- [ ] Every image with explicit dimensions and a declared focal point
- [ ] Fonts subset, WOFF2, preloaded, `font-display: swap`, self-hosted
- [ ] Full state coverage: loading, empty, error, offline, 404 (D1 §59, D2 §27)
- [ ] Error copy in what / why / what-next form (D2 §26)
- [ ] Third-party failure never blocks core content (D2 §37)
- [ ] Reduced-motion variants defined per token
- [ ] Skeletons mirror real content structure (D2 §28)
- [ ] Design decision log established (D2 §66)

## 24. P2 Fixes

*MVP-1 and beyond.*

- [ ] Product media ordered for decision-making, not aesthetics (D2 §48)
- [ ] Size guide openable in place on the product page
- [ ] Shipping estimate visible in cart, before checkout
- [ ] Guest checkout default
- [ ] Search with material / colour / collection / **natural-rule** intent
- [ ] Visual and performance regression baselines
- [ ] Pinterest landing flow, once products exist
- [ ] Knowledge base populated incrementally to the §63 standard

## 25. Proposed Architecture

```
Static-first, edge-served, zero fixed cost

  Content (git)  ──build──▶  Static pages  ──▶  Cloudflare Pages ($0)
                                                      │
                              Images (build-time sharp) ──▶ R2 ($0 tier)
                                                      │
                              Islands of JS, route-level, only where needed
                                                      │
                              MVP-1: Stripe Checkout (hosted, $0 fixed)

  Principles
    · HTML and CSS first; JavaScript only where it earns its weight (D2 §30)
    · Pre-rendered wherever possible; dynamic only on proven need (D2 §32)
    · Native browser capability before any library (D2 §41)
    · Third-party failure never breaks core content (D2 §37)
    · Brand layer and commerce layer stay separate (D1 §61)
```

## 26. Proposed Design System

Extends `05_VISUAL_SYSTEM.md` with Directive 2's additions:

- **Semantic colour roles** (§21) — already covered; `state.warning` added to the role set
- **Typography hierarchy** (§18) — Display, H1–H3, Body, Small, Caption, Button, Label, Navigation, **Price**, Metadata, each with font, weight, size, line-height, letter-spacing, and max width. `Price` as a first-class typographic role is a genuinely useful addition for a commerce brand and is adopted.
- **Type legibility floor** (§20) — the persona's restraint may **not** be expressed through low contrast, undersized text, or excessive letter-spacing. This is an explicit guard against a failure mode this brand is unusually prone to.
- **Button system** (§23) — Primary, Secondary, Tertiary, Text, Icon, Destructive × default, hover, focus, pressed, disabled, loading, success, error
- **CTA copy** (§24) — concrete over abstract. Worth noting a genuine tension with the quiet persona: `Discover` reads as brand-appropriate but tells the visitor nothing. **Resolution: the label states the destination or outcome** (`View Collection`, `Add to Bag`, `Open Size Guide`). Quietness lives in typography and restraint, never in vagueness — a confident brand is precise about what a button does.
- **Motion token metadata** (§11) — each token additionally records GPU cost, CPU cost, mobile impact, and accessibility impact
- **Spacing** — the existing 8 px scale already matches §44's proposed progression

## 27. Proposed Component System

Per §42: components are separated when reusable, stable, semantically coherent, and independently testable — **never merely because a file grew long.**

```
primitives/    Text · Box · Stack · Grid · Image · Link · Button · Field · Dialog
patterns/      Nav · Footer · Card · Gallery · Accordion · Drawer · Toast · SkipLink
states/        Loading · Empty · Error · Offline · SoldOut
brand/         RuleLayer · AtlasOverlay · LightState · MotionProvider
commerce/      PriceDisplay · SizeSelector · SizeGuide · CartLine · Checkout*   (MVP-1)
```

Every component ships with its loading, empty, and error states — not as a later pass. Both directives require full state coverage, and states retrofitted after the happy path are the states that get skipped.

## 28. Proposed Performance Budget

| Metric | Budget | Enforcement |
| --- | --- | --- |
| LCP (mobile, 4G, p75) | ≤ 2.5 s | CI fail |
| INP (p75) | ≤ 200 ms | CI fail |
| CLS | ≤ 0.1 | CI fail |
| Initial JS (gzip) | ≤ 100 KB | CI fail — tightened from the earlier 150 KB, given static-first |
| Initial CSS | ≤ 30 KB | CI fail |
| Hero initial payload | ≤ 400 KB | CI fail |
| Fonts, initial | ≤ 100 KB | CI fail |
| Total initial transfer | ≤ 800 KB | CI warn |
| Third-party scripts | **0 blocking** | CI fail |

Every breach must answer *why* (§73), and the response order is Remove → Reduce → Defer → Replace before any budget is raised.

## 29. Proposed UX Measurement System

| Layer | Measures |
| --- | --- |
| Comprehension | 3-second test, 5-second action test (§81, §82) |
| Behaviour | Scroll depth, primary-action rate, size-guide open → ATC |
| Commerce | View → ATC, ATC → checkout, checkout → purchase, per-step drop |
| Performance | RUM: LCP, INP, CLS, TTFB |
| Quality | Design Review Score, ten dimensions (§72) — **any critical failure rejects, regardless of average** |
| Learning | Design decision log (§66): problem → evidence → hypothesis → decision → expected effect → metric → result |

Analytics must be cookieless where possible and must never block commerce if it fails (§37, §60).

## 30. Implementation Order

```
NOW (blocking, non-engineering)
  P0 decisions · 12 Atlas field sessions · Fashion Specification · hero asset

PHASE A — foundation, no external input required
  Repository scaffold · tokens (values deferred) · motion system
  CI: typecheck, lint, a11y, Lighthouse budgets
  Layout, navigation, full state coverage, 404

PHASE B — MVP-0 launch
  Home · Nature · Philosophy · Design Language · Journal · Contact
  SEO, structured data, analytics, accessibility audit
  Deploy to Cloudflare Pages · $0

PHASE C — MVP-1, gated on products
  Shop · Product · Fit & Size · Cart · Stripe Checkout · Confirmation
  Support and policy pages · Pinterest landing flow
  E2E purchase test · visual and performance regression baselines

CONTINUOUS (D2 §96)
  AUDIT → RESEARCH → HYPOTHESIS → DESIGN → IMPLEMENT → MEASURE
        → BREAK → FIX → VERIFY → REGRESSION → RE-AUDIT
```

## 31. Acceptance Criteria

**Gate 0 — decisions**
- [ ] §0 priority resolution confirmed by owner
- [ ] $0 architecture confirmed; Shopify recommendation formally superseded
- [ ] Knowledge-base scope agreed (incremental, §63 standard)

**Gate 1 — MVP-0**
- [ ] 3-second and 5-second tests pass on Home
- [ ] Comprehension never gated by motion
- [ ] All performance budgets green in CI
- [ ] WCAG AA verified; keyboard-complete
- [ ] Every route has loading, empty, error, offline states
- [ ] Fully functional with JavaScript disabled (D2 §87)
- [ ] Fully functional with motion disabled
- [ ] Zero fixed recurring cost
- [ ] Zero blocking third-party scripts
- [ ] No fabricated data anywhere on the site

**Gate 2 — MVP-1**
- [ ] Product page answers all ten questions of D1 §77
- [ ] Size guide opens in place
- [ ] No unexpected cost after cart
- [ ] Guest checkout works
- [ ] End-to-end purchase verified against a real payment provider
- [ ] Recovery paths verified: 404, payment error, sold out, network error, expired session, back button, refresh

**Stop condition (D2 §95).** Completion is not declared while any of these is greater than zero: critical UX failure, critical performance failure, critical accessibility failure, broken purchase flow, broken mobile flow, brand integrity failure, unknown critical dependency, critical security issue, unresolved data integrity issue, critical performance regression.

---

## Appendix — Sources

Cost and platform figures verified August 2026:

- [Is Cloudflare Pages + Workers Free? Free Plan Limits & Upgrade Triggers (2026) — CostBench](https://costbench.com/software/cloud-infrastructure/cloudflare-pages-workers/free-plan/)
- [Cloudflare Free Tier Limits Checklist — Easton](https://eastondev.com/blog/en/posts/dev/20260526-cloudflare-free-limits/)
- [Cloudflare's Pricing for Developers — BlazingCDN](https://blog.blazingcdn.com/en-us/cloudflares-pricing-for-developers-a-closer-look-at-workers-pages)
- [Shopify Transaction Fees in 2026 — Qualimero](https://qualimero.com/en/blog/shopify-transaction-fees)
- [Stripe vs Shopify Payments 2026 — Chargeflow](https://www.chargeflow.io/blog/stripe-vs-shopify-payments)
- [Shopify Fees in 2026: A Complete Breakdown — ConnectBooks](https://www.connectbooks.com/blog-posts/shopify-fees-2026)

Browser support figures are carried from `01_SITE_AUDIT.md` Appendix A.

**Note on evidentiary standard (§63):** pricing and free-tier figures above are vendor-reported and summarised by third parties; they should be re-verified against official vendor pricing pages before the architecture is committed, as tiers change. No cognitive-science claim in this document is presented as sourced research — §13 and §14 are explicitly labelled predictive design models, and the knowledge base in §20 is proposed as unbuilt rather than asserted as complete.
