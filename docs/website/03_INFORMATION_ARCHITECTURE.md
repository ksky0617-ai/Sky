# INFORMATION ARCHITECTURE

**Document:** `03_INFORMATION_ARCHITECTURE.md`
**Version:** v1.0
**Phase:** 1 — Design Documentation
**Scope:** Full target IA, with the MVP-0 build set marked explicitly

---

## 1. Governing Rule

> **A route that cannot be filled with true content is not built.**

Directive §8 says unnecessary pages should not be implemented, and to judge against the actual business model. §36–§38 repeat this for Wholesale, Press, and Stockists specifically. The audit established that no products, no measurements, no press coverage, and no stockists exist.

Therefore the IA below is divided by **what can be truthfully filled today**, not by what the site will eventually contain. Empty routes are worse than absent ones: a visitor who finds a hollow page learns the brand is not real yet, which is precisely the impression a first release must avoid.

---

## 2. Structure

```
Layer 1 — WORLD
/                                Home
/nature                          Atlas index
/nature/river                    River Atlas
/nature/stone                    Stone Atlas
/nature/forest                   Forest Atlas
/nature/light                    Light Atlas
/olibana/philosophy              Core philosophy
/olibana/story                   Brand narrative            [blocked: facts]

Layer 2 — DESIGN
/olibana/design-language         The design system, publicly
/olibana/craft                   Making                     [blocked: facts + imagery]
/olibana/materials               Material index             [blocked: material spec]
/olibana/atelier                 Where and how              [blocked: facts + imagery]
/collections                     Collection index           [blocked: collections]
/collections/[slug]              Collection detail          [blocked: collections]
/lookbook                        Editorial                  [blocked: imagery]
/journal                         Index
/journal/[slug]                  Article

Layer 3 — COMMERCE
/shop                            Product index              [blocked: products]
/products/[slug]                 Product detail             [blocked: Fashion Spec]
/fit-size                        Size, measurement, fit     [blocked: measurements]
/search                          Search                     [blocked: products]
/wishlist                        Saved items
/cart                            Cart
/checkout                        Checkout                   [blocked: payment provider]
/order/confirmation              Order confirmed            [blocked: order backend]
/order/tracking                  Order tracking             [blocked: fulfilment]
/account/*                       Profile, orders, addresses [blocked: auth backend]

Support & Legal
/care                            Garment care               [blocked: material spec]
/shipping                        Shipping                   [blocked: carrier terms]
/returns                         Returns                    [blocked: final policy]
/faq                             FAQ                        [partial]
/contact                         Contact
/legal/privacy                   Privacy                    [blocked: legal review]
/legal/terms                     Terms                      [blocked: legal review]
/legal/cookies                   Cookie policy              [blocked: legal review]
/legal/accessibility             Accessibility statement
/legal/company                   Company information        [blocked: entity details]

System
/404 · /500 · offline            Error and edge states

NOT BUILT
/wholesale                       No B2B model exists         (§36)
/press                           No coverage exists          (§37)
/stockists                       No stockists exist          (§38)
```

---

## 3. MVP-0 Build Set

These routes can be filled with true content once the hero asset and the visual system land. **This is the entire first release.**

| Route | Purpose | Content source | Ready |
| --- | --- | --- | --- |
| `/` | Entry to the world; state that the brand exists | Brand Bible + hero asset | Needs hero asset |
| `/nature` | The Atlas method as brand asset | The four Atlas documents | ✅ |
| `/nature/[atlas]` × 4 | What is studied, how it is measured, what it yields | Atlas documents | ✅ structure — data rows pending |
| `/olibana/philosophy` | Core philosophy, experienced by scroll | `README.md` | ✅ |
| `/olibana/design-language` | The six principles and the evaluation system | `Design_System.md` | ✅ |
| `/journal` + `/journal/[slug]` | Research writing | Owner-authored | Needs first article |
| `/contact` | Reach the brand | Owner email | Needs address |
| `/legal/accessibility` | Accessibility statement | Self-authored, factual | ✅ |
| `/404`, `/500`, offline | Recovery | Self-authored | ✅ |
| *Newsletter capture* | Collect interest before launch | — | Needs provider |

**Deliberately excluded from MVP-0:** every commerce route, every route depending on photography that does not exist, and every route depending on facts the owner has not supplied.

### The `/nature` honesty problem

The Atlas pages are Olibana's strongest asset and its most exposed one. `River_Atlas.md` and its siblings currently describe **how to measure** and contain **zero measurements**.

