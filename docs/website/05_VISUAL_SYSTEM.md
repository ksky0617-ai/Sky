# VISUAL SYSTEM

**Document:** `05_VISUAL_SYSTEM.md`
**Version:** v1.0
**Phase:** 1 — Design Documentation
**Decision applied:** Palette derivation method **(A) — measurement first.** No brand colour value is fixed in this document.

---

## 1. What This Document Does and Does Not Fix

The owner has chosen that the palette be derived from **actual measurement** — colour temperature, illuminance, and shadow contrast recorded in the field per `Light_Atlas.md` — rather than from the qualitative descriptions already written there.

That decision is consistent with the brand's central claim, and this document honours it strictly:

| Fixed here | Deferred |
| --- | --- |
| Token architecture and naming | Every brand colour value |
| Semantic role structure | The typeface |
| Spacing scale | Type scale ratio (see §5) |
| Grid and breakpoints | Shadow values (derived from measured shadow contrast) |
| Radius, z-index, container | |
| Contrast requirements | |
| Light-state architecture | Light-state values |
| **The measurement protocol that unblocks all of the above** (§8) | |

**The consequence, stated plainly:** the visual system cannot be finalised until someone goes outside and measures light. Section 8 exists to make that as fast and unambiguous as possible, because it is now the critical path for the entire project.

---

## 2. Construction Palette (temporary, explicitly not the brand)

Development cannot proceed against no colours at all. So the build uses a **construction palette**: pure neutral greys, chosen deliberately to be *obviously* unfinished.

```
--construct-000  #FFFFFF
--construct-100  #F2F2F2
--construct-300  #C9C9C9
--construct-500  #8A8A8A
--construct-700  #4A4A4A
--construct-900  #1A1A1A
```

**Rules:**
- Every value carries the `--construct-` prefix. When the measured palette arrives, a project-wide search for that prefix finds every unresolved site.
- **No hue anywhere.** A tinted placeholder becomes a de facto brand decision by familiarity — the team stops seeing it as temporary. Grey cannot be mistaken for a choice.
- **The construction palette must never reach production.** A build-time check fails any production build still containing `--construct-`.

This is not a workaround. It is the only way to build layout, motion, and interaction honestly while colour remains genuinely undetermined.

---

## 3. Token Architecture

Semantic roles, resolved from the palette once it exists. Components reference **roles only** — never raw values — so the palette swap touches one file.

```
surface.base            page ground
surface.raised          cards, drawers, elevated panels
surface.sunken          wells, inset areas
surface.inverse         inverted sections

content.primary         body text
content.secondary       supporting text
content.tertiary        metadata, captions
content.inverse         text on inverse surfaces

line.hairline           the finest rule the display can hold
line.default            standard borders
line.strong             emphasised division
line.rule               ← Rule Layer overlay lines (distinct role, see 02 §4.1)

state.focus             focus ring — never removed, never subtle
state.error
state.success
state.disabled

accent.primary          the single accent (silence budget: max 1 on screen)
```

`line.rule` is a first-class role rather than a reuse of `line.strong`, because Rule Layer overlays must remain legible over photography in all three light states. It has different constraints from any interface border and will resolve to a different value.

---

## 4. Light State Architecture

The three-state illumination system from `02_BRAND_EXPERIENCE_SYSTEM.md` §4.2, structurally.

```css
:root {                              /* daylight — the default, always defined  */
  --surface-base: …;
  --content-primary: …;
  --line-hairline: …;
  --shadow-ambient: …;
}

:root[data-light="dawn"]     { /* only role values are redefined */ }
:root[data-light="dusk"]     { /* only role values are redefined */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-light="daylight"]) { /* … */ }
}
```

**Hard constraints:**

1. **Daylight is fully defined on bare `:root`.** No role may have its only definition inside a state block — a missing state must degrade to a complete, correct palette.
2. **Product photography is never affected.** Light state applies to interface surfaces only. Media elements are excluded at the stylesheet level, not by convention. Altering a garment's apparent colour would corrupt a purchase decision.
3. **All three states pass WCAG AA.** Validated per state in CI. A state that fails is corrected, not shipped with an exception.
4. **Manual override persists.** Time-of-day is a default, not an imposition.

