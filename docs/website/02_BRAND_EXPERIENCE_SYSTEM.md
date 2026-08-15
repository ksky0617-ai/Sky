# BRAND EXPERIENCE SYSTEM

**Document:** `02_BRAND_EXPERIENCE_SYSTEM.md`
**Version:** v1.0
**Phase:** 1 — Design Documentation
**Scope:** MVP-1P (one product, complete loop) — see [ADR-002](../adr/ADR-002-mvp-boundary.md). Where this document says "MVP-0", read MVP-1P: the same brand-world surfaces, now shipping *around* one real product rather than instead of one.
**Scheduling note:** per [ADR-001](../adr/ADR-001-directive-priority-resolution.md), this specification remains valid but its implementation waits behind open P0 business failures (`RISK_REGISTER.md`).
**Depends on:** `Brand_Bible.md`, `Character_Bible.md` v1.1, `Design_System.md`, the four Atlases

---

## 1. The Translation Thesis

The root spec states: *Nature is a design system, not mere inspiration.* Translating that to the web produces one governing sentence:

> **The website is not nature-themed. It is nature-structured.**
>
> Placing natural imagery behind an ordinary interface is a failure of the philosophy.
> The philosophy succeeds only when **the behaviour of the interface itself follows a rule taken from nature.**

This gives a hard test, applied in review to every screen:

```
Remove every photograph from this page.
Is anything left that could only be Olibana?

NO  → the page is decorated, not designed. Reject.
YES → what is left is the actual brand system.
```

A page that depends entirely on its imagery for identity has no design language — it has art direction. Both are needed, but only one of them is this document's subject.

---

## 2. The Six Principles as Enforceable Web Rules

`README.md` gives six principles. Principles that cannot be checked are decoration. Each is restated here as something a reviewer can fail a pull request over.

| Principle | Enforceable web rule | How it is checked |
| --- | --- | --- |
| **Structural Logic** | Every motion token, ratio, and rhythm value carries a cited Atlas origin in its definition. | Token definitions require a `source` field. Missing source = build warning. |
| **Simplicity** | One primary action per screen. New component variants require written justification. | Design review; variant count tracked. |
| **Timelessness** | No effect whose presence dates the page to its year of construction. CSS-native preferred over library signatures. | Review question: *would this look like 2026 in 2031?* |
| **Precision** | No arbitrary values. Spacing, duration, and type sizes come from the scale or they do not ship. | Lint rule: raw `px` in spacing/duration positions fails. |
| **Silence** | A measured density ceiling per viewport, and a hard limit of one concurrent primary motion. | §5 of this document. Measurable. |
| **Originality** | The directive's prohibition list (§74) becomes a QA checklist run against every page. | §7 of this document. |

---

## 3. The Three Layers

The site is one world with three depths. A visitor should be able to move between them without a seam, and should never be trapped in the wrong one.

```
LAYER 1 — WORLD        Why Olibana exists
                       Home · Nature · Philosophy
                       Mode: Immersive.  Motion: full.  Density: lowest.

LAYER 2 — DESIGN       How the work is made
                       Design Language · Collections · Craft · Materials · Journal · Lookbook
                       Mode: Immersive → Informative.  Motion: moderate.

LAYER 3 — COMMERCE     What you can own
                       Shop · Product · Fit · Cart · Checkout · Order
                       Mode: Informative → Frictionless.  Motion: minimal → none.
```

**The governing constraint (directive §54):**

> Brand experience must never obstruct the user, and the purchase experience must never destroy the brand experience.

This is implemented as a **descending motion budget**. The deeper a visitor goes toward purchase, the quieter the interface becomes. This is not a compromise — it is the persona. A confident brand stops performing once the visitor has decided to buy.

### Mode definitions

| Mode | Surfaces | Motion budget | Copy density | Primary measure |
| --- | --- | --- | --- | --- |
| **Immersive** | Home, Nature, Lookbook, Philosophy | Full | Minimal | Time on page, scroll depth |
| **Informative** | Collection, Product, Materials, Journal | Moderate | High | Comprehension, size-guide opens |
| **Frictionless** | Cart, Checkout | **Effectively zero** | Minimal | Completion rate, time to complete |
| **Reassuring** | Confirmation, Tracking, Care, Support | Low | High | Support contact rate (lower is better) |

