# Design System

**Spec Version:** v1.0
**Parent:** [`README.md`](./README.md)

This document compiles the design principles, rules, evaluation methods, and workflow that guide every Olibana project.

---

## Unified Design Language

- **Nature-Derived Rules** — Each garment or product is designed by applying one or more rules from the Atlases. A jacket silhouette may follow a river curve, a border print may mimic tree rings, closures may reflect rock fractures. These rules are cataloged from Atlas measurements.
- **Proportional Consistency** — Key ratios (shoulder:hem, panel widths, pleat spacing) are derived from natural proportions — Fibonacci sequences, river width ratios — and stay consistent across collections to reinforce brand identity.
- **Geometry and Rhythm** — Curve radii, angles, and rhythmic spacing all come from Atlas data. This makes Olibana's patterns feel intentional and harmonious, never arbitrary.
- **Material Selection** — Raw materials are chosen for how they age and interact with light, as documented in the Material Atlas (fiber weave, texture, luster, patina behavior).

> The Material Atlas is a planned expansion. Until it exists, material choices cite [`Light_Atlas.md`](./Light_Atlas.md) reflectivity observations and are recorded for later migration.

## Evaluation Criteria

Every design proposal is assessed against this checklist. Each criterion receives a score or a pass/fail.

| Criterion | Question |
| --- | --- |
| **Originality** | Is this a fresh concept, or does it verge on imitation? Compare against existing market offerings. |
| **Structural Consistency** | Can we name the natural origin of each element? (*This sleeve curvature is from river flow; this texture from lichen.*) If not, the design fails. |
| **Timelessness** | Would this still feel meaningful in 10+ years? Are we leaning on a passing trend or an enduring principle? |
| **Silence / Minimalism** | Can any detail be removed without loss of clarity? Test: remove one element and see whether the design becomes stronger. |
| **Precision** | Are forms and patterns executed with technical exactness — neat seams, consistent pleats, placement symmetric per the rule? |
| **Craft Requirement** | Does this effect require fine craftsmanship? If a machine alone can replicate it perfectly, reconsider. |
| **Emotional Impact** | Does it evoke calm, trust, or inspiration? |
| **Brand Recognition** | Without logos, could someone familiar with Olibana identify this piece? Every product carries a family resemblance through shape or texture. |
| **Manufacturability** | Can this be executed reliably at quality? Material engineering and production feasibility are checked even while aesthetics lead. |
| **Global Appeal** | Inspired by Japanese nature, but free of parochial cliché. Does it speak universally, through the shared language of nature? |

**Only designs that excel on all points move to prototyping.**

## Validation Checklist

- [ ] **Natural Inspiration Confirmed** — Document which Atlas rule(s) were used, citing the Atlas data-log row.
- [ ] **Technical Feasibility** — Reviewed with patternmakers.
- [ ] **Rule Compliance** — Geometry verified against the natural parameter, within stated tolerance.
- [ ] **Peer Review** — Senior designers critique against the Brand Bible and Core Philosophy.
- [ ] **Sample Fitting** — Silhouette and drape confirmed on the human form.

---

## Evaluation Metrics

Each design is evaluated quantitatively and qualitatively. Scores are recorded and reviewed to keep decisions balanced and data-informed.

| Metric | Measured by |
| --- | --- |
| Originality | Novelty score against market comparison set |
| Structural Consistency | Rule adherence, as % of elements with a cited Atlas origin |
| Timelessness | Peer survey |
| Brand Alignment | Recognition test (logo-free identification rate) |
| Emotional Appeal | User feedback on mood |
| Manufacturability | Cost and time ratings |

## Design Iteration Process

1. **Research & Inspiration** — Explore the Atlases for applicable rules.
2. **Atlas Translation** — Map natural observations to sketches or parameters.
3. **Visual Grammar** — Develop preliminary motifs: patterns, shapes.
4. **Prototype** — Create an initial sample or digital model.
5. **Evaluation** — Apply the metrics and checklist above.
6. **Refine** — Remove or adjust elements, reinforcing *simplicity* and *silence*.
7. **Finalize & Approve** — Only when every criterion is satisfied.

## Working With a Design AI

When prompting Claude or any design AI, name the source rule explicitly and require justification against the philosophy. For example:

> *"Apply River Atlas curvature of radius ~100 m to the coat hem. Justify the pleat spacing against the observed streamline spacing, and state which Design Principle each decision serves."*

Output that cannot name its Atlas origin fails **Structural Consistency** and is rejected before evaluation proceeds.