Because the whole system is custom-property swaps, the runtime cost is a class change on `<html>`.

---

## 5. Typography

### The problem with deferring type to measurement

Colour can be measured. **A typeface cannot be derived from light measurement.** Applying "measurement first" literally to typography would defer it indefinitely, waiting on data that will never speak to it.

So typography splits into two decisions with different dependencies:

| Decision | Depends on | Status |
| --- | --- | --- |
| **Type scale ratio** | Forest Atlas branching ratios — genuinely measurable | Deferred to measurement, consistent with (A) |
| **The typeface itself** | Brand judgement + licence budget | **Requires a separate owner decision** |

### Scale structure (fixed now, ratio pending)

A modular scale with a single ratio. Directive §45 asks for *quiet, intelligent, geometric, refined*; the silence budget caps distinct sizes at three per viewport.

```
scale.xs · scale.sm · scale.base · scale.lg · scale.xl · scale.2xl · scale.3xl
```

The ratio is intended to come from a measured trunk-to-canopy or branch-hierarchy ratio recorded in `Forest_Atlas.md` — which would make the type scale itself structurally derived, exactly as the philosophy requires. **Until that measurement exists the ratio is unset**, and the construction build uses a plain 1.25 marked `--construct-`.

### Typeface selection criteria (for the owner's decision)

Not a recommendation — the constraints any candidate must satisfy:

- **Licence:** web use, commercial, no page-view ceiling that a growing brand would breach
- **Weights:** minimum three; the persona will not need more
- **Language coverage:** Latin **and** Japanese **and** Korean, or a coordinated pairing that does not visibly fracture across locales (see `16_INTERNATIONALIZATION.md`)
- **Geometry:** clear, rational letterforms per Character Bible §3
- **Performance:** subsettable, variable font preferred, WOFF2, `font-display: swap`, self-hosted
- **Timelessness:** not a typeface that will date the site to its year

**Excluded on brand grounds:** any face carrying luxury-fashion connotation by association, and any face with decorative or calligraphic character.

---

## 6. Spacing, Grid, Layout

These need no measurement and are fixed now.

### Spacing

An 8 px base with a 4 px half-step. Arbitrary values are a lint failure — this is how "Precision" is enforced rather than asserted.

```
space.0   0        space.5   24px      space.10  96px
space.1   4px      space.6   32px      space.11  128px
space.2   8px      space.7   40px      space.12  160px
space.3   12px     space.8   56px      space.13  224px
space.4   16px     space.9   72px      space.14  320px
```

The upper range is generous because the silence budget requires ≥ 40% empty space on Layer 1 screens. Negative space is the medium; the scale must reach far enough to express it.

### Breakpoints

```
sm   640    tablet portrait
md   960    tablet landscape
lg   1280   laptop
xl   1680   desktop
2xl  2200   large display
```

Mobile-first (§40): mobile is a distinct interaction hierarchy, not a scaled-down desktop.

### Grid

12 columns from `md` up; 4 columns below. Gutters from the spacing scale.

Editorial layouts break the grid deliberately — but they break it **to a stated rule**, never arbitrarily. A full-bleed image that starts at column 3 records why.

### Radius and elevation

```
radius.none  0     ← the default. Olibana's edges are carved, not softened.
radius.sm    2px   ← inputs and controls only, for affordance
radius.full  9999  ← circular elements only
```

Sharp by default, from `Stone_Atlas.md`: *"All edges in Olibana garments should feel intentional — carved rather than cut whimsically."*

Shadow values are **deferred** — they derive from measured shadow contrast and shadow-edge softness, which `Light_Atlas.md` is designed to record. Provisionally, elevation is expressed with hairline rules rather than shadows, which suits the persona and may prove to be the permanent answer.

### Z-index

```
base 0 · raised 10 · sticky 100 · drawer 200 · overlay 300
ruleLayer 400 · modal 500 · toast 600 · focus 9999
```