**Enforced in code:** the motion system reads the active route's mode. On `Frictionless` routes the brand motion layer is disabled at the provider level, not per-component. It cannot be re-enabled by an individual component.

---

## 4. Signature Interactions

The directive (§6) requires reinterpretation rather than trend replication, and (§74) forbids copying any specific brand's interaction. The three concepts below are derived from Olibana's own Atlas documents. Each is stated with its dependency and its failure condition, because two of the three cannot be honestly built yet.

---

### 4.1 THE RULE LAYER — *primary signature*

**Status:** Component built in MVP-0, **inactive until Atlas data exists.**

A single quiet toggle, persistent across the site. Default off.

```
OFF   The garment. The photograph. Quiet commerce.
      A visitor who wants to shop is never made to study.

ON    The rule beneath what you are currently looking at, drawn over it:
        · a coat silhouette gains its curvature line and radius
        · a panel seam gains its fracture angle
        · a knit repeat gains its branching ratio
        · a colour gains its measured temperature in Kelvin
```

**Why this is Olibana and not a generic feature:**

- It resolves directive §25 (Atlas → Product) in a single interaction rather than a page journey. Philosophy and product occupy the same screen at the same moment.
- It turns §15's Natural Rule from marketing narration into a **drawing**. The brand claims its forms come from measured nature; this is the claim made inspectable.
- It realises §49 literally: the interface reveals its construction the way a garment reveals its seams.
- **It cannot be faked.** The overlay renders only from real Atlas rows. Where there is no measurement, the toggle is disabled for that object. Honesty is a structural property of the component, not a policy someone must remember.

**Dependency:** Atlas field data + Fashion Specification.
**Failure condition:** if it renders invented numbers, it must be removed entirely. A false drawing is worse than no drawing.

---

### 4.2 LIGHT AS GLOBAL STATE — *ambient system*

**Status:** Architecture built in MVP-0, **values pending light measurement** (owner chose measurement-first palette derivation).

`Light_Atlas.md` treats illumination as measurable: colour temperature, illuminance, shadow contrast. The site therefore treats light as **system state**, not as a visual motif. Surface tone, contrast, and shadow depth shift with the visitor's local hour.

```
dawn        low illuminance · warm · low contrast · long soft shadow
daylight    high illuminance · neutral · high contrast · short defined shadow
dusk        falling illuminance · deep warm · compressed contrast · diffuse shadow
```

**Implementation:** one CSS custom-property set swapped per state. Near-zero JavaScript, near-zero performance cost, and it degrades to the daylight set if anything fails.

**Two hard constraints:**

1. **Product photography is never tinted.** The light state applies to interface surfaces only — background, rule lines, type, chrome. Altering a garment's apparent colour would corrupt a purchase decision, which violates §54 and is straightforwardly dishonest.
2. **Contrast ratios are validated in all three states.** A state that fails WCAG AA is not shipped; the token set is corrected until every state passes.

**Manual override** is always available and persists. Some visitors need a fixed appearance, and time-of-day is a preference, not an imposition.

---

### 4.3 BRANCHING NAVIGATION — *structural navigation*

**Status:** Buildable in MVP-0.

`Forest_Atlas.md` records hierarchy — trunk → branch → twig — and the measured angles and ratios between them. Navigation adopts that hierarchy as its **reveal structure**: a section opens into its children with the stagger and proportion recorded in the Atlas.

**Constraint, stated first because it outranks the idea (§12):** navigation must never become unclear.

- Every destination is a real `<a href>`. The branching is a reveal, not a routing mechanism.
- Keyboard order is linear and predictable regardless of visual arrangement.
- The structure is fully operable with motion disabled.
- If usability testing shows hesitation, the branching reveal is removed and a conventional menu ships. **The navigation's job is to navigate.**

---

## 5. The Silence Budget

