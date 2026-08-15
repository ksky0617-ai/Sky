# MOTION LANGUAGE

**Document:** `04_MOTION_LANGUAGE.md`
**Version:** v1.0
**Phase:** 1 — Design Documentation
**Depends on:** the four Atlases, `Character_Bible.md` v1.1 §6, `02_BRAND_EXPERIENCE_SYSTEM.md`

---

## 1. Position

Olibana's motion is a **grammar**, not a library of effects. Directive §72 requires a central motion system rather than per-component animation, and §4 assigns each natural phenomenon a distinct role.

The persona (Character Bible §6) fixes the register: *elegant, quiet, intelligent, confident* — expressed as movement that **resolves fully, occurs one at a time, carries meaning, and is unhurried.**

**Olibana does not bounce.** Overshoot is the motion equivalent of an exclamation mark, and the Web Voice rules forbid those too.

---

## 2. Provisional Values

Every duration and easing below is derived from the **qualitative observations already written in the Atlas documents** — not from field measurement, which has not happened yet.

They are therefore marked `provisional: true` in the token definitions. When Atlas field data arrives, the values are revisited: a measured meander radius can inform a curve, a measured branching ratio can inform a stagger. Because these are tokens, that revision costs a value change rather than a rewrite.

**This is stated in the tokens themselves so no one later mistakes a chosen number for a measured one.**

---

## 3. The Five Motion Tokens

### 3.1 `motion.river`

> Atlas source: *"the 'S' shapes of water passing obstacles, inspiring smooth, continuous contours"* · *"water both wraps around and bounces off rocks"*

| Property | Value |
| --- | --- |
| Duration | 900–1400 ms |
| Easing | `cubic-bezier(0.22, 0.61, 0.36, 1)` |
| Axis | `translate`, curved paths |
| Character | Continuous, inertial, long decelerating tail |
| Use | Page transitions, scroll-linked movement, image sequences |

The long tail is the point: water does not stop when the force stops. Movement decays; it is not cut.

### 3.2 `motion.stone`

> Atlas source: *"fractured rocks form polygonal facets"* · *"strata create natural overlaps"* · geological weight

| Property | Value |
| --- | --- |
| Duration | 1200–2000 ms |
| Easing | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Axis | `clip-path`, `scale`, layered reveal |
| Character | Heavy to start, deliberate, mass-bearing |
| Use | Section entry, panel division, collection transitions |

Stone resists before it moves. The slow onset carries the weight.

### 3.3 `motion.forest`

> Atlas source: *"trees form a hierarchy (trunk → branches → twigs)"* · branching ratios

| Property | Value |
| --- | --- |
| Duration | 400 ms per element |
| **Stagger** | **80–120 ms** |
| Easing | `cubic-bezier(0.33, 1, 0.68, 1)` |
| Axis | `opacity` + ≤ 12 px `translateY` |
| Character | Hierarchical, sequential, ordered by depth |
| Use | List and grid entry, navigation reveal, nested content |

The stagger *is* the meaning — it renders hierarchy visible. Elements arrive in structural order, never randomly. When measured branching ratios exist, the stagger is derived from them.

### 3.4 `motion.light`

> Atlas source: *"gradual illumination"* · *"golden hour... long shadows, rich colour"* · dawn → daylight → dusk

| Property | Value |
| --- | --- |
| Duration | 1600–3000 ms |
| Easing | `ease-in-out` or `linear` |
| Axis | **`opacity` and colour only — no transform** |
| Character | Atmospheric, ambient, imperceptible while occurring |
| Use | Illumination state, background, ambient state change |

The only token permitted to run long, because it produces no motion in the vestibular sense. This is what makes the global light system (`02` §4.2) safe.

### 3.5 `motion.wind` — *optional*

> Atlas source: README, *"Wind Patterns: draped motion and flow in fabric"*

| Property | Value |
| --- | --- |
| Duration | 3000–6000 ms, looping |
| Easing | `ease-in-out` |
| Axis | `translate` ≤ 8 px |
| Character | Barely perceptible drift |
| Use | Hero micro-movement only |

**The only looping motion permitted anywhere.** Capped at 8 px because above that it becomes decoration, and decoration that never stops is the opposite of silence. Removed entirely under reduced motion.

---

## 4. Token Definition Shape

Directive §44 requires motion to be tokenised, and `02` §2 requires every value to cite an Atlas origin. The shape enforces both:

```ts
{
  name: 'motion.river',
  duration: { min: 900, max: 1400, default: 1100 },
  easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  axis: ['translate'],
  source: {
    atlas: 'River_Atlas.md',
    observation: 'Flow Path — the "S" shapes of water passing obstacles',
    provisional: true,          // qualitative, not yet field-measured
  },
  reducedMotion: 'instant',
}
```

**A token without `source` fails the build.** This is how "Structural Logic" stops being a slogan.

---

## 5. Prohibitions

Directive §5, made checkable.