`ruleLayer` sits above overlays but below modals: the Rule Layer draws over content, but never traps or obscures a dialog. Focus indication outranks everything — it must never be covered.

---

## 7. Imagery

Full direction is in `Character_Bible.md` v1.1 §4. The technical contract:

| Type | Ratio | Priority | Notes |
| --- | --- | --- | --- |
| Hero | 16:9 / 4:5 mobile | Eager, LCP | Static first frame required |
| Editorial full-bleed | 3:2 | Lazy | |
| Portrait | 4:5 | Lazy | |
| Product front/back/side | 4:5 | First eager, rest lazy | Consistent ratio across all products |
| Product detail / macro | 1:1 | Lazy | |
| On-body | 4:5 | Lazy | |
| Landscape / Atlas | 21:9 | Lazy | Rule Layer overlay target |
| Texture | 1:1 | Lazy | |

**Rules:** AVIF with WebP fallback; responsive `srcset` at every breakpoint; explicit dimensions always (CLS); a stated focal point per image so crops never cut a structural line; hero ≤ 400 KB total initial load.

**Placeholders must be visibly placeholder.** No stock photography standing in for brand imagery, at any stage. A convincing placeholder becomes an accidental decision.

---

## 8. Colour Derivation Protocol — the unblocking step

Choosing measurement-first makes this the critical path. This section specifies exactly what to capture so the palette can be derived without a second field trip.

### Per session, record

Using the field template already in `Light_Atlas.md`:

```
Site · Date · Season · Sky condition
Time and phase        dawn / daylight / dusk
Colour temperature    K        (colour meter, or a grey card + camera white balance)
Illuminance           lux      (light meter, or a phone lux app for relative values)
Shadow contrast       %        (same subject in sun and in shade, ratio of the two)
Shadow edge           hard / soft
Dominant hues         HSV, sampled from a raw capture — never from a graded image
```

### Minimum capture set

```
3 phases (dawn · daylight · dusk)
  × 2 sky conditions (clear · overcast)
    × 2 sites (one water or open ground · one under canopy)
      = 12 sessions
```

Twelve sessions is also the twelve Atlas rows that `03_INFORMATION_ARCHITECTURE.md` §3 identifies as the minimum for `/nature` to carry evidence rather than intent, and that `02` §4.1 requires before the Rule Layer can activate. **One field effort unblocks the palette, the Atlas pages, and the signature interaction simultaneously.**

### Alongside the readings, capture

- A **grey card** in frame at every reading — without it, recovering true colour from photographs is guesswork
- **Raw files**, unprocessed. Hues sampled from a graded JPEG measure the grade, not the light.
- The same neutral subject across all sessions, so readings are comparable
- Shadow edges specifically — shadow-edge softness is what the deferred shadow tokens need

### Derivation, once captured

1. Cluster measured hues per phase → three atmosphere sets
2. Assign semantic roles (§3) within each set
3. Verify WCAG AA for every role pair, in every set — **adjust for contrast where required, and record the deviation**
4. Publish as the palette, each value citing its source row in `Light_Atlas.md`
5. Remove every `--construct-` token; the production build check then passes

**Step 3 will force compromise.** Measured natural light does not automatically produce accessible text contrast, and accessibility is not negotiable. Where a measured value must be adjusted, the adjustment is recorded next to the original reading — so the palette remains traceable and honest about where nature was followed and where legibility took precedence.

---

## 9. Acceptance

- [ ] No component references a raw colour; roles only
- [ ] No `--construct-` token in any production build (CI-enforced)
- [ ] Daylight state fully defined on bare `:root`
- [ ] All three light states pass WCAG AA
- [ ] Light state provably does not affect product photography
- [ ] Manual light override present and persistent
- [ ] All spacing from the scale; arbitrary values fail lint
- [ ] Every image has explicit dimensions and a stated focal point
- [ ] No stock photography in any environment
- [ ] Every published colour value cites its Atlas source row
- [ ] Contrast-driven deviations from measured values are documented