"Silence" is the least implementable of the six principles unless it is given numbers. These are the numbers.

| Constraint | Limit | Rationale |
| --- | --- | --- |
| Primary motions running at once | **1** | *"One thing moves at a time"* — Character Bible §6 |
| Distinct type sizes per viewport | **≤ 3** | Hierarchy through space, not through scale variety |
| Simultaneous calls to action | **1 primary + 1 secondary** | Directive §82 |
| Minimum empty space, Layer 1 screens | **≥ 40%** of viewport | Negative space is the medium, not the leftover |
| Accent colours on screen | **≤ 1** | The palette is a range of one atmosphere, not a set of colours |
| Nav items at rest | **≤ 8** | Directive §12's list is eight |
| Words in a Layer 1 statement block | **≤ 25** | Long-form belongs in Layer 2 |

These are review thresholds, not laws of physics. Exceeding one requires a written reason in the pull request — which is the point: it makes density a deliberate act rather than an accumulation.

---

## 6. Home as Portal

The directive (§9) specifies Home as an entry to a world rather than a hero plus product grid. The sequence is fixed; the content is not yet available.

```
Opening      dark, quiet, almost still
   ↓
Light        illumination enters — motion.light, the slowest token
   ↓
Emergence    cloth or landscape resolves out of the ground
   ↓
OLIBANA
   ↓
Statement    one line, from Brand Bible language
   ↓
── scroll ──────────────────────────────────
Nature · Principle · Collection · Material · Craft · Atelier · Journal · Statement · Shop
```

**Performance constraint that governs the whole sequence (§11, §41):** the first painted frame is a **static image**. Motion is layered on afterwards. The opening sequence must never be on the critical path to LCP. A brand moment that costs the visitor two seconds of blank screen has already failed the persona — it is the interface demanding attention.

**Directive §76 sets the pass condition:** the visitor must simultaneously feel *this is beautiful*, *this brand has its own method*, and *I understand what is being sold*. Achieving only the first is a failure. In MVP-0 the third is satisfied by clearly signalling that the collection is forthcoming — **not** by displaying products that do not exist.

---

## 7. The Prohibition Checklist

Directive §74 and §75, restated as a QA pass run against every page before it ships.

**Visual clichés — automatic rejection**
- [ ] No cherry blossom, Mount Fuji, torii, samurai, kimono, or zen-garden reference
- [ ] No decorative kanji or kana used as ornament rather than language
- [ ] No black-and-gold luxury grade
- [ ] No beige-minimalism styling
- [ ] No generic luxury template or Shopify-theme structure
- [ ] No interaction traceable to a specific existing brand

**Motion clichés — automatic rejection**
- [ ] No bounce or overshoot
- [ ] No particle effects
- [ ] No glassmorphism
- [ ] No animated gradient
- [ ] No parallax without a stated structural reason
- [ ] No transition under 300 ms

**Honesty — automatic rejection**
- [ ] No measurement displayed that was not measured
- [ ] No delivery time, region, or cost that is not contracted
- [ ] No production process depicted that does not occur
- [ ] No press coverage, award, or stockist that does not exist
- [ ] No sustainability claim without evidence
- [ ] No order state not mapped to a real fulfilment event
- [ ] No policy text presented as final before legal review

The honesty block is not a legal precaution. A brand whose entire premise is *forms derived from measured nature* cannot display an invented measurement and remain the same brand. **The prohibition is the product.**

---

## 8. Acceptance

This system is correctly implemented when:

- [ ] Stripping all photography from any page leaves something identifiably Olibana
- [ ] Motion budget provably decreases from Layer 1 to Layer 3
- [ ] The motion system is disabled on checkout routes at provider level
- [ ] Every motion token carries a cited Atlas source
- [ ] The Rule Layer renders only from real data, and is disabled where data is absent
- [ ] Light state never affects product photography
- [ ] All three light states pass WCAG AA
- [ ] Navigation is fully operable by keyboard with motion disabled
- [ ] Silence budget thresholds are met, or exceptions are documented
- [ ] The §7 prohibition checklist passes on every page