Presented carelessly, `/nature/river` becomes a page explaining how someone would study a river — which reads as a brand describing work it has not done.

**Resolution:** the Atlas pages present the *method* as the subject, honestly framed, and the data section renders only rows that exist. With zero rows the section is absent, not empty-stated. As rows arrive the page deepens on its own. This is defensible at launch — a research method is a real thing to show — and it improves without redesign.

**Minimum for the Atlas pages to carry their full intent: 3 field records per Atlas, 12 total.** Below that, `/nature` is a statement of intent. At or above it, `/nature` is evidence, and the Rule Layer becomes possible.

---

## 4. Navigation Model

### Primary navigation

Directive §12 names eight items. Under MVP-0, four of them lead nowhere true.

| Item | MVP-0 | MVP-1 |
| --- | --- | --- |
| `OLIBANA` (home) | ✅ | ✅ |
| `SHOP` | ✗ hidden | ✅ |
| `COLLECTION` | ✗ hidden | ✅ |
| `NATURE` | ✅ | ✅ |
| `ATELIER` | ✗ hidden | ✅ |
| `JOURNAL` | ✅ (once one article exists) | ✅ |
| `SEARCH` | ✗ hidden | ✅ |
| `ACCOUNT` / `WISHLIST` / `CART` | ✗ hidden | ✅ |

MVP-0 navigation therefore reduces to: **`OLIBANA` · `NATURE` · `PHILOSOPHY` · `JOURNAL`** — four items, which suits the persona and honestly represents the site's extent. Navigation is driven by a route manifest, so items appear automatically as their routes become fillable. No redesign is required to reach the full set.

### Rules

- Real anchors throughout; branching reveal is presentation only (see `02_BRAND_EXPERIENCE_SYSTEM.md` §4.3)
- Linear keyboard order irrespective of visual arrangement
- Current location always indicated
- Fully operable with motion disabled
- Mobile: no hover dependency; the same hierarchy expressed as a full-height panel

---

## 5. URL Conventions

```
lowercase, hyphenated              /design-language   not  /designLanguage
no trailing slash
no dates in article URLs           /journal/river-curvature-study
stable slugs                       renaming requires a 301
category as filter, not route      /shop?category=outerwear
   → promoted to /shop/outerwear only when that category holds real products
locale prefix from launch          /en/… /ja/… /ko/…  (see 16_INTERNATIONALIZATION.md)
```

Categories begin as query parameters because promoting nine empty category routes would create nine hollow pages and nine indexable dead ends. Promotion happens per category, when populated.

---

## 6. Cross-Layer Connections

The directive's central UX claim (§25) is that philosophy and commerce must connect. These are the connections, and the state of each.

| From | To | Mechanism | Status |
| --- | --- | --- | --- |
| Atlas → Product | `/nature/river` → `/products/[slug]` | "Garments from this rule" | Blocked: products |
| Product → Atlas | Product page → `/nature/[atlas]` | Natural Rule block | Blocked: Fashion Spec |
| Article → Product | Journal → product | Editorial link | Blocked: products |
| Collection → Atlas | Collection → source Atlas | Design grammar section | Blocked: collections |
| Anywhere → Rule Layer | Global toggle | Overlay | Blocked: Atlas data |

**All five are blocked on the same two inputs: Atlas field data and the Fashion Specification.** This is the strongest argument for prioritising field measurement — it is not one feature's dependency, it is the dependency of the brand's entire differentiating mechanism.

---

## 7. Search Architecture

Not built in MVP-0 (nothing to search). Designed now so the index is not retrofitted.

Indexed entities: `product`, `collection`, `article`, `material`, `atlas-entry`, `page`.

Each carries `title`, `type`, `summary`, `naturalRule`, `atlasSource`, `category`, `colour`, `material`, `url`.

`naturalRule` and `atlasSource` are indexed from the start because Olibana's search should answer *"which garments come from stone?"* — a question no other fashion retailer's search can answer. Directive §30's visual-search extension attaches to the same schema later.

---

## 8. Acceptance

- [ ] No route ships that cannot be truthfully filled
- [ ] Navigation shows only routes that exist
- [ ] Every destination is a real anchor; keyboard order is linear
- [ ] Atlas pages render zero invented data rows
- [ ] Category filtering works without dedicated routes
- [ ] Locale prefix in place from first release
- [ ] Search schema defined before search is built
- [ ] Wholesale, Press, and Stockists are absent, not stubbed