| Prohibited | Rule | Enforcement |
| --- | --- | --- |
| Bounce / overshoot | No easing curve may output > 1.0 | Lint the curve set |
| Fast UI transitions | No duration < 300 ms | Lint |
| Multiple concurrent primary motions | One at a time | Motion orchestrator |
| Meaningless parallax | Requires stated structural reason | Review |
| Particles, glassmorphism, animated gradients | Never | Review |
| Infinite loops | Only `motion.wind`, ≤ 8 px | Review |
| Scroll hijacking | Native scroll always | Review |
| Motion for its own sake | §7 gate below | PR checklist |

---

## 6. Reduced Motion

Directive §42 requires `prefers-reduced-motion` to be respected. Mapping is explicit per token — never a global "disable all", which tends to break layouts that assumed an animation would run.

| Token | Reduced behaviour |
| --- | --- |
| `motion.river` | Instant state change; transform removed; 120 ms opacity retained |
| `motion.stone` | Reveal removed; final state shown immediately |
| `motion.forest` | Stagger removed; elements appear together |
| `motion.light` | **Retained** — opacity/colour only, no vestibular trigger — duration reduced to 300 ms |
| `motion.wind` | Removed entirely |

**Rule:** reduced motion must never remove information. If a movement conveys something — hierarchy, relationship, origin — the reduced variant conveys it another way. It is a different expression of the same content, not a degraded one.

---

## 7. The Motion Gate

Directive §43, as a pull-request checklist. Every motion answers all six or it does not merge.

```
1. Does it cite an Atlas source?              no → reject
2. Does it strengthen the brand world?        no → reject
3. Does it improve UX?                        no → justify or reject
4. Is the performance cost justified?         no → reject   (attach measurement)
5. Is a reduced-motion variant defined?       no → reject
6. Does the page work fully without it?       no → reject
```

Question 6 is the strictest and the most important. **No motion may be load-bearing.** Content that only appears after an animation is content that fails for a Firefox user without scroll-driven animation support, for a reduced-motion user, and for anyone on a slow device.

---

## 8. Technical Strategy

Browser support, verified August 2026:

| Feature | Chrome/Edge | Safari | Firefox |
| --- | --- | --- | --- |
| Scroll-driven animations | 115+ ✅ | 26+ ✅ | **behind flag as of 152** |
| Cross-document View Transitions | 126+ ✅ | 18.2+ ✅ | in progress |

**Consequence: neither feature may be depended upon.** Both are adopted as progressive enhancement.

```
Tier 1   CSS scroll-driven animations + View Transitions
         Compositor-run, 0 KB JS. Best performance.
         Unsupported → static final state. Site fully functional.

Tier 2   JS motion library (Motion / Framer Motion)
         Only where CSS cannot express the requirement, and the
         experience genuinely matters on Firefox.

Tier 3   GSAP + ScrollTrigger
         Only for a complex timeline that actually needs orchestration.
         Expected: one or two surfaces at most, lazy-loaded.
```

### Performance rules

- Animate `transform` and `opacity` only. Never `width`, `height`, `top`, `left`.
- No scroll event handlers. CSS scroll-driven or `IntersectionObserver`.
- `will-change` applied immediately before animating and removed after.
- Motion libraries are route-level dynamic imports, never in the initial bundle.
- **The hero's first painted frame is static.** Motion attaches after LCP. Non-negotiable (§41).

---

## 9. Application by Layer

| Surface | Layer | Tokens | Budget |
| --- | --- | --- | --- |
| Home opening | 1 | `light` → `stone` → `wind` | Full |
| Home scroll | 1 | `river` (linked), `forest` (entry) | Full |
| Nature / Atlas | 1 | `light`, `river`, `stone` per Atlas | Full |
| Philosophy | 1 | `forest` (hierarchical reveal) | Moderate |
| Journal | 2 | `forest` (list), `river` (transition) | Moderate |
| Lookbook | 2 | `river` (sequence), `stone` (transition) | Full |
| Collection | 2 | `stone` (entry), `forest` (grid) | Moderate |
| Product | 3 | `forest` (detail reveal) only | **Minimal** |
| Cart | 3 | Drawer slide only | **Minimal** |
| **Checkout** | 3 | **None** | **Zero — disabled at provider level** |
| Confirmation | 3 | `light` only | Low |

Each Atlas page uses its own token as its primary motion. `/nature/stone` moves like stone. This is the system's clearest self-demonstration — and it costs nothing extra, because the tokens already exist.

---

## 10. Acceptance

- [ ] All motion values come from tokens; no inline durations or easings
- [ ] Every token carries a cited Atlas source
- [ ] Provisional values are marked as provisional
- [ ] No easing curve overshoots
- [ ] No duration below 300 ms
- [ ] Only one primary motion runs at a time
- [ ] Every token has a defined reduced-motion variant
- [ ] Every page is fully functional with all motion disabled
- [ ] No content is revealed only by animation
- [ ] Checkout routes carry zero brand motion, enforced at provider level
- [ ] Hero LCP unaffected by the opening sequence
- [ ] Motion libraries absent from the initial bundle
