# Olibana — Project Root Specification

**Project Name:** Olibana
**Spec Version:** v1.0
**Status:** Living document

---

## Project Vision

Olibana is a premium Japanese design brand built for the global market. The goal is **not** to rehash traditional Japanese motifs or existing luxury tropes, but to establish a wholly original visual language drawn from the *structural beauty of nature*.

Every design decision is grounded in observable natural phenomena rather than decorative symbolism. This biomimetic approach — treating nature as a blueprint for beauty and efficiency — ensures our forms are both innovative and deeply aligned with ecological harmony. By observing the time-tested efficiency and elegance of natural processes, we discover design solutions that are simultaneously functional and graceful.

## Core Philosophy

Nature is treated as a **design system**, not as inspiration or decoration. Every visual element must be traceable to a measurable structure found in nature. The form of a garment might reference the curvature of a river, the branching geometry of a tree, or the stratified layers of sedimentary rock. By emulating nature's *structural logic* we achieve forms that feel inevitable and authentic.

> **Key idea:** Let nature's geometry and dynamics define our design grammar.

### Examples of Natural Inspirations

| Phenomenon | Design Yield |
| --- | --- |
| **River Flow** | Gentle curves and rhythmic patterns |
| **Stone Fracture** | Layered textures and sharp edges |
| **Tree Branching** | Hierarchical structure and organic proportion |
| **Seasonal Light** | Shifting color temperature and shadow play |
| **Erosion & Sediment Layers** | Gradual transitions and strata patterns |
| **Wind Patterns** | Draped motion and flow in fabric |
| **Water Reflection** | Subtle highlights and symmetries |
| **Moss Growth** | Soft textures and organic carpets |
| **Geological Formations** | Monumental stability and purity of form |

Each visual element is derived from a *measurable* natural phenomenon, so the brand aesthetic is consistent and repeatable.

## Design Principles

All Olibana designs must adhere to the following foundational principles.

1. **Structural Logic** — Every form must have a clear structural origin or rule in nature. No whimsy, no gratuitous ornament. Grounding forms in natural structures ensures each element has purpose and meaning.
2. **Simplicity** — Eliminate anything unnecessary; focus on essential lines and proportions. In practice: remove every last element until there is nothing left to take away. This echoes how nature achieves complexity through elegant simplicity.
3. **Timelessness** — Avoid fleeting trends. A design should feel fresh *independent of era*. Great design does not chase trends; it stays relevant regardless of time or place. We prioritize enduring aesthetics over novelty.
4. **Precision** — Shapes, spacing, rhythm, and proportion must be consistent and deliberate. We apply mathematical and algorithmic rigor where possible. Every curve and angle is controlled according to a rule derived from nature.
5. **Silence (Calmness)** — The design should communicate serenity rather than shout for attention. "Silence" means purposeful negative space and restraint — letting the eye pause and breathe. By avoiding excess, each remaining element gains power and meaning.
6. **Originality** — Never copy luxury-brand clichés or pastiche Japanese crafts. Olibana's identity comes from the *concept*, not from borrowed tropes.

Each design is evaluated against these principles as a checklist before approval. See [`Design_System.md`](./Design_System.md) for the full evaluation criteria.

## Design Research System

The project is organized into a set of natural **Atlases**. Each Atlas studies a category of phenomena in nature and extracts design rules from it. This structure guides research and AI-assisted creativity, ensuring every idea is rooted in real-world observation.

- **[River Atlas](./River_Atlas.md)** — Fluid flow, turbulence, curve radius, river width, surface reflection, stone placement. Extracts *rhythmic proportions*, *sinuous line systems*, and flow-inspired silhouettes.
- **[Stone Atlas](./Stone_Atlas.md)** — Rock fracture, stratified layers, weathering patterns, edge geometry. Extracts *surface language* (texture) and *edge rules* — how fractures create faceted planes and polygons.
- **[Forest Atlas](./Forest_Atlas.md)** — Tree branching, bark texture, canopy density, species-specific structure. Extracts *hierarchical ratios*, repeatable patterns (e.g. Fibonacci branching), and growth-inspired proportion systems.
- **[Light Atlas](./Light_Atlas.md)** — Dawn/noon/dusk illumination, seasonal light shifts, shadow softness, atmospheric color. Extracts *lighting rules*, *contrast systems*, and *color relationships*.

*Future expansions: Wind, Mist, Sound, Material — each with its own Atlas.*

These Atlases are the **raw research data** feeding the design engine. By analyzing and parameterizing natural forms, we convert them into quantifiable design rules.

---

## Repository Map

| File | Purpose |
| --- | --- |
| [`README.md`](./README.md) | High-level vision, philosophy, and design guidelines (this document) |
| [`Brand_Bible.md`](./Brand_Bible.md) | Brand mission, values, and identity vocabulary |
| [`Character_Bible.md`](./Character_Bible.md) | Brand persona and tone descriptors |
| [`River_Atlas.md`](./River_Atlas.md) | Water flow, curvature, reflection — study guide |
| [`Stone_Atlas.md`](./Stone_Atlas.md) | Fracture, strata, edge geometry — study guide |
| [`Forest_Atlas.md`](./Forest_Atlas.md) | Branching, bark, canopy — study guide |
| [`Light_Atlas.md`](./Light_Atlas.md) | Time of day, season, shadow, atmosphere — study guide |
| [`Design_System.md`](./Design_System.md) | Core design language rules, evaluation criteria, metrics, and workflow |
| [`CHANGELOG.md`](./CHANGELOG.md) | Version history of this specification |

## How to Use This Spec

This spec is the **authoritative guide** for Olibana. Any designer or design AI generating designs or assets must reference the appropriate Atlas data and Principles.

- Locate the relevant section before designing or evaluating anything (e.g. `River_Atlas.md` for silhouette flow).
- The Brand and Character Bibles inform tone and image direction.
- Prompts should name the source rule — e.g. *"apply River Atlas curvature of radius ~100 m to the coat hem"* — and ask for justification of each design choice against the philosophy.
- All final assets (sketches, renderings, copy) are cross-checked against the Design Principles above and the Evaluation Criteria in `Design_System.md`.

Onboarding is designed to work one file at a time, and updates to the philosophy propagate through the Atlases and checklists.

## Next Steps

- Populate detailed Atlas data tables with real measurements and worked examples.
- Maintain the version history in `CHANGELOG.md` as research deepens (`v1.0`, `v1.1`, …).
- Open the Material, Wind, and Mist Atlases once the four founding Atlases carry field data.

**Sources of approach:** biomimicry and timeless design principles — the basis of our commitment to structure, simplicity, and enduring elegance.
