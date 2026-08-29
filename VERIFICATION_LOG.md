# VERIFICATION LOG

**Required by:** SSOT v2.0 §20 (`LAST_VERIFICATION`), §28 (verification evidence)
**Scope:** every verification run whose result was used to justify a state claim.

Tiers: `V0` static · `V1` unit · `V2` integration · `V3` end-to-end · `V4` adversarial/mutation · `V5` regression · `V6` production-boundary.

> **V3 reached for the website** (real browser, real HTTP). **V2 reached for order persistence** (real filesystem, reload across instances). **Concurrency and crash durability are now exercised** with spawned processes (V-2026-08-15-010). Payment and the production boundary remain unexercised.

---

## V-2026-08-24-031 · V0 + V1 + V3 + V4 · Visual and content integration: the leaf stops being a dead end

| | |
| --- | --- |
| **Target** | `src/site/product-page.ts`, `src/site/routes.ts`, `src/site/styles.ts`, `scripts/visual-check.mjs`, `test/site/product-page.test.ts`, `test/site/ui.test.ts` |
| **The product page's two gaps, both found by reading the built HTML** | A garment with `naturalRule: null` **omitted the section entirely** — so "this garment's rule has not been written yet" and "this brand does not do that here" rendered identically. Every other gap on this site goes through `awaiting()`; the rule block was the last exception, and it is now disclosed with the reason (R-02: no Fashion Specification exists) and none of its three fields invented. And the page's **only outbound links were header and footer chrome**: the leaf of the hierarchy had nowhere to go. |
| **Related navigation, derived** | "Where this leads" carries the cited Atlas — or `/nature` when the citation names something this site does not publish — plus Design Language. Every entry is a route the manifest built, carrying **that route's own title and description**, so the block cannot name a page that does not exist or describe one differently from how it describes itself. `baseRoutes` now builds the world pages before the products so the derivation reads real routes; the emitted order is unchanged. |
| **Philosophy: the two relationships that were missing** | The page stated that every form must trace to a measurable structure and then stopped — never saying where those measurements live, or what stands between a rule and a garment. Both answers already existed in the source documents and neither was on the site. *Where the rules come from* (README Design Research System) now **links all four Atlases**; *From a rule to a garment* (Design_System.md Design Iteration Process) gives the seven steps, and says plainly that nothing has passed step seven — which is why nothing is for sale. |
| **Design Language: the running system, read back out of it** | Spacing and motion tokens are published from `rootTokens()`, which parses `stylesheet` itself. Not indirection for its own sake: the alternative is a page listing `8px` beside a token that has since become `10px`, which is the second-copy failure this repository has already hit with the motion tokens, the search index and the router's type scale. Bare `:root` only, so a light-state redefinition is never published as if it were the scale. The measure sentence is generated from `--measure`. |
| **Claims pinned to evidence** | The new *How this serves the writing* section asserts enforcement, and an unenforced assertion about enforcement is the worst copy this site can carry. Each claim is tied by test to the check behind it — `findLoadBearingMotion` in `styles.ts`, the resting-opacity sweep and the off-scale type check in `visual-check.mjs` — the same discipline the accessibility page has carried since cycle 29. |
| **Defect in the checker, not the page** | The browser reported four 19px targets on Philosophy. SC 2.5.8's Inline exception was implemented but read `parentElement` directly, so `<li><strong><a>River Atlas</a></strong> — Fluid flow…</li>` failed it: the parent was `STRONG`, `STRONG` was not in the container list, and a link mid-sentence was reported as an isolated target. **Bolding a link does not take it out of its sentence.** The exception now climbs past inline formatting to the nearest block container. The threshold was not touched. |
| **Defect found by building a control case** | Planting a deliberately undersized isolated link on the accessibility page produced **no error at all** — because that page, the one publishing this site's accessibility claims, was the single content route the render matrix never loaded. It is now in the matrix. 72 renders, up from 66. |
| **Mutation — 7 planted, 7 correct outcomes** | M1 the rule absence reverts to silent omission → killed (2). M2 the absence renders as a note rather than an absence → killed. M3 an unpublished Atlas gets a guessed slug → **SURVIVED**. M4 the related note is replaced with generic copy → killed. M5 `rootTokens` stops filtering to bare `:root` → killed. M6 (control) an isolated 19px target is planted → **reported on all 6 renders**, so widening the Inline exception did not disable the check. M7 (control) the wrapper climb is removed → the four Philosophy links are flagged again, so the fix is load-bearing. |
| **What M3's survival exposed — my own test defect** | The mutant dropped the Atlas destination from the related block and every assertion still passed, because `page.includes('/en/nature')` was matching **the site header's Nature link**. A test that cannot tell the block it is about from the furniture around it verifies nothing. The three related-navigation tests now extract the block first; re-run under the same mutant, M3 is killed. |
| **Executed** | 464/464 tests (from 453). **72 browser renders** — 12 routes × 3 viewports × 2 colour schemes — exit 0. Deployment auditor against a local fixture deployment: 17 passed, 0 failed, **1 unverified** (no product is published, so no valid checkout exists to write an intent through) — exit 3, unchanged from prior cycles and not a regression. |
| **Motion budget** | **L1 12 → L2 7 → L3 1.** Descending. L2 rose from 2 because Design Language gained four sections; the accessibility page enters at 4, below its layer's 7, which is the reassuring mode reducing what the layer allows. |
| **Observation, not a failure** | Philosophy at mobile is **42% empty space** against 02 §5's 40% floor for Layer 1 — the tightest margin on the site, and the direct cost of the two new sections. It passes as measured. The next addition to that page has two points of headroom and should expect to spend them. |
| **Gates unchanged** | GATE-004 Atlas field data — **0 rows**. GATE-005 product photography — **0 images**; the 4:5 slot still holds no picture. GATE-001/002/003 unchanged. **COMPLETION remains FALSE.** |
| **Commit** | written against `8634bcb` |

---

## V-2026-08-24-030 · V0 + V1 + V3 + V4 · The leaf of the hierarchy: Atlas ↔ garment

| | |
| --- | --- |
| **Target** | `src/site/atlases.ts` (new), `src/site/routes.ts`, `src/site/product-page.ts`, `test/site/contracts.test.ts` |
| **What the hierarchy showed** | Home → Philosophy · Design Language · Atlases → Atlas 1–4 → **garment / measurement**. Everything above the leaf already matched the site's navigation. The leaf did not exist in either direction. |
| **03 §6, the connection this is** | *"The directive's central UX claim (§25) is that philosophy and commerce must connect."* Two of §6's five connections are now built. **Atlas → Product** ("Garments from this rule") was absent entirely. **Product → Atlas** existed as a Natural Rule block that rendered its source as **plain text** — so a reader told a garment comes from the River Atlas had no way to go and read it. Philosophy and product were on the same page and still not connected. |
| **Derived, in both directions** | The join is the `naturalRule.atlas` a garment already records, matched against the Atlas registry. Nobody maintains a list: the day a garment is published citing the River Atlas, it appears on that page and that page appears on it. A hand-kept list is the version that goes stale, and this repository has watched five things go stale by being written down twice. |
| **A new module, to remove a cycle rather than to tidy** | The route manifest builds the Atlas pages, the product renderer builds the products, and the manifest already imports the renderer. Putting the Atlas registry in either would make the other import it back, so it lives in `atlases.ts` and neither owns it. |
| **The decision inside the join** | `atlasByTitle` returns **null** for a title this site does not publish, and a null renders as plain text rather than a link. `Design_System.md` records a Material Atlas as "a planned expansion", so a product citing one is a real possibility — and guessing `/nature/material` from the string would be a 404 with a plausible name, which is the two dead `.md` links arrived at more cleverly. |
| **The test that matters is not the empty one** | A section that is always empty is indistinguishable from a section wired to nothing, and this repository has shipped that exact thing five times. So a garment is published against a temporary catalogue and the River Atlas is **required to find it** — and the Stone Atlas is required not to. |
| **Mutation — 5 planted, 5 killed** | M1 the Atlas lists every product rather than the ones citing its rule → 1. M2 the connection is a hardcoded empty state that never populates → 1. M3 the product's source reverts to plain text → 1. M4 an unpublished Atlas gets a guessed link → 1. M5 the absence stops naming what is missing → 2. |
| **What stays unbuilt, and is asserted unbuilt** | §6's other three connections — Article → Product, Collection → Atlas, and the Rule Layer overlay — depend on journal articles, collections and Atlas field data, none of which exist. None is stubbed, and a test asserts no page ships a Rule Layer while there is no data behind it. |
| **Executed** | 453/453 tests (from 449). **66 browser renders** — 11 routes × 3 viewports × 2 colour schemes — exit 0. Deployment auditor on a real fixture deployment: **every check passed**. |
| **Motion budget** | **L1 12 → L2 2 → L3 1.** Descending, unchanged. |
| **Gates unchanged** | GATE-004 Atlas field data — **0 rows**. GATE-005 product photography — **0 images**. This cycle makes the *shape* of the connection real; §6 records that all five connections block on the same two inputs, and both are still missing. GATE-001/002/003 unchanged. |
| **Commit** | written against `f78f7ec` |

---

## V-2026-08-24-029 · V0 + V1 + V3 + V4 · Content depth, and a check for the failure that keeps recurring

| | |
| --- | --- |
| **Target** | `test/meta/no-dead-surface.test.ts` (new), `src/site/product-page.ts`, `src/site/routes.ts`, `src/catalog/catalog.ts`, `test/site/ui.test.ts` |
| **My own defect, found first** | `absentPhotography()` and `note()` — introduced last cycle — had **zero callers**. That is the fifth time this repository has shipped something defined and never invoked (the motion tokens, the light states, `indexAtlas`, the router's second type scale, and now mine), and the first time I caused it. |
| **So the check exists now, not the apology** | `test/meta/no-dead-surface.test.ts`: every `export function` and `export async function` in `src/` must be called from `src/`, or carry an annotated reason why it is called from outside. **A function with no caller has no behaviour to be wrong** — which is why every one of those five was invisible to the whole suite while the feature did not exist. Anchored by a control that fails if the check stops reporting anything, and by a check that an exemption still names a real export, so a stale exemption cannot silently un-cover a name. |
| **What it found on its first run: 12 orphans, 4 of them real** | (1) `isProductEventId` — **zero callers anywhere, not even a test.** Deleted. (2) The catalogue validated a product code by **fabricating `${code}-XXX-M` and parsing that**, while the purpose-built `parseProductCode` sat unused — the check worked, and tied code validation to `-XXX-M` remaining a valid colour and size forever. Now uses the parser. (3) `isId` was **imported into `catalog.ts` and never used** from the cycle the catalogue was written, which surfaced that (4) **`productId` is never validated at all.** |
| **A decision, not a fix, on productId** | Enforcing the ULID shape would make every fixture in this repository an unreadable string, and the id is an internal key from the authoring path that never crosses a trust boundary — unlike the code and the SKU, which appear on pages and inside orders and are both checked. Recorded on `assertWellFormed` **so the next reader does not mistake it for the oversight it looked like.** |
| **Two defects in my own checker, both caught by it failing** | It matched `^export function` only, so **every `export async function` was invisible to a check whose whole job is finding what nothing looks at.** And the stale-exemption test read only `src/`, so `onRequest` — which lives in `functions/` — was reported as a stale exemption when the exemption was correct. |
| **A false claim, live for eight cycles** | The accessibility page said *"no screen-reader testing, no automated accessibility audit, and **no colour-contrast validation** has been run against this build."* Contrast validation has run since cycle 21 — per element, in both light states, at three widths, and it **found and fixed a site-wide AA failure**. The page now states what was measured and what was not, and the honest remainder (screen-reader testing, a full audit, and the palette still being provisional) is an `awaiting()` state. |
| **And the claims are now pinned to their evidence** | Found by a mutation that **SURVIVED**: flipping "What has been measured" to "What has not been measured" changed nothing, because nothing tied the page's factual claims to the checks that exist. Each claim now names the evidence that makes it true, so adding a claim with no evidence fails. That is the only thing that stops this page drifting back into fiction, and drifting is exactly what it did. |
| **Content depth** | The home page linked to the four Atlases and nothing else — Philosophy and Design Language were reachable only from the nav bar, so the two pages explaining *why* the Atlases matter were the two the portal never sent anyone to. Both destinations already existed; this is information architecture, not new content. Every section now states its purpose. The product page carries the 4:5 photography slot where a garment photograph will land, and holds no picture. |
| **Mutation — 5 planted, 5 killed, one after a repair** | M1 the product page shows an invented garment photograph → 1. M2 the pre-order explanation becomes an absence again → 4. M3 an exported function loses its only caller → 1. M4 the catalogue reverts to the fabricated-SKU check → 1. **M5 the accessibility page reinstates the false claim → SURVIVED**, and is killed after the claim-to-evidence test above. |
| **Executed** | 449/449 tests (from 445). **66 browser renders** — 11 routes × 3 viewports × 2 colour schemes — exit 0. Deployment auditor on a real fixture deployment: **every check passed**, `/health` cross-checked rather than believed. |
| **Motion budget** | **L1 12 → L2 2 → L3 1.** Descending. L1 rose from 9 because the home page gained a section and two destinations — the absolute number follows the content; the descent is the invariant and it holds. |
| **Gates unchanged** | GATE-004 Atlas field data — **0 rows**, nothing fabricated. GATE-005 product photography — **0 images**; the slot is reserved and empty. GATE-001/002/003 unchanged. |
| **Commit** | written against `896c4aa` |

---

## V-2026-08-24-028 · V0 + V1 + V3 + V4 · UI depth without new claims

| | |
| --- | --- |
| **Target** | `src/site/wayfinding.ts` (new), `src/site/states.ts` (new), `src/site/routes.ts`, `src/site/styles.ts`, `test/site/ui.test.ts` (new) |
| **Scope note — what was NOT built, and why** | The brief asked for a search interface with filtering and sorting. **03 §4 explicitly hides SEARCH in MVP-0**, and building it would contradict the locked IA. The §7 schema stays as §7 asks — defined before search is built. Loading states are also absent and stay absent: the site ships no JavaScript, so there is no interval during which a page is partly there. Inventing skeletons for it would be UI for a state that does not occur. |
| **The gap that was real** | 03 §4 lists **"Current location always indicated"** as a navigation rule, and it was half met: the nav carries `aria-current`, so a reader on `/en/nature` knows where they are and a reader on `/en/nature/river` gets nothing — River is not a nav item. **Every nested route on the site had that gap.** Both the trail and the sibling links are now derived, from the path and from the manifest; a hand-written breadcrumb is a third copy of the hierarchy after the URL and the manifest, and it is the copy that goes stale because nothing breaks when it does. |
| **A trail that refuses to invent an ancestor** | `/legal/accessibility` has no `/legal` page. A crumb linking to one would be a dead link with a plausible name, which is worse than no crumb — the reader trusts it and lands on a 404. Segments with no route contribute nothing. |
| **Two states that had been one** | Five blocks used the same `.state` box for two meanings: *"no field measurements have been recorded"* (a fact about the world) and *"this is a pre-order, payment is taken when you order"* (an explanation). On a site with this many deliberate gaps, that made every gap indistinguishable from every footnote. `awaiting()` and `note()` are now different components with different shapes, and `awaiting()` takes the subject and the reason **separately** so an absence has to name what is missing. It has no `when` parameter and no way to add one without editing the file: "coming soon" and "expected in spring" are the two most common lies on an unfinished site, and 02 §7's honesty block rejects both. |
| **The 404 was the page guaranteed to go stale** | It named three addresses by hand and had already missed Design Language and all four Atlases — the one page a reader reaches when an address is wrong. Built from the manifest now, so it lists what the site actually holds. |
| **Defect found by measurement, in this cycle's own change** | Rebuilding the 404 from the manifest took it from three links to nine, and `.index li` carries the forest reveal on layers 1 and 2 — so **Layer 2 rose to 11 animations against Layer 1's 9 and the descending budget broke.** The check caught it on the run that introduced it. §3's mode table gives Reassuring "Low", which the layer alone cannot express: the 404 and the confirmation sit on layers 2 and 3 beside pages meant to move. A mode now **reduces** what a layer allows and can never add — asserted, so a reassuring rule that started an animation would fail. A page a reader reaches because something went wrong is the last place to stagger nine items at them. |
| **Mutation — 5 planted, 5 killed** | M1 the trail invents an ancestor from a URL segment → 2. M2 the current page becomes a link to itself → 2. M3 sibling navigation reuses the animated `.index` class → 1. M4 absence and note share one box again → 2. M5 the reassuring reducer is dropped → 1. **M3 reported a kill on its first run without having applied** — a shell-escaping error in my own harness — and was re-run properly. That is the second time this has happened, and the lesson from cycle 26 held: every mutation confirms it applied before its result is read. |
| **Executed** | 445/445 tests (from 430). **66 browser renders** — 11 routes × 3 viewports × 2 colour schemes — exit 0. No overflow, no unpainted text, no undersized target, no contrast failure in either light state, image still natural 960×320 with CLS 0.00. |
| **Motion budget** | **L1 9 → L2 2 → L3 1.** Descending. L2 moved from 3 to 2 because the 404 previously contributed 3 and now correctly contributes 0 — the absolute numbers followed the content, the descent is the invariant and it holds. |
| **Result** | **PASS.** More UI, no new claims: every added surface is derived from data the system already holds. |
| **Gates unchanged** | GATE-004 Atlas field data — **0 rows**, nothing fabricated, not counted as complete. GATE-005 product photography — no image added; `absentPhotography()` reserves the box at the 4:5 portrait crop and holds no picture. GATE-001/002/003 unchanged. |
| **Commit** | written against `5ba1e39` |

---

## V-2026-08-24-027 · V0 + V1 + V3 + V4 · The media contract, and the first image

| | |
| --- | --- |
| **Target** | `src/site/media.ts` (new), `src/site/specimen.ts` (new), `src/site/build.ts`, `scripts/serve.mjs`, `scripts/visual-check.mjs`, `test/site/media.test.ts` (new) |
| **The constraint this cycle turned on** | The instruction was to implement imagery with real assets. **The repository contains zero image files** — searched, not assumed. No garment has been made, so none has been photographed, and a generated or stock image standing in for a coat is not a placeholder but a depiction of a product that does not exist (02 §7, automatic rejection). So no photography was invented, and GATE-005 records why. |
| **What could honestly be shown** | The construction palette and the type scale — real, because they are the values the page is served in. A specimen of them is not a picture standing in for something absent; it is the thing itself. **Generated from the tokens**, so a palette change changes the image or the build fails: a hand-drawn SVG with the same hex values would be the second-copy-that-agrees-today failure this repository has now hit with motion tokens, with the search index, and with the router's own type scale. |
| **Built with exactly one real caller, deliberately** | `MediaAsset` requires `alt` and integer intrinsic dimensions **in the type**, so an inaccessible or layout-shifting image cannot be constructed. A media system with no caller would have repeated the precise mistake of the last three cycles — code that looks finished and runs nowhere. |
| **Defect 1, and the reason the check exists at all** | The image **did not render**. `scripts/serve.mjs` had no MIME type for `.svg`, so it served `application/octet-stream`, and the site's own (correct) `nosniff` header made the browser refuse it. The page looked right: the box was reserved, CLS stayed 0.00, and the alt text filled the space. Only asking the browser for `naturalWidth` found it — that measurement was added in this cycle and caught the defect on its first run. An unmapped extension now logs rather than falling through in silence. |
| **Defect 2, found by a screenshot and by nothing else** | In dark mode the labels were black on a #1A1A1A ground and the `--construct-900` swatch was invisible against a page of exactly its own colour. Cause: **an SVG loaded through `<img>` is an independent document and inherits nothing**, so `fill="currentColor"` resolved to its own default. Every automated check passed — the file loaded, and page-level contrast measurement does not look inside an image. The specimen now carries its own `prefers-color-scheme` stylesheet (**17.4:1** daylight, **15.55:1** dusk, measured) and every swatch a hairline, because two of the six ARE a ground colour. |
| **A test of mine that was simply wrong** | One asserted the specimen *should* use `currentColor`. The dark-mode screenshot disproved it. Inverted, with the reason recorded in the test rather than in a commit message nobody reads at the failure site. |
| **A measurement error of mine, caught before it became a fix** | The ratio-drift check compared `getBoundingClientRect()` (includes the 1px border) against `naturalWidth` (does not) and reported a 0.03 drift at mobile that was entirely the hairline. Fixed by measuring the content box — **not** by raising the threshold, which is how a real drift gets through later. |
| **Mutation — 5 planted, 5 killed, one after a repair** | M1 alt no longer required → 1. M2 intrinsic dimensions no longer required → 1. M3 specimen back to `currentColor` → 2. M4 only the white swatch outlined → 1. **M5 dropped the specimen from the production guard and SURVIVED** — the stylesheet also carries construction tokens, so the guard still threw for the stylesheet's reason. An equivalent mutant today and a hole the day the brand palette lands and the stylesheet is cleaned, at which point the specimen becomes the only artifact carrying them. `productionArtifacts()` now names the coupling and a test asserts it; M5 re-run is killed. |
| **Executed** | 430/430 tests (from 414). **66 browser renders** — 11 routes × 3 viewports × 2 colour schemes — exit 0. Image: declared 960×320, **natural 960×320**, rendered 692×232 desktop / 358×121 mobile, ratio drift 0.000, **CLS 0.00**, payload 37.1KB against a 120KB budget, 0 scripts. Motion budget unchanged: **L1 9 → L2 3 → L3 1**. |
| **Result** | **PASS** for the media contract. |
| **Gates** | **GATE-005 added — product photography, BLOCKED_EXTERNAL.** GATE-004 (Atlas field data) unchanged, 0 rows, not fabricated. GATE-001/002/003 unchanged. |
| **Commit** | written against `73a58ca` |

---

## V-2026-08-24-026 · V0 + V1 + V3 + V4 · Cross-layer contract verification

| | |
| --- | --- |
| **Target** | `test/site/contracts.test.ts` (new), `test/http/not-found.test.ts` (new), `src/site/routes.ts` |
| **Scope** | Consistency and regression hardening only. No feature was added. |
| **The gap this closed, found by asking what the invariant rests on** | Cycle 25 claimed page and search index "cannot disagree" because both call `countAtlasDataRows`. That was true only because **`indexAtlas` was called by nothing** — there was no index to disagree with. An invariant that holds because one side is absent is not an invariant. The index is now a projection carried BY each route (`Route.search`), so page and entry are one object rather than two derivations that agree today. |
| **1 · SEARCH ↔ PAGE ATLAS** | `naturalRule !== null ⟺ atlasSource !== null`, asserted over the real manifest rather than fixtures. Checked twice: against the route object, and against **the HTML that actually ships**, because a renderer could drop a section after the entry was computed. |
| **2 · DISABLED LOCALE** | Five layers in one loop — route, generated file, sitemap, `hreflang`, search index — because checking them separately is exactly how a locale ends up gone from the routes and still in the sitemap. Paired with the inverse ("an enabled locale IS present in all five"), without which the test would pass against a build that emits nothing. |
| **3 · CONTENT DELETION** | `source !== null → enabled`, and `enabled` is not a field, so there is nothing to set. Asserted against **the locale that is actually enabled**, with its content removed — see M4. |
| **4 · HOST 404 CONTRACT** | `/`, `/en/`, `/ja/`, `/ja/nature`, `/nonexistent` across **both** servers: the local static path and `onRequest` driven as Pages drives it. They share the router and do *not* share what happens when it declines, which is precisely where a 404 contract diverges. Compared directly rather than checked separately — two servers that each satisfy the contract can still differ, and that difference is what a reader experiences as "it works locally". |
| **5 · ADR INDEX** | Both directions now: a file the index omits (the ADR-009 regression, kept) **and** an index entry pointing at a file that does not exist. Plus a guard that the file list is non-empty, so it cannot pass vacuously. |
| **Mutation — 5 required, 5 killed, and two of the five were wrong on the first run** | M1 page shows measurements while the index denies them → **2 tests**. M2 index claims a source the page denies → **7**. M3 disabled locale leaks into sitemap/hreflang/search → **8**. M4 `enabled` keyed on the locale's name rather than its content → **1**. M5 no root `404.html`, so deployed and local 404s diverge → **5**. |
| **The two that were wrong, recorded because the record is the point** | **M1 first reported SURVIVED — it had never applied.** My replacement used six spaces of indentation where the source has four, so the file was untouched and the green result was a measurement of nothing. A mutation that does not apply looks exactly like a mutation that was not caught. Every mutation now confirms it applied before its result is read. **M4 first reported SURVIVED and was an EQUIVALENT MUTANT**: `locale.code === 'en' \|\| source !== null` changes nothing while `en` has content. But it exposed a real gap — every content-deletion test used a hypothetical `ja`, and none took the locale that is *actually* enabled and removed its content. That test now exists, and the re-run of M4 as a non-equivalent mutant is killed by it. |
| **Executed** | 414/414 tests. 60 browser renders across 10 routes × 3 viewports × 2 colour schemes, exit 0. Motion budget unchanged: **L1 9 → L2 3 → L3 1**. Real fixture deployment: `/` 200, `/en/` 200, `/ja/` **404 with this site's own document and no English content**, `/ja/nature` **404**, `/nonexistent` **404**. Deployment auditor **18 passed · 0 failed · 0 unverified**. |
| **Result** | **PASS** for all five contracts. |
| **GATE-004 — unchanged, and now trigger-armed** | 02 §4.1 remains **BLOCKED_EXTERNAL**. No Atlas field data was fabricated and no synthetic fixture was added to satisfy it; the four Atlases hold **0 rows**, and a test asserts that total is zero *and* that nothing in the index cites an Atlas. The day real rows arrive that test fails, which forces the gate to be re-examined rather than left blocked out of habit. Re-entry still requires real data, recorded provenance, and 03 §3's 12-row threshold. |
| **Commit** | written against `af402c5` |

---

## V-2026-08-24-025 · V0 + V1 + V3 + V4 · Contract alignment: ADR-010, the search schema, and a parser regression closed

| | |
| --- | --- |
| **Target** | `docs/adr/ADR-010-launch-locale-route-policy.md` (new), `src/site/locales.ts` (new), `src/site/search.ts` (new), `src/site/routes.ts`, `src/site/layout.ts`, `test/site/locale.test.ts` (new), `HUMAN_GATE_QUEUE.md` |
| **Conflict resolved** | 03 §5 requires locale-prefixed routes from launch; 03 §1 forbids routes that cannot be truthfully filled; no Japanese or Korean translation exists; and `16_INTERNATIONALIZATION.md`, which §5 references, **is not in the repository**. Serving English from `/ja/` would represent the page as localized when it is not. ADR-010 resolves it the way ADR-009 resolved the cart: §5 asks for locale-aware *architecture*, not fabricated translations. |
| **Built** | A locale registry where **`enabled` is derived, not declared** — a locale is enabled if and only if it declares content, so there is no flag anyone can set without supplying the translation. `en` ships; `ja` and `ko` are declared (the architecture is real) and produce no routes, no files, no sitemap entries and no `hreflang`. Every content address is now `/en/…`. |
| **The tempting implementation is the forbidden one** | `splitLocale('/ja/nature')` returns **null**, not the default locale. ADR-010: "No fallback from /ja/ or /ko/ to English content will be presented as localization." A fallback is what most i18n layers do by default, which is exactly why it is asserted rather than assumed. |
| **What a static host needed, found by thinking about the host rather than the router** | A root `404.html`, because that is the document a static host serves for an address it cannot match — including `/ja/nature`. Without it a disabled locale would reach **Cloudflare's** error page and ADR-010/4 would hold by accident. And `/` continues to serve, canonical `/en/`: a redirect needs host-specific configuration, and one present only on Cloudflare would make local and deployed disagree about the site's most requested address — the drift class this project has been bitten by twice. |
| **03 §7 search schema** | §7 says search is **not built** in MVP-0 and asks for the schema now "so the index is not retrofitted". Six entity types, nine fields, every unknown `null` rather than optional — an optional field lets a producer forget, a nullable one makes it say whether it knows. The strongest rule: `naturalRule` and `atlasSource` must both be present or both be null, because a rule with no Atlas behind it is a claim with no measurement behind it, and answering *"which garments come from stone?"* from an invented rule is the one thing this brand cannot do. An unmeasured Atlas is indexed with `atlasSource: null`, decided by `countAtlasDataRows` — the same function the page uses, so index and page cannot disagree about whether data exists. |
| **02 §4.1 — BLOCKED_EXTERNAL, recorded as GATE-004** | The Rule Layer renders only from real Atlas rows; all four hold zero. Removed from executable acceptance. Re-entry: authoritative field data **with its provenance recorded**, at 03 §3's threshold of 3 records per Atlas, 12 total. The risk is not that someone forgets to build it — it is that someone builds it against plausible numbers, so the constraint is enforced by the schema and asserted by a test that will fail the day rows arrive. |
| **Mutation — 4 planted, 4 killed** | M1 make `isEnabled` return true (enable `/ja/` with no Japanese) → **5 tests fail.** M2 fall `/ja/` back to English → 1 fails. M3 allow a `naturalRule` with no `atlasSource` → 2 fail. M4 restore the string-blanking parser → 2 fail. |
| **Parser regression closed** | `declarations()` erased attribute-selector values, collapsing `[data-layer="1"]` and `[data-layer="2"]` into one indistinguishable selector — the defect found in cycle 22, now covered by the two regression tests requested, plus a third asserting the brace-in-a-string behaviour the blanking existed to provide is still there. |
| **Executed** | Real fixture deployment: `/ja/` **404**, `/ja/nature` **404**, `/en/nature` **200**, `/` **200**. Auditor **18 passed · 0 failed · 0 unverified**. Browser: 66 renders (11 routes × 3 viewports × 2 schemes), exit 0; motion budget still descends L1 9 → L2 3 → L3 1; `/ja/` renders this site's 404, not English. |
| **Observed** | 397/397 pass (from 378). |
| **Result** | **PASS** for ADR-010's five acceptance criteria, 03 §7, and the parser regression. |
| **Still blocked** | GATE-001 (Cloudflare credentials) · GATE-002 (legal entity) · GATE-003 (payment account) · **GATE-004 (Atlas field data)**. None is a code defect. |
| **Commit** | written against `dc61715` |

---

## V-2026-08-24-024 · V0 + V3 · The silence budget, measured instead of assumed

| | |
| --- | --- |
| **Target** | `scripts/visual-check.mjs`, `src/site/styles.ts`, `src/http/router.ts` |
| **Bottleneck selected** | 02 §5 gives seven numeric thresholds and calls them "review thresholds, not laws of physics: exceeding one requires a written reason". **One of seven was checked.** A threshold nobody measures cannot be exceeded deliberately, which is the opposite of what §5 asks for. |
| **Measured, all seven, 48 renders** | Empty space on Layer 1 screens: **43–80%** against §5's ≥40% floor — passes, and the tightest is philosophy at mobile. Calls to action: **max 1** against 1 primary + 1 secondary. Layer 1 statement: **16 words** against ≤25. Nav items: ≤8 (already checked). Concurrent primary motions: covered by cycle 22's per-layer budget. **Distinct type sizes: 6 on home, 5 on philosophy, 4 on product, 2 on the confirmation surfaces — against a ≤3 threshold.** |
| **Defect 1 — a size on no scale** | `code { font-size: 0.9em }` resolved to **14.4px**, reachable by no token in this system. 02 §2 states Precision as a lint rule, not a preference: "type sizes come from the scale or they do not ship". A relative value that lands off the scale is an arbitrary value wearing a ratio. |
| **Defect 2 — a second type scale nobody knew existed** | The router's own pages — confirmation, sandbox, every refusal — use inline styles and deliberately no link to the built stylesheet, so they render even if the build never ran. That independence had quietly become independence from the design system: they were using `1.4rem`, **22.4px**, on no scale. Both now interpolate `TYPE_SCALE`, one exported constant, so there is one scale rather than two that agree today. |
| **The check that matters, and why it is not the count** | Every rendered font size must be **on the scale**, with the scale read off the document's own custom properties at runtime — correct at every breakpoint without restating the overrides. That is a hard failure. It caught both defects above; the ≤3 count would have caught neither, since 14.4px and 22.4px each merely add one to a number. |
| **Written exception, as §5 requires** | The ≤3 threshold is exceeded on home (6) and philosophy (5) and the reason is recorded in `styles.ts` against the measured numbers: those pages carry a title, a hero statement, section headings, body copy and captions, and collapsing five roles into three sizes would recover the distinctions with weight or colour, which §5 constrains harder than scale. One reduction **was** made on the evidence — the Atlas index title dropped to body size and takes its hierarchy from the rule above it and the space around it, which is §5's own rationale. The count is printed on every run so the exception stays visible rather than becoming a habit. |
| **A false positive in my own test, the fourth of this kind** | The 500-page leak test matched `/token/` and fired on a **CSS comment in that page** using the word in prose. Two fixes: the check now looks for a leaked *value* — an `OLIBANA_*` name, or `secret`/`token`/`password`/`api_key` followed by `:` or `=` — and the router's inline CSS now carries **no commentary at all**, because every byte of it is served to a visitor who reached that page because something failed. |
| **Observed** | 378/378 pass. Visual check exit 0 across 48 renders. |
| **Result** | **PASS**, with one documented exception carrying its measurement. |
| **Commit** | written against `e0558d7` |

---

## V-2026-08-24-023 · V1 + V3 + V4 · The failure nobody planned for

| | |
| --- | --- |
| **Target** | `src/http/router.ts`, `functions/[[path]].ts`, `scripts/serve.mjs`, `scripts/smoke-test.mjs`, `test/http/router.test.ts`, `test/http/deployment.test.ts`, `test/meta/deploy-audit.test.ts` |
| **Bottleneck selected** | Continuing the 03 sweep. §2 lists `/500` as a System route and §3 marks it ✅ ready in the MVP-0 table. It did not exist — and neither did anything that would serve it. |
| **Defect 1: the deployment had no error boundary at all** | `onRequest` called `optionsFor` and `handleRequest` with nothing around them. Anything that threw escaped to Cloudflare, which answers with **its own error page: no security headers, no `referrer-policy`, and content this project does not control on a domain carrying its name.** Not a remote path — `validateEnvironment` throws by design on a half-configured deployment, which is the most likely state of a first deploy. |
| **Defect 2: the local 500 and the deployed 500 were different systems** | `serve.mjs` answered a bare `text/plain` "internal error" with **no security headers**. The response most likely to be produced by a defect was also the one that differed most between local and deployed — environment drift on the error path, which is where a checker looks last. Both now render the same `internalError()` from the same function. |
| **What the page says** | Nothing about the error. No message, no stack, no identifier: it is rendered by code that just failed, on a request that may be hostile, and an error string is the most reliable way to hand an attacker the shape of a system. It takes no arguments and reads no store, configuration or build output — any of which may be what threw. A boundary that depends on the thing it is catching for is a second place to fail. |
| **A test rewritten, and why that is a strengthening not a weakening** | `deployment.test.ts` asserted `onRequest` **rejects** on a half-configuration. That was the weaker requirement: an exception escaping the function does not refuse a request, it delegates the refusal to the platform. The requirement is that it does not serve the site, which is now asserted directly — 500, `referrer-policy: no-referrer`, **`ASSETS.calls === 0`** (a refusal that still hands the request to the asset server has refused nothing), and no configuration variable named in the body. `validateEnvironment` still throws; that is asserted in the same test, so what it protects is unchanged. |
| **Auditor extended** | New check: a deployment that leaks internals on an error response fails. Three faulty deployments — a stack trace with a repository path, an `ENOENT` naming a log file, and a message naming `OLIBANA_WEBHOOK_SECRET` — each required to fail by name. Coverage 20 → 21 false deployments. |
| **Executed against a real deployment** | Fixture server, three awkward requests (a malformed percent-escape, a traversal attempt, a 4KB query string): **18 passed · 0 failed · 0 unverified, exit 0.** |
| **Limitation, stated rather than glossed** | Those probes did not actually provoke a 500 from the real server — worst observed status was 404, so what the run verified is that nothing leaked, not that a 500 is safe. The 500 page's own contents are covered at unit level and a leaking deployment is covered by the auditor's mutation cases; **no run has yet observed this system produce a genuine 500 in production.** That needs a deployment. |
| **Observed** | 378/378 pass (from 372). |
| **Result** | **PASS.** |
| **Commit** | written against `9886025` |

---

## V-2026-08-24-022 · V0 + V1 + V3 + V4 · The layer system: making the descending motion budget real and provable

| | |
| --- | --- |
| **Target** | `src/site/routes.ts`, `src/site/layout.ts`, `src/site/styles.ts`, `src/http/router.ts`, `scripts/visual-check.mjs`, `test/site/motion.test.ts` |
| **Sweep performed** | `02_BRAND_EXPERIENCE_SYSTEM.md` and `03_INFORMATION_ARCHITECTURE.md`, requirement by requirement, against runtime. |
| **Bottleneck selected** | 02 §3 states plainly: *"**Enforced in code:** the motion system reads the active route's mode. On Frictionless routes the brand motion layer is disabled at the provider level, not per-component. It cannot be re-enabled by an individual component."* And §8: *"Motion budget provably decreases from Layer 1 to Layer 3."* **No route carried a layer or a mode.** The field did not exist. The motion system had nothing to read, every page from the home portal to the purchase form carried identical rules, and "provably decreases" was unprovable because nothing measured it. `DEFINED_ONLY` at best — actually `SPEC_ONLY`. |
| **Built** | `layer: 1\|2\|3` and `mode` on every route, assigned from §3's own tables (nothing invented — each surface is classified where the document classifies it). Emitted as `<body data-layer data-mode>`, so the stylesheet applies the budget from one place. Every reveal rule is now scoped to the layers §3 permits it on, and `[data-mode="frictionless"]` kills animation with `!important` — which is what makes §3's "cannot be re-enabled by an individual component" true rather than remembered. |
| **Defect found by measuring, in the thing just built** | First measurement: **`L1 max=9 · L2 max=3 · L3 max=10`.** Layer 3 — the product page, the surface closest to a purchase — ran **more** motion than the home portal. The budget ascended toward the purchase, the exact inverse of §3, because `dl.facts > dt, dd` revealed every measurement row individually and a longer table would have raised it further. Layer 3 now reveals the detail list as **one** block: 04 §9's "forest (detail reveal) only — Minimal", read as one reveal. Re-measured: **`L1 max=9 · L2 max=3 · L3 max=1`**. |
| **Second defect: the router's pages declared no layer at all** | They bucketed as "L0" and produced a false failure against Layer 1. More importantly the measurement could not distinguish *"zero motion because the budget says so"* from *"zero motion because nobody looked"*. They now declare `data-layer="3"` with `frictionless` or `reassuring` per §3's mode table, so their silence is an observed property. |
| **Two defects in my own checkers, both found by the new tests failing** | (1) **`declarations()` was erasing attribute-selector values.** It blanked whole strings to keep braces from shifting the block stack, which turned every `[data-layer="1"]` into `[data-layer=""]` — four distinctly scoped rules collapsing into one indistinguishable selector. A parser that destroys the thing being checked reports agreement it never verified. It now masks only `{`, `}` and `;` inside strings. (2) **`animation-name: none` was flagged as an ungated reveal.** `none` removes motion; demanding it be gated on `@supports (animation-timeline)` would make *disabling* animation conditional on animation being supported — and 02 §3's kill-switch is exactly such a rule. |
| **Mutation — 3 planted, 3 killed** | M1 strip a layer prefix from one reveal (a flat budget returns) → caught. M2 drop `!important` from the frictionless kill-switch (a component can re-enable motion) → caught. M3 misclassify `/nature` as Layer 2 → caught. Plus one **found in the wild before any mutation was planted**: the ascending L3=10 budget, caught by the browser on its first run. |
| **Browser evidence** | 48 renders, exit 0. `motion budget by layer: L1 max=9 (home=9 nature=4 philosophy=2) · L2 max=3 (notfound=3) · L3 max=1 (product=1 shop=0 confirmation=0 sandbox=0)`. Non-increasing, read back from the animations actually running, grouped by the layer each page declares — §8's "provably" made literal rather than asserted in a comment. |
| **Silence budget (02 §5) — 2 of 7 now checked, up from 1** | Nav items ≤ 8 (was already checked) and Layer 1 statement ≤ 25 words (16 measured). The remaining five — concurrent primary motions, distinct type sizes per viewport, simultaneous CTAs, ≥40% empty space on Layer 1, ≤1 accent colour — are **NOT checked and are not claimed**. §5 itself calls them review thresholds requiring a written reason when exceeded, so they are recorded as unmeasured rather than assumed met. |
| **Observed** | 372/372 pass (from 367). Visual check exit 0. |
| **Result** | **PASS** for 02 §3, §8's first three acceptance criteria, and §5's two checkable thresholds. |
| **Still SPEC_ONLY after this sweep, recorded not implemented** | 02 §4.1 The Rule Layer (`BLOCKED_EXTERNAL` — needs Atlas field data + Fashion Spec; §4.1's own failure condition is that inventing numbers means removing it entirely). 02 §4.3 branching navigation reveal. 03 §5 locale prefix `/en/ /ja/ /ko/` — an unmet acceptance criterion, no locale routing exists. 03 §5 category filtering. 03 §7 search schema. 03 §2 `/500` and offline, listed ✅ in the MVP-0 table and absent from the build. 02 §7's visual-cliché and honesty checklists are human review, partly covered by existing tests. |
| **Commit** | written against `2f9e6ea` |

---

## V-2026-08-24-021 · V0 + V1 + V3 + V4 · The light-state system, activated and validated per state

| | |
| --- | --- |
| **Target** | `src/site/styles.ts`, `src/http/router.ts`, `scripts/visual-check.mjs`, `test/site/motion.test.ts` |
| **Bottleneck selected** | Same shape as cycle 20, one layer along. `05_VISUAL_SYSTEM.md` §4 specifies a three-state illumination system; `:root[data-light="dawn"]` and `[data-light="dusk"]` were defined in the stylesheet — and **nothing in the repository ever set `data-light`**. No page, no build step, no script (there is none). Searched, not assumed. Every visitor got daylight, and two of the three states were unreachable code that had never been rendered, let alone contrast-checked. |
| **Activation, from the specification rather than invented** | §4's own code sketch gives it: `@media (prefers-color-scheme: dark) { :root:not([data-light="daylight"]) { … } }`. That is the reader's stated preference. A time-of-day default was **rejected**: the server has no clock for the reader's timezone and the page cannot read one without JavaScript, so "dawn/daylight/dusk" is a description of the palettes, not a licence to invent the reader's local time. |
| **Constraint 4 is NOT implemented, and says so** | "Manual override persists" needs somewhere to persist it, and the site ships no JavaScript. The `[data-light]` hooks are the seam; recorded in the stylesheet rather than quietly dropped. |
| **Defect found — site-wide, in the state that has been live all along** | §4 constraint 3 says "All three states pass WCAG AA. Validated per state in CI." Nothing validated any state: the only contrast measurement in this project was the purchase button. Measuring every element that paints its own text found **`--content-tertiary` at 3.45:1 on the page ground — below WCAG 1.4.3 AA — in DAYLIGHT**, carrying the footer, every `.index-note` and every form hint, on every page, since the site was built. `--construct-500` is now `#767676` (4.54:1 measured). The `[data-light="dusk"]` state carried the same failure at 3.9:1 and now raises tertiary to `--construct-300`, matching the media block. |
| **A false positive in my own checker, caught before it became a fix** | The first contrast pass reported `1:1` on `a`, `p`, `li`, `label` and `strong` — an apparent site-wide catastrophe. It was the checker: the router's own pages leave the ground colour to the browser, so walking up for a background found nothing opaque, and the fallback parsed transparent as black. **A guessed background is a guessed conformance claim.** The walk now returns null and the run reports those elements as `UNVERIFIABLE` rather than computing a ratio — "could not check" is not "fine", the same rule the deployment auditor follows. |
| **And the underlying cause fixed rather than worked around** | Those router pages now declare `background: Canvas; color: CanvasText` instead of inheriting them. A colour nobody wrote down is precisely what produced the 1:1 purchase button, so leaving the ground implicit was a live instance of that class, not merely inconvenient for a checker. Contrast is now determinable from the page itself: zero UNVERIFIABLE across the run. |
| **Browser evidence** | 8 routes × 3 viewports × **2 colour schemes = 48 renders**, up from 24. Dusk had never been rendered before this run. Exit 0: no contrast failure, no undetermined background, no overflow, no unpainted text, no undersized target. Motion still observed running on `ViewTimeline` in both schemes, and still 0 animations under reduced motion. |
| **Unit-level equivalent, because a browser is not always present** | `contrastRatio` and `resolveRoles` compute the same property from the tokens, so §4 constraint 3's "validated per state in CI" holds in `npm test`. Four states × three text roles, plus the purchase button's inverted ground in each. Anchored by a control asserting the calculator on known pairs — 21:1, 1:1, and both the value that shipped and its replacement — so the check cannot pass by computing nonsense. |
| **Mutation — one killed, one SURVIVED and was closed** | M1: restore `#8A8A8A` → caught in two states. **M2: delete the entire `prefers-color-scheme` block → all 25 tests still passed.** With no activation the dark state resolves to daylight, daylight passes AA, and the suite was satisfied by the feature not existing. That is this cycle's own premise recurring one level up, and it is exactly how dusk survived unrendered since the stylesheet was written. A test now asserts the dark state resolves to a *different* ground than daylight; M2 re-run is killed. |
| **Observed** | 367/367 pass (from 363). Visual check exit 0 across 48 renders. |
| **Result** | **PASS.** §4: constraints 1, 2 and 3 hold and are checked; constraint 4 is disclosed as not implemented, with the reason and the seam. |
| **Standing limits** | The palette is still the **construction** palette — hueless, provisional, and refused by `--production` builds. `#767676` is a conformance floor, not a brand decision. Chromium only. Dawn is defined and, like dusk before this cycle, still has no trigger — it is reachable only by an explicit `data-light`, which nothing sets; that is now recorded rather than mistaken for working. |
| **Commit** | written against `5e70626` |

---

## V-2026-08-24-020 · V0 + V1 + V3 + V4 · The motion language, implemented and made unable to hide content

| | |
| --- | --- |
| **Target** | `src/site/styles.ts`, `src/site/markdown.ts`, `src/site/build.ts`, `scripts/visual-check.mjs`, `test/site/motion.test.ts` (new) |
| **Bottleneck selected** | `docs/website/04_MOTION_LANGUAGE.md` is a 246-line specification — five tokens with cited Atlas sources, an explicit reduced-motion mapping per token, eight prohibitions, a six-question gate and twelve acceptance criteria. The implementation used **one** of it: a hover colour transition. The five duration tokens were defined and four were never referenced. Deployment, payment and legal are all behind human gates; this was the largest code-completable gap in the repository, and the one the site is judged by. |
| **Why it had been abandoned rather than built** | A previous cycle staggered `main`'s children with `animation-delay` + `animation-fill-mode: both`. `both` holds an element at its FIRST keyframe throughout its delay, and the first keyframe of a reveal is invisible — a browser screenshot showed a near-blank page. The correction was to remove all reveal motion, and the stylesheet then carried a comment explaining that content is not animated. That answered §7 Q6 by having no motion, which is not what the specification says. |
| **What was built** | §8 Tier 1: CSS scroll-driven animation, compositor-run, **0 KB JavaScript**, under one invariant — *the resting style of every element is its final style*. All four unused tokens are now in effect: `stone` on section entry, `forest` on list and grid entry, `river` drawing the section rules, `wind` as the hero's ≤8px loop, `light` unchanged on the page ground. There is **no `animation-delay` anywhere**: with a `view()` timeline the stagger is POSITIONAL, so §3.3's "the stagger IS the meaning" is carried by the layout that already encodes the hierarchy rather than by a timer that can strand an element. The defect class is removed structurally, not avoided carefully. |
| **Defect found by the browser, not by the plan** | The first implementation used the specification's own axes — `opacity` for forest (§3.3) and `clip-path` for stone (§3.2). Chromium then reported **h2, li and .state elements below the fold sitting at `opacity: 0`** on home, product, nature and philosophy. That is §10's "No content is revealed only by animation" exactly, and §7 Q6 rejects it. **Every reveal keyframe is now transform-only** — translate and scale move an element, they never hide one. §3.2's named `clip-path` axis is deliberately not used; the gate outranks the axis, and stone's character comes from its easing (its own "resists before it moves"), not from the property. |
| **The static check, corrected by that measurement** | `findLoadBearingMotion` first treated `@keyframes` as the one place a hidden state belongs — reasoning that the `@supports` and `prefers-reduced-motion` guards made it safe. They protect a reader whose browser does not run the animation; they do nothing for the reader whose browser does. The check now rejects `opacity < 1`, a clipping `clip-path`, or `visibility: hidden` **inside a keyframe as well**, and the test that asserted the opposite was inverted with the reason recorded in it. |
| **Two more checks, because §5 asks for them by name** | `findMotionProhibitions` — easing overshoot (a control point off the [0,1] output axis: §1, "Olibana does not bounce"), durations under the 300ms floor, infinite loops outside `motion.wind`, glassmorphism, animated gradients. `findInlineMotionValues` — §10's first criterion, every duration and easing a token reference rather than a literal, so a later field measurement changes one line. |
| **Mutation / negative control** | 22 tests in `test/site/motion.test.ts`. Each check is fed the defect it exists for — the exact `delay` + `fill: both` stagger, an ungated reveal, a resting `opacity: 0`, a clipping keyframe, `cubic-bezier(0.34, 1.56, 0.64, 1)`, `0.2s`, an infinite loop, a literal duration — **and a control it must stay quiet on**: a transform-only keyframe, and the §6-mandated `0.01ms` reduced-motion reset, which must not be read as a floor violation. |
| **Two false positives in my own checkers, both fixed before use** | (1) `findInlineMotionValues` flagged `var(--motion-stone-ease)` as a literal, because the token is *named* for the easing — token references are now removed before the value is examined. (2) A raw `/animation-delay/` in a test matched the stylesheet's own comment explaining the defect. **That is the third time in this repository a checker has been fooled by prose describing the thing it looks for.** It now reads through the comment-aware parser. |
| **Defect found on a route the visual check had never covered** | Adding `/olibana/philosophy` and `/olibana/design-language` to the browser run exposed **two dead links on published pages**: `href="./Design_System.md"` and `href="./Light_Atlas.md"`. The source documents link to each other the way files in a repository do, and that address survived into HTML where no `.md` is served at any address. Nothing caught it — the unit suite checks the anchor renders, and it did; the deployment auditor follows navigation, and these were in body copy. Fixed at the renderer (a document with a page becomes a link to that page; one without renders unlinked rather than pointing nowhere) and gated at the build: `findDeadLinks` refuses to emit while any internal link resolves to an address the build does not produce, and refuses relative addresses outright, since where they land depends on the page's directory. |
| **A WCAG false positive, corrected against the criterion text** | The visual check reported a 19px inline link as an SC 2.5.8 failure. It is not: the criterion has an explicit **Inline exception** for a target in a sentence. The check now applies it. A conformance failure reported where none exists is worse than a missed one, because the fix would have damaged the typography to satisfy a rule that never applied. |
| **Runtime observation — does it actually run** | Chromium, `document.getAnimations()`, per route: **9 animations on home** — 3 `stone-enter`, 5 `forest-enter`, 1 `wind-drift` — on `ViewTimeline` for every reveal and `DocumentTimeline` for the wind loop alone. Under `prefers-reduced-motion: reduce`: **0**. Both are now permanent checks, including one that fails if a reveal is found running on a time-based timeline — the shape the old defect would take if a rule ever lost its `animation-timeline`. |
| **Resting-state observation — does it hide anything** | Every element carrying text, on 8 routes × 3 viewports = 24 renders, measured for computed opacity and visibility **with no scrolling performed**. Zero not fully painted. The run also reports which pages cannot scroll (`scroll=NO` on shop, confirmation, sandbox, and notfound/tablet), because a page that cannot scroll leaves a `view()` timeline inactive — the state a static check cannot reason about and the one most likely to strand an element. |
| **Cost** | Home payload 23.6 KB → 24.3 KB (+0.7 KB), against a 120 KB budget. LCP 40–100 ms against a 1000 ms budget. **CLS 0.00** — transforms do not affect layout. Scripts loaded: 0. |
| **Observed** | 363/363 pass (from 341). Visual check exit 0 across 24 renders. |
| **Result** | **PASS.** §10 acceptance: 12 of 12 criteria now hold, 9 of them mechanically. |
| **Standing limits** | The values remain **provisional** (§2) — derived from qualitative Atlas observation, not field measurement; no reading exists to derive them from. Measured in Chromium only: Firefox has scroll-driven animations behind a flag, which is precisely the case `@supports` covers, and the static-final-state fallback is reasoned rather than observed. INP still needs a real interaction. No screen-reader testing. |
| **Not touched** | `COMPLETION` stays FALSE. GATE-001/002/003 unchanged; Pinterest, media cluster and dropshipping stay frozen behind Core per §22.19. |
| **Commit** | written against `75c505b` |

---

## V-2026-08-23-019 · V3 + V4 + V6-boundary · Removing the auditor's dependence on `/health`

| | |
| --- | --- |
| **Target** | `scripts/smoke-test.mjs` (rewritten), `test/meta/deploy-audit.test.ts`, `src/http/router.ts` |
| **Why** | V-018 closed with a disclosed limit: *the auditor believes what `/health` says about itself.* A deployment reporting `ok` while its storage was broken passed. `/health` is written by the same author as the auditor, so a shared wrong assumption produced agreement rather than detection — the auditor and the application were not independent oracles. |
| **What changed — cross-checks, not credence** | Every claim `/health` makes is now checked against something the application cannot fake without also breaking what a customer sees: `published` → the product pages actually in `sitemap.xml`; `openRuns`/`accepting` → whether a product page actually offers a purchase; `storage` (read) → the confirmation route, which reads the order log; `storage` (write) → **a real write**, a valid checkout POST that records an intent through the live path. The auditor imports nothing from `src/` — it speaks HTTP only, so it cannot inherit the application's judgement. |
| **The one asymmetry, stated deliberately** | A report of *ill* health is still believed. "I am fine" serves the claimant and needs corroboration; "I am broken" is an admission against interest and nothing is gained by disbelieving it. So `status: degraded` fails on the report alone. |
| **Status taxonomy** | `PASS · FAIL · UNVERIFIED · UNEXECUTED · EXTERNALLY_BLOCKED · NOT_APPLICABLE`, with **UNVERIFIED → PASS forbidden**, enforced by the exit code: `1` on any FAIL, **`3` on any UNVERIFIED**, `0` only when everything that could be checked was. `--json` writes the raw findings, so the prose is not the record. |
| **Method — the false-state matrix** | Twenty deployments, each wrong in exactly one way, each requiring a non-zero exit **naming that fault**; plus a control requiring a pass, without which every one of them would also pass against an auditor that always fails. New this cycle: /health `ok` while the order log cannot be read (A) · while it answers 503 rather than throwing (A2) · while storage cannot be written (B) · while a forged signature is accepted (C) · while the published count is fiction (E) · while `accepting` is true and nothing can be bought (E2) · while the checkout accepts a nonexistent product (F). |
| **CASE D — declared, not claimed** | §12 names invalid database credentials. **There is no database** — persistence is an append-only log — so this is `NOT_APPLICABLE`, and the test asserts the auditor never uses the word. Recorded rather than skipped, so the gap becomes visible the day a database is added. |
| **Executed against real deployments, not only mocks** | (1) **Fixture, one product published:** 17 passed · 0 failed · 0 unverified, **exit 0**. The write reached real storage — `intents.jsonl` holds one record, `OLB-CT-001-STN-S ×1, 68000 JPY, deployment-audit@example.invalid` — and `orders.jsonl` is **empty**: the auditor proves the write path without creating an order. (2) **Real `dist`, closed, nothing published:** 16 passed · 0 failed · **1 unverified**, **exit 3** — the write path cannot be exercised and is not passed. (3) **Storage that cannot be written:** **exit 1**, 14 · 2 · 1. |
| **Defect found by run (3), in the application** | With an unreadable order log, `/health` degraded honestly while `CONFIRMATION_PATH` threw — **a customer who had just paid got an unhandled 500.** Now a 503 that says the records cannot be read. Deliberately *not* the 202 "still being recorded" page: that page asserts the order is on its way, and an unreadable log is exactly the state in which nobody knows that. Killed by mutation (catch → `confirmation(null)` → test fails) and pinned from outside by CASE A2, so the friendlier code can never become a way past the auditor. |
| **Consequence for GATE-001, measured rather than predicted** | A Pages deployment with no storage binding will come back **1 FAIL + 1 UNVERIFIED, not clean** — `storage: unavailable`, `/health` 503. That is PCQ-004 arriving in production, not a failed deploy. `HUMAN_GATE_QUEUE.md` now says so before the command, so the result is not misread in either direction. |
| **Observed** | 341/341 pass. Auditor 17/17 exit 0 against a working deployment; exit 3 against one it cannot fully check; exit 1 against a broken one. |
| **Result** | **PASS** for the auditor's discrimination. **`COMPLETION` stays FALSE** — nothing here touches GATE-001/002/003. |
| **Standing limit, unchanged and not narrowed** | Point-in-time observation. A component that reads and writes correctly during the audit and fails afterwards is invisible to it; that is what an audit is, and continuous assurance is not built. Still never exercised: TLS · DNS · a real payment. |
| **Commit** | written against `0ca3775` |

---

## V-2026-08-22-018 · V0 + V3 + V4 · Verifying the deployment auditor itself

| | |
| --- | --- |
| **Target** | `scripts/smoke-test.mjs`, `test/meta/deploy-audit.test.ts` (new), `src/site/build-id.ts` (new), `/health` |
| **Method** | A 14-step external audit: reconstruct state, locate the deployment command, locate the verification command, execute it, capture raw output, distrust the prose, compare claimed against observed, and prove the auditor fails on false claims before recomputing anything. |
| **Step 2 — the deployment command** | **There is none.** No `wrangler.toml`, no deploy script, no CI workflow, nothing referencing a Cloudflare token — searched, not assumed. Pages builds from the repository, configured in its dashboard. The runbook now says this outright, because "build command `npm run build`" could be read as a command in the repo. |
| **Step 7 — the public URL** | **None exists.** The only origins anywhere are unit-test fixtures and a usage example in a comment. No tags, no deployment records. So DNS and TLS **cannot** be exercised, and the auditor now says which of them a given run did not cover rather than passing in silence. |
| **Step 8 — the build marker was missing** | Nothing identified which build was serving. **A stale deployment would have passed every check.** `src/site/build-id.ts` reads the platform's own record, falls back to git, and returns `unknown` rather than inventing a value — a marker that guesses would be believed. It is stamped into every page and reported by `/health`, so the two can be cross-checked: a deployment where they disagree is half-updated. |
| **Steps 4–6 — execution** | Ran against a real local deployment. **Exit code 0**, checked separately from the prose. 11/11, with the build marker matching `git rev-parse HEAD`. |
| **Steps 9–11 — claimed vs observed: three mismatches, one substantive** | (1) Three documents said "10/10"; the count is 11. (2) The runbook could be read as implying a deploy command exists. (3) **The substantive one: I had written that the function "loads on Workers".** What is verified is that it imports no Node built-in — necessary, not sufficient. The Pages bundler must also resolve **45 explicit `.ts` specifiers across 17 modules**, and nothing has tested that. All three corrected; the third is now recorded as the first thing to check if the deploy fails. |
| **Steps 12–13 — the auditor is now itself verified** | It had only ever run against a working deployment, so every green result was equally consistent with "the deployment is fine" and "the checker cannot tell". `test/meta/deploy-audit.test.ts` stands up servers that are wrong in exactly one way and requires a non-zero exit **naming that specific fault**: nothing listening · a stale build · a half-updated deployment · a missing marker · absent headers · a leaking `referrer-policy` · an exposed sandbox · a leaked credential · a degraded report · a broken link · no 404 · a checkout accepting a nonexistent product · a webhook accepting an unsigned payload. **13 false claims, 13 failures, each for the right reason.** A control case requires it to pass a correct deployment, without which every one of those would also pass against a checker that always fails. |
| **Observed** | 330/330 pass. Smoke test 11/11, exit 0. |
| **Result** | **PASS** — and the auditor's passes now mean something they did not mean yesterday. |
| **Disclosed limit, recorded as a test** | The auditor believes what `/health` says about itself. A deployment reporting `ok` while its storage is broken passes. The health logic is tested separately against the real implementation; from outside, an honest report and a lie are indistinguishable. Written as a passing test so the limit shows in the output, and so it fails if the limit ever closes. |
| **Commit** | written against `0bc5df8` |

---

## V-2026-08-22-017 · V0 + V1 + V3 + V4 · The suite audits itself; the deployment can be checked

| | |
| --- | --- |
| **Target** | `test/meta/suite-audit.test.ts` (new), `/health`, `scripts/smoke-test.mjs` (new), `docs/RUNBOOK.md`, `HUMAN_GATE_QUEUE.md` |
| **Why** | §35 and §53: "296 tests passed" is not evidence, and the suite had never been audited for tests that pass without proving anything. That is the highest propagation risk here — an unsound test silently invalidates every VERIFIED claim resting on it rather than failing. |
| **Defect in my own scanner, found first** | The initial scan reported a false positive: it counted braces without skipping string and regex literals, so a regex containing `}` ended a test body early. **A checker that cannot parse is worse than none, because its output gets trusted.** The permanent version strips comments and literals, and four of its nine tests exist only to check the checker — including two that feed it known-bad input and require it to notice. |
| **Two real findings in the suite** | (1) `spec-conformance` carried an `assert.ok(true)` used as a documentation device — a comment wearing a test's clothes, passing regardless and adding one to a number people read as evidence. Removed; the disclosure lives in prose and in this log. (2) **Four HTTP tests asserted only a status code.** A 404 that still renders the sandbox page, a 503 that still wrote an order, and a 400 that still reached order placement all pass a status-only assertion. All four now assert what must *not* have happened. |
| **Defect in the health check, found by its own test** | The first version probed writability by taking the lock and appending nothing — which never reaches storage at all, so **a deployment whose writes went nowhere reported itself healthy**. It now performs a real zero-byte append: a genuine `open(O_APPEND)` that fails on a read-only filesystem and leaves no record. Caught by M96. |
| **Defect found by the smoke test on its first run** | **Static pages carried no security headers locally.** `_headers` is a Cloudflare file and the local server ignored it, so local and deployed differed — §42 environment drift. A smoke test that passes against production but fails against local cannot gate a deploy, which is the only thing it is for. The local server now applies the same file. |
| **Observed** | 313/313 pass. **Smoke test: 10/10 against a real running deployment** — site answers, health reports `ok / storage available / 0 published / 0 open runs / accepting=false`, no credentials or paths in the health body, security headers served on both the router's responses and the static site, all 10 internal links resolve, unknown path 404s, a nonexistent product is refused 422, an unsigned webhook 400, and the sandbox is not exposed. |
| **Result** | **PASS** |
| **Mutations** | M92 a test asserting nothing → caught. M93 a vacuous assertion → caught. M94 a skipped test → caught. M95 an HTTP test checking only status → caught. M96 the writability probe not writing → caught. M97 health always reports ok → caught by 2. M98 `accepting` always true → caught by 3. M99 the health response leaks the webhook secret → caught. |
| **What `/health` deliberately does not say** | No secret, no path, no identifier, no order count. It is unauthenticated, so everything it returns is public; how many orders exist is the business's information. Asserted by a test that pins the exact key set. |
| **Limitation** | The smoke test has run against a **local** deployment only. It has never run against Cloudflare, which is GATE-001 and needs an account. The suite audit checks structural soundness — assertions exist, are not vacuous, are not status-only — **not that any assertion is the right one**. A wrong assertion still passes it. |
| **Commit** | written against `099f44f` |

---

## V-2026-08-22-016 · V0 + V1 + V2 + V4 + V5 · The deployed function could not have run

| | |
| --- | --- |
| **Target** | `src/persistence/storage.ts` (new), `src/persistence/file-storage.ts` (new), `AppendLog`, all four stores, `functions/[[path]].ts` |
| **Why** | §22 required a repository-wide audit before touching anything. Tracing the deployment adapter's import graph found the highest-risk item in the repository, and it was not a future concern. |
| **Defect — shipped, and worse than previously recorded** | The Pages adapter statically imported `node:fs`, through the domain: adapter → catalogue → `AppendLog` → `node:fs`. Cloudflare Workers have neither `node:fs` nor a writable filesystem, so **the deployed function could not have served one request in any mode**, including the `closed` mode that writes nothing at all. The previous cycle recorded "the adapter has never run there" — true, but an understatement: it *could not*. |
| **Why nothing caught it** | Every unit test passed. The deployment tests passed too — they run under Node, where `node:fs` exists. The defect is not in any module's behaviour; it is in the **shape of the import graph**, which nothing looked at. |
| **Fix** | `LogStorage` names the physical operations; `FileStorage` is the only module that touches `node:fs`; `AppendLog` and everything above it now know nothing about files. The adapter reaches file storage by **dynamic** import, so it loads only on the branch that needs it. |
| **What the seam is for** | PCQ-004 asked where production state lives. That question is now answerable without touching domain code: a durable store implements four methods. The interface documents the four guarantees any implementation must meet, and states plainly that an eventually-consistent key-value store meets neither the append nor the cross-process exclusion guarantee — which is why PCQ-004 stays open rather than being quietly closed with the nearest available store. |
| **Honest refusal** | `UnavailableStorage` reads as empty (nothing recorded *is* the truth) and **throws on write**. A deployment with no durable storage refuses to record rather than accepting a write that goes nowhere — which would be an order the customer believes was placed. |
| **Observed** | 296/296 pass. The live sandbox loop re-run over real HTTP after the refactor: intent recorded, `OLB-2608-0001`, `OLB-CT-001-STN-M ×2`, 144000 JPY, **PAID**, address from the gateway. Visual and performance unchanged: LCP 32–48ms, CLS 0, 0 scripts, no undersized targets. |
| **Result** | **PASS** |
| **New permanent check** | `test/http/runtime-compat.test.ts` walks the adapter's **static** import graph and fails on any Node built-in a Workers runtime lacks. It distinguishes static from dynamic imports, because only the former load with the module. Three of its four tests exist to stop it becoming decoration: one asserts the walk actually reaches the order store, one asserts it reports a `node:fs` import that is definitely there, one pins the dynamic import it deliberately permits. |
| **Mutations** | **M88 restores the original defect** — a static `node:fs` import in the adapter → caught. M90 the interrupted fragment is not removed before the next append → caught by 2. **M89 survived**: `UnavailableStorage.append` silently returning was not caught, because nothing tested the refusal the class exists for. `test/persistence/storage.test.ts` closes it; M89′ now caught by 3. M91 memory storage allows re-entrant locking → caught. |
| **Limitation** | The adapter is now *loadable* on Workers. It has still **never been run there** — that needs credentials. And `live` mode still cannot work on Pages, because no durable store exists yet (PCQ-004); what changed is that adding one no longer means touching the domain. |
| **Commit** | written against `530b4ff` |

---

## V-2026-08-22-015 · V1 + V3 + V4 · Security headers and performance budgets

| | |
| --- | --- |
| **Target** | `SECURITY_HEADERS`, `src/site/headers.ts`, performance measurement in `scripts/visual-check.mjs` |
| **Why** | §31.27 asks whether safe, verifiable work remains inside the frozen scope before stopping. Two Completion Gate criteria stood at PARTIAL — *Security checked* and *Performance checked* — and neither was blocked by anything external. |
| **Defect found by looking** | Router responses carried **no security headers at all**. One part of that is a real leak rather than a hardening gap: **the confirmation URL carries the order's access token in its query string**, so a `Referer` sent to any other origin hands that token away. `no-referrer` is the only setting that cannot do it. |
| **Both halves, one source** | Two things answer requests for this site — the router and the static build. A header set on one and not the other is a gap that depends on which half a customer reaches. `_headers` is now generated from the same constant the router sets, so they cannot drift. |
| **Defect found in my own test** | The first header test compared the headers to themselves, which passes however they are weakened — M83 (`no-referrer` → `origin-when-cross-origin`) survived it. Rewritten to assert the properties: a referrer policy that cannot leak cross-origin, `script-src 'none'` on a site that ships no script, `frame-ancestors 'none'` on a page with a purchase form, `form-action 'self'`. |
| **Performance, measured** | LCP, CLS, transferred bytes and script count read from the browser's own observers across five routes × three widths. **LCP 32–76ms · CLS 0 · 2.0–17.8KB · 0 scripts.** Budgets are set far tighter than the public Core Web Vitals thresholds on purpose: this site ships no JavaScript, no web fonts and no images, so anything near the public threshold means something was added that should not have been. A budget set at the threshold only fails after the damage. |
| **Result** | **PASS** |
| **Mutations** | M81 headers dropped from the router → caught. M82 `_headers` matching no path → caught. **M83 referrer-policy weakened → SURVIVED**, root-caused to a tautological test, now caught. M84 CSP permits script → caught. M85 the purchase form can be framed → caught. M86 a form may post to another origin → caught. M87 payload budget exceeded (200KB of filler CSS) → caught, reported at 284KB. |
| **Limitation** | Measured on **localhost**, which removes the network: these bound what the page costs to render, not what a visitor on a slow link experiences. **INP cannot be measured without a real interaction from a real person.** No external security review and no penetration test. The CSP allows inline styles because these pages carry their own so they render even if the build never ran. |
| **Commit** | written against `efe3391` |

---

## V-2026-08-22-014 · V2 + V3 + V4 + V5 · Confirmation, sandbox, signature, deployment adapter

| | |
| --- | --- |
| **Target** | `src/checkout/intents.ts`, `src/checkout/sandbox.ts`, `src/http/environment.ts`, `functions/[[path]].ts`, the confirmation route |
| **Why** | §31.3 and §31.4: a missing gateway blocks *taking money*, not the checkout, the webhook contract, the failure handling or the confirmation. Treating a boundary as a wall left three Completion Gate items open that nothing external was actually blocking. |
| **Defect found while building** | The webhook could not know what was agreed without either re-deriving it from the catalogue (which moves — the 99,000-against-72,000 defect) or trusting the payload (which lets the message define the price). **Intents are now recorded before the customer is sent to pay**, and the payload is only ever compared against one. |
| **Duplicate encoding removed** | The signed payload carried an idempotency key the intent already held. Two copies of one fact, one of them controlled by an outsider. Removed; the key comes from the agreement. |
| **Signature verification is real** | HMAC-SHA256 over `timestamp.payload`, constant-time comparison, 300-second freshness window — the mechanism Stripe uses, via Web Crypto so the same code runs on Workers. When a human supplies the account and the secret, **what changes is the payload shape, not the security model**. |
| **Configuration** | Three valid states — closed, sandbox, live — and `validateEnvironment` refuses everything between them: a secret with no mode, a mode with no secret, a sandbox on a public origin. It throws rather than defaulting, because a default decides on its own whether a deployment can take money. |
| **Deployment** | `functions/[[path]].ts` is a thin adapter over the same `handleRequest` the local server uses — no second routing implementation, because a deployment that behaves differently from the machine it was tested on was never tested. Driven in tests exactly as Pages drives it. |
| **Observed** | 280/280 pass. **Whole loop over real HTTP in sandbox mode**: `POST /checkout` → 303 to `/sandbox/pay` → page states *"Nothing is charged here"* and 144,000 JPY → `POST` → signed webhook → verified → order `OLB-2608-0001`, `OLB-CT-001-STN-M ×2`, 144000 JPY, **PAID** → confirmation shows it. Also through the deployment adapter: closed refuses, sandbox unreachable unless enabled, live verifies signatures and still refuses to invent a checkout URL, a forged signature manufactures nothing in either mode. |
| **Result** | **PASS** for everything either side of a real payment. |
| **Mutations** | M69 signature never compared → caught. M70 replay window unbounded → caught. M72 paid amount assumed rather than checked → caught. M73 confirmation shows whatever it finds → caught. M74 sandbox enabled by any truthy value → caught. M75 mode defaults to sandbox → caught by 5. M76 a mode may run without a secret → caught by 3. M77 sandbox on a public origin → caught. M79 an agreement rewritten by re-recording → caught. M80 an order stored with no reference → caught. **M71 (constant-time comparison → `===`) is an equivalent mutant** — the difference is timing, which no functional test can observe, and it is stated rather than counted. **M78 survived and was removed rather than tested**: the empty-reference guard was unreachable, so the invariant moved to the write, where it is enforced once and is now caught by M78′. |
| **VISUAL — defect found by extending the check** | The confirmation and sandbox pages are rendered by the router, not the build, so they sat outside `visual-check.mjs`. Adding them found **every control on them under the WCAG 2.2 AA 24px target minimum** — 19px links, a 21px pay button. A page a customer reaches after paying is not a place to relax an accessibility floor. Fixed; re-measured clean at 1280/834/390. |
| **Limitation** | **No real payment has been executed and none can be.** The sandbox proves everything from signature to confirmation; it cannot prove that a real provider's payload parses. Cloudflare has never run the adapter — that needs credentials. **`live` mode cannot run on Pages as configured at all**: the logs are files and Pages Functions have no writable filesystem (PCQ-004). |
| **Commit** | written against `83c93e3` |

---

## V-2026-08-22-013 · V2 + V3 + V4 + V5 · The HTTP layer

| | |
| --- | --- |
| **Target** | `src/http/router.ts`, `scripts/serve.mjs`, price binding in `placeOrder` |
| **Why** | The previous cycle put a form on the page that posted to `/checkout`, and nothing served `/checkout`. That is a **dead-end funnel** — §22.16 names it, and I had just created one. |
| **Shape** | Fetch API `Request`/`Response`, no framework, zero dependencies. Cloudflare Pages Functions speak exactly this and Node has since 18, so one handler serves the deployed site and the local server. Two routes. |
| **Defect found before writing the layer** | A test written first: repricing the catalogue between `beginCheckout` and `completeCheckout` produced **an order recorded at 99,000 against a payment of 72,000**. `placeOrder` re-read the catalogue for the price. The agreed price now binds, and a currency change mid-checkout is refused rather than reconciled. Caught by M68. |
| **Defect found by a router test** | `beginCheckout` never validated the email. Only `placeOrder` did — which runs **after** the payment. A typo would have become a refund instead of a correction. The rule is now applied at both ends from one exported function. Caught by M67. |
| **Idempotency without JavaScript** | A hidden nonce cannot work here: the site is static, so a nonce is minted once at build time and is **the same value for every visitor** — every order would collapse into the first. The key is derived from the selection instead (product, SKU, quantity, email). The cost is stated in the source: one customer cannot place two separate orders for the same size at the same quantity. That is what the quantity field is for, and it is a smaller failure than a double charge. |
| **Trust boundary** | `WebhookVerifier` has no default implementation. Everything downstream trusts the amount, the address and the key, so an unverified payload is never processed — `UnconfiguredVerifier` returns null and the route answers 400. |
| **Observed** | 241/241 pass. **V3 over real HTTP** against a running server: `GET /` 200 · `GET /checkout` 303 home · `POST /checkout` with the repository's real (empty) catalogue → 422 *"PRD_x is not for sale"* · with a fixture product and open run → **503 "Ordering is not open yet — nothing has been charged and nothing has been recorded"** · bad email → 422 with the reason · `POST /webhooks/payment` unsigned → 400 · product page still served · **no order log written**, because nobody paid. |
| **Result** | **PASS.** The funnel is no longer a dead end. It ends, honestly, at the gateway that does not exist. |
| **Mutations** | M64 unverified webhooks processed → caught. M65 a fresh key per submission (a double-click becomes two orders) → caught. M66 a mismatched payment answered with a retryable status → caught. M67 email unvalidated before payment → caught. M68 order written at the catalogue price rather than the paid price → caught. |
| **Limitation** | **No payment has been executed and none can be.** No gateway, no verifier, no legal entity (P0-7, HG-04). The success path through the webhook is verified at V2 with real files and a test verifier; **no signature has ever been validated**, and the test verifier proves only what is downstream of verification. Deployment to Cloudflare Pages Functions is untried — the handler is shaped for it, which is not the same as having run there. |
| **Commit** | written against `a3bec15` |

---

## V-2026-08-22-012 · V1 + V2 + V3 + V4 + V5 · Checkout boundary and visual audit

| | |
| --- | --- |
| **Target** | `src/order/placement.ts`, `src/checkout/checkout.ts`, the purchase form, `scripts/visual-check.mjs` |
| **Why** | The order path had no beginning. `committedUnits` counted orders nothing could create, and the product page had no purchase action at all. |
| **Spec conflict resolved** | The directive's Completion Gate asks for `Cart integrated`; SPEC §2.3 lists a cart under 만들지 않는 것 with its reason. Recorded as **ADR-009** and resolved toward the repository: the criterion becomes *selection-to-order path integrated*. Function delivered in full; only the entity is refused. |
| **Where the order is created** | On the webhook, not the form. ADR-004's *hosted* checkout means **Stripe collects the address**, and an order requires one. Creating the order first would leave abandoned checkouts as orders in a log that `committedUnits` reads. |
| **Payment boundary** | `PaymentGateway` is an interface with one method and no SDK, no secret, no network call. `UnconfiguredGateway` **refuses in as many words** — a stub returning a plausible URL would make a broken funnel pass a funnel audit. Executing a real payment stays a Human Gate (P0-7, HG-04). |
| **Observed** | 225/225 pass. Full path on real files: selection → intent → completion → order placed, priced, snapshotted, PAID, reloaded. Redelivered payment: one order, one payment. Wrong amount: refused, nothing recorded. |
| **Result** | **PASS** for everything either side of the payment. The payment itself is **UNVERIFIED and unexecutable** by design. |
| **Mutations** | M55 placement without the lock → caught by 3. M56 duplicate submission → caught by 2. M57 order with no open run → caught by 2. M59 unpublished garment sold → **SURVIVED**, root-caused to my own fixture (no variants, so it was refused before status was checked); fixture corrected, now caught. M60 returning customer split in two → caught by 2. M61 order numbers counted rather than continued → **SURVIVED**; a gap is unreachable through the API, so the test now seeds the log directly, which is reachable — now caught. **M58 is an equivalent mutant**: copying is enforced by the record shape, not by a branch, and is stated as such rather than counted as coverage. |
| **VISUAL — two defects no unit test could see** | Both found by rendering, both on floors ADR-001 puts outside the tradeable set. **(1)** The purchase button's label was written `var(--surface-page)` — a token that does not exist in this system. An undefined `var()` is silent: it fell back to the inherited colour and rendered **#1A1A1A on #1A1A1A, a 1:1 contrast ratio**, on the one control that completes a purchase. Every test passed. A screenshot showed a black bar with no words on it. **(2)** Navigation links rendered **18px** tall and footer links **15px**, under **WCAG 2.2 SC 2.5.8 (AA) 24×24 CSS px**. These are list links, not links inside a sentence, so the inline exception does not apply. |
| **VISUAL — a third, from adversarial audit** | The header carried **two controls with the same label and the same destination** — the wordmark and the first navigation item, both "OLIBANA", both linking `/`. Invisible in the manifest, where they live in different files; obvious in a screenshot. Removed. |
| **Fixes** | Real tokens (`--content-inverse` on `--surface-inverse`, measured at **17.4:1**). Padding with compensating negative margin lifts nav to **32px** and footer to **31px** with the header's rhythm unchanged (home mobile document height moved 3409→3419px). Home dropped from the navigation manifest. |
| **What stops the recurrence** | Three checks, each mutation-verified against the defect it exists for: `findUndefinedTokens` (unit — a `var()` with nothing behind it; fallbacks are legitimate and ignored, and CSS comments are stripped so quoting the broken token in prose does not read as using it); a unit test that the purchase button's colour and background are different tokens; and **`scripts/visual-check.mjs`** (V3) which builds a fixture product and open run, serves them, and measures target size and computed button contrast at 1280/834/390. M62 (label repainted in its background) → caught, 1:1 reported. M63 (nav padding removed) → caught, 18px reported at all three widths. |
| **Responsive** | Product, shop and home at desktop 1280, tablet 834, mobile 390: no horizontal overflow, no content at opacity 0, no target under 24px, purchase button legible at every width. |
| **Limitation** | The fixture garment does not exist and nothing is published — the real build still emits no `/shop` and no product page, asserted by test. Contrast was measured on the purchase button only, not on every text pair. Screen readers, real devices and Core Web Vitals remain unverified. **No payment has ever been executed**, and none can be until a gateway exists. |
| **Commit** | written against `bfede0d` |

---

## V-2026-08-15-011 · V1 + V2 + V4 + V5 · Pre-order run

| | |
| --- | --- |
| **Target** | `src/preorder/run.ts`, `src/preorder/close.ts`, `OrderStore.committedUnits`, run-aware product page |
| **Why** | The order state machine's `PREORDER_HELD` guards read `committedQuantity` and `minimumQuantity` **from caller-supplied context**. A guard whose inputs are chosen by the party it is guarding is not a guard. This is the entity that supplies both from recorded facts. |
| **The honesty constraint** | `minimumQuantity` is the break-even quantity from a supplier quotation. **No quotation exists, so it is null, and a run with a null minimum cannot open.** No pre-order can open today, and the code says so rather than carrying a plausible placeholder. `test('THE CURRENT REPOSITORY has no open run')` asserts this against the real repository path. |
| **What is derived, not stored** | `committedUnits` is **counted from the order log**. A stored counter drifts: a cancellation that forgets to decrement leaves a run believing it can pay for fabric it cannot. Here a cancelled order simply stops being in `PREORDER_HELD` and stops counting — there is no second step to forget, verified by M45. |
| **What the caller cannot choose** | `closeRun` takes no outcome argument. Committed vs minimum decides it. A run that missed its minimum cannot be recorded as if it had reached one, and `CLOSED_UNDERSUBSCRIBED` is terminal — nothing goes into production. |
| **Rule added mid-cycle, from a surviving mutation** | M47 (close a minimum-less run as REACHED) survived because that branch is unreachable. Chasing why exposed a **real** hole next to it: nothing stopped the terms of an **open** run from being changed under the people who had already committed. Lowering `minimumQuantity` mid-run would turn an undersubscribed run into a "successful" one and put a garment into production the quotation says cannot be paid for. The commercial terms are now frozen once a run opens. |
| **Observed** | 179/179 pass. Two logs on disk, joined and reloaded: commitments counted across instances, a cancellation removing its own commitment, and a close surviving reload. |
| **Result** | **PASS** |
| **Mutations** | M41 close boundary `>=`→`>` → caught by 2. M42 open without a break-even → caught. M43 undersubscribed run may produce anyway → caught by 2. M44 unstated quantity counts as 0 → caught. M45 cancelled orders keep counting → caught. M46 two open runs per garment → caught. **M47 → SURVIVED, root cause identified as an unreachable defensive branch**; the rule it guards is verified directly against `closeOutcome`, and the reachable gap it exposed is now M48. M48 terms freeze removed → caught. M49/M50 freeze **over**-applied (to DRAFT, to `targetQuantity`) → both caught, so the rule is pinned in both directions. M51/M52/M54 page wiring → **all three initially SURVIVED**. |
| **Defect found in my own tests (VERIFICATION attribution)** | M51/M52/M54 survived because every page test called the renderer directly with a hand-built run. That is precisely the "works on mock data" failure the directive refuses to count as complete: the renderer was verified and the **wiring was not**. Two build-level tests now record a real run in a real file and read the emitted HTML; all three mutations are caught. `promisedShipBy ?? closesAt` — the fallback M52 exploited — was deleted rather than tested, by narrowing the page's input to a `PreorderWindow` that has no nulls in it. |
| **Limitation** | No order can yet be *placed* — there is no cart and no checkout, so `committedUnits` counts orders that only a test can create. The run transition table is **inferred**: SPEC Part 2.2 lists run statuses but gives no table, and what is encoded is only what the pre-order model itself requires. That inference is not spec-verified and is disclosed here rather than presented as transcription. |
| **Commit** | written against `cf66d95` |

---

## V-2026-08-15-010 · V2 + V4 + V5 · Concurrency and crash durability

| | |
| --- | --- |
| **Target** | `src/persistence/append-log.ts` (new), `src/order/store.ts`, `src/catalog/catalog.ts` |
| **Why** | Two items had been carried as UNVERIFIED since the store was written, and the catalogue added a **second writer to the same persistence pattern**. Both were tested rather than reasoned about. |
| **Method** | Real processes spawned by `scripts/append-worker.mjs`, `scripts/catalog-worker.mjs` and `scripts/lock-holder.mjs`. No simulation: the defect lives between two syscalls and cannot be reproduced inside one event loop. |
| **Defect 1 — concurrency (CONFIRMED, then fixed)** | 8 processes delivering **one idempotency key** produced **2 accepted records** (`duplicate,duplicate,duplicate,applied,duplicate,duplicate,applied,duplicate`). Each read the log, saw no duplicate, and wrote. In a payment context that is one payment recorded twice. |
| **Defect 2 — crash durability (CONFIRMED, then fixed)** | A partial final line made the **entire history unreadable**: `CorruptLogError` on every read. One interrupted write and no order could be read at all. |
| **Defect 3 — found only because the fix was tested (CONFIRMED, then fixed)** | Discarding the fragment on *read* was not enough. The fragment has no terminating newline, so the **next append welded itself to it**, producing a genuinely corrupt line in the middle of committed history — unrecoverable, and strictly worse than the defect being fixed. The first writer to take the lock now truncates back to the last complete record. |
| **Defect 4 — found in my own test (VERIFICATION attribution)** | The first concurrency test **passed against a store with no mutual exclusion at all**. It was measuring Node startup jitter: processes launched together do not arrive together, so they queued themselves. Rewritten with a wall-clock start barrier, after which the mutation was caught. A concurrency test without a barrier is not evidence. |
| **Fix** | One `AppendLog` shared by both stores. Mutual exclusion by lockfile (`openSync(..., 'wx')` — atomic, dependency-free, visible to every process on the filesystem, which is what a lock between processes must be). Read and decision and write are one critical section. Truncation offsets are measured in **bytes, not characters**, because a Japanese product name makes those differ. |
| **Observed** | 140/140 pass. Order log: 8 simultaneous same-key deliveries → 1 accepted, 1 caller told `applied`. 12 distinct keys → 12 records, no loss, no corruption. 6 simultaneous transitions of one order → 1 accepted, 5 refusals **recorded**. Catalogue: 8 processes claiming one product code → 1 claimant, 7 refused. |
| **Result** | **PASS** |
| **Mutations** | M34 lock never acquired → caught by 4. M35 fragment not removed before append → caught by 3. M36 all corruption forgiven → caught by 6. M37 offset counted in characters not bytes → caught by 1. M38 abandoned lock never reclaimed → caught by 1. M39 code-uniqueness check removed → caught by 2. **M40 uniqueness checked outside the lock** (check-then-write split, the original defect re-introduced in the catalogue) → caught by 1. Control: 0 false failures on unmodified source. |
| **Consequence for the catalogue** | Before this, `record` had no read-then-decide step, so its concurrency test could not discriminate — the lock protected nothing there. SPEC Part 2.2 calls `code` the **public identifier**, and an identifier that is not unique is not one; enforcing that under the lock is what M40 now tests. |
| **Limitation** | The lock is **filesystem-scoped**. It holds for writers sharing a filesystem; it would not hold across machines writing to different mounts of the same data. That deployment does not exist and must not be introduced without replacing the mechanism. `fsync` is not called, so a **power loss** (as opposed to a process kill) can still lose an acknowledged record in the OS page cache — untested and unclaimed. Stale-lock reclaim uses mtime age, not liveness: a writer paused longer than `STALE_LOCK_MS` could have its lock stolen. |
| **Environment** | Node v22.22.2, `--experimental-strip-types`, zero dependencies |
| **Commit** | written against `d06a7ea` |

---

## V-2026-08-15-009 · V1 + V2 + V3 + V4 · Product catalogue and product page

| | |
| --- | --- |
| **Target** | `src/catalog/catalog.ts`, `src/site/product-page.ts`, catalogue-driven routing |
| **Why** | The site rendered from hard-coded strings. The directive's completion contract requires UI → logic → data → persistence to actually connect, and explicitly refuses to count a UI that works only on mock data. |
| **Method** | V1 unit · V2 against a real filesystem catalogue · **V3 real-browser rendering of a product page built from recorded data** · V4 mutation |
| **The honesty constraint** | **No product exists.** A fixture would be a fabricated product, which every directive prohibits. So the mechanism is verified against a temporary catalogue in tests and in one browser run, while the real build emits **no `/shop` and no `/products/*`** — asserted directly by a test that reads the repository's own catalogue path. |
| **Observed** | 111/111 pass. Real build: 10 routes, no commerce pages. Fixture build: 12 routes including `/shop` and `/products/olb-ct-001`. Rendered in Chromium at 1280×1000 and 390×844 — 696 characters visible, no overflow, nothing at opacity 0, price above the natural rule, and an unmeasured size showing an em dash rather than a number. |
| **Result** | **PASS** |
| **Integrity rules enforced at write time** | A PUBLISHED product must have a priced variant — a page that asks for a purchase decision while withholding the price is not publishable. A PUBLISHED product must carry a production lead time, because ADR-003 requires the window to be disclosed before payment, so it must exist before the page does. Prices are positive integers in minor units. A measurement is never zero: an unmeasured size is omitted. SKUs must belong to their product and be unique within it. |
| **Mutations** | M27 publish without a price · M28 publish without a production window · M29 expose DRAFT publicly · M30 fill an unmeasured size with 0 · M31 drop the pre-order disclosure · M32 put the natural rule above the decision layer · M33 emit `/shop` with an empty catalogue — **all 7 caught** (M33 by 4 tests, M29 by 3). |
| **Design note** | Invalid products are refused *before* the write, unlike order rejections, which are recorded. An attempted order transition is evidence of what a system tried to do; a malformed product is a caller mistake with nothing to preserve. |
| **Limitation** | No cart, no checkout, no payment: the page states facts and cannot yet take an order. Concurrency still untested. The rendering run used a fixture; no real garment has been photographed, measured, priced, or published. |
| **Commit** | written against `0ff471e` |

---

## V-2026-08-15-008 · V1 + V2 + V4 · Order persistence

| | |
| --- | --- |
| **Target** | `src/order/store.ts` — append-only order log |
| **Why** | Persistence was the standing limitation on every commerce entry in this file. It is fully specified, depends on no pending input, and was the only thing keeping order handling at V1. |
| **Method** | V1 unit · **V2 integration against a real filesystem**, including reload through a separate store instance over the same file · V4 mutation |
| **Observed** | 87/87 pass. Create → persist → read → reload → identical state. Status is derived by replay and never stored, so no second encoding exists to drift. Earlier bytes are never rewritten. The store exposes no update, delete, remove, set, patch, truncate or clear. A full pre-order lifecycle and the undersubscribed branch both persist and replay. 50 events, 50 distinct well-formed ids. A corrupt line throws rather than being skipped. |
| **Result** | **PASS** |
| **Mutations** | M21 mutable status field stored beside the log · M22 rejected events dropped · M23 rejected events allowed to advance state · M24 corrupt line silently skipped · M25 ADR-008 fix reverted · M26 append replaced with truncating write — **all 6 caught** (M26 by 9 tests, M25 by 4). |
| **Defect found on first run** | Two tests failed. Transcribing the spec's idempotency key literally — `(order_id, from_status, to_status, idempotency_key)` — does not work in a store, because the store derives `from` from its own log. Once the first delivery is applied the current `from` has moved, so the recomputed key can never match the stored record, and **a redelivered webhook is processed a second time**. The four-tuple is correct for the pure function, where `from` is an input, and vacuous for the store. Redelivery identity is now `(orderId, idempotencyKey)`; a key reused for a different destination is rejected and recorded rather than honoured. Recorded as ADR-008 rather than resolved silently. |
| **Limitation closed** | Idempotency was previously proven only against an in-memory key set, which cannot survive a process restart. It is now proven against the store's own history, and a test asserts a fresh instance still detects the redelivery. |
| **Limitation remaining** | **Single writer only, and unverified.** `appendFileSync` will not corrupt a line, but two processes can both pass the idempotency check before either writes. No concurrency test exists. Before a second writer exists this needs a lock or a store with a real unique constraint. Also unverified: crash-during-write durability, and behaviour when the disk is full. |
| **Commit** | written against `3d9ac19` |

---

## V-2026-08-15-007 · V1 + V3 + V4 · Website

| | |
| --- | --- |
| **Target** | `src/site/*` — static site builder and the 10 routes it emits |
| **Method** | V1 unit (67 assertions) · **V3 real-browser rendering** (Chromium via playwright-core, run deliberately, not part of `npm test`) · V4 mutation |
| **Observed** | Build emits 13 files / 10 routes / 44 KB. Served over HTTP: every route 200, unknown paths serve the 404 document. Rendered in Chromium at 1280×900 and 390×844: all pages show visible content (1,400–3,400 characters), 0 children at opacity 0, no horizontal overflow, no console errors, first Tab lands on the skip link. First view 14 KB total, 0 bytes of JavaScript. |
| **Result** | **PASS** |
| **Mutations** | M15 script tag shipped · M16 skip link removed · M17 empty `/journal` route built · M18 empty measurements table rendered · M19 reduced-motion block dropped · M20 production palette guard disabled — **all 6 caught.** |
| **Defect the unit tests could NOT catch** | The page rendered near-blank. `.enter > *` used `animation-fill-mode: both`, which holds each element at its FROM state — opacity 0 — through its stagger delay. The unit test asserted that `both` was present and reasoned that the final state was therefore the resting state. That reasoning was wrong, and the test shared it. **Only the browser screenshot exposed it.** This is the third occasion on which verification shared the implementation's failure mode; unlike the previous two, no amount of reading the code would have shown it. Content entry animation is now removed entirely — it gated comprehension, which ADR-001's C1 resolution forbids — and the test was replaced with the property that matters: no rule starts content at opacity 0. |
| **Other defects found and fixed** | 404 page declared a canonical URL to a path that is not a route, contradicting its own `noindex` (found by an internal-link check). Every page triggered a `/favicon.ico` 404; suppressed with an empty data URI rather than by inventing a brand mark that has not been decided. Home page stated the same sentence twice — a hand-written statement duplicating the opening line of the philosophy text below it; replaced with Brand Bible language and a repeated-sentence test added. |
| **Regression introduced and repaired mid-cycle** | An edit removing the entry animation also deleted the `prefers-reduced-motion` block. Caught by the suite, restored. |
| **Production build** | **Refuses, exit 1**, listing all six construction palette tokens. This is the intended state: the brand palette is deferred pending field measurement, and the guard prevents an unfinished palette shipping by accident. |
| **Limitation** | No screen-reader testing. No automated contrast validation — and the palette under test is the construction palette, not the brand palette, so contrast figures would be meaningless. Rendering verified in Chromium only. No Core Web Vitals measured against a real network. |
| **Commit** | written against `a3e405a` |

---

## V-2026-08-15-006 · V1 + V4 · Independent spec conformance

| | |
| --- | --- |
| **Target** | `src/order/state-machine.ts` vs `docs/business/02_FIRST_GARMENT_EXECUTION.md` §3.2/§3.3, and ADR-007 |
| **Why** | SSOT v2.0 §7 requires the verifier to be independent of the executor; §43-2 prohibits an agent verifying its own output. Measured gap: 3 of 3 test files shared a commit with their implementation. |
| **Method** | A verifier that parses the specification markdown mechanically and diffs the extracted edge set against the implementation. Independence comes from deriving expectations from the authoritative document rather than from a second reading by the same process — not from adding agents (§43-18). |
| **Expected** | Spec edge set ≡ implementation edge set; spec-forbidden transitions rejected; ADR-007 terminal list honoured |
| **Observed** | 47/47 pass. Edge sets identical (20 edges). 4 mechanically checkable forbidden rules all rejected. |
| **Result** | **PASS** |
| **Defects found in the verifier itself** | 2, on first run. (a) Row classifier demoted a checkable rule because its *rationale* cell mentioned a state. (b) An ADR regex assumed the wrong bold span. Attribution: `VERIFICATION` (§25) — not SPEC, not CODE. Both fixed; the two substantive checks passed from the start. |
| **Defect found in the implementation** | 1, by mutation M14. `TERMINAL_STATUSES` (a literal set) and the emptiness of `ALLOWED_TRANSITIONS` were **two independent encodings of the same fact**. Mutating one left the other and the conformance file unaware. Fixed by *deriving* terminality from the edge map, which removes the failure class rather than testing for it. |
| **Mutation results** | M11 undeclared edge added → caught. M12 declared edge removed → caught. M13 forbidden transition permitted → caught. M14 parallel terminal list mutated → **SURVIVED** → root cause fixed → M14′ (remove CANCELLED's edge, now the only route to the same defect) → caught by 5 tests including the independent one. Control: 0 false failures on unmodified source. |
| **Limitation** | Verifies **transcription fidelity**, not specification correctness. Cannot tell whether the spec itself is right, whether the guards encode the intended business rule, or whether any of it survives persistence, concurrency, or real I/O. 4 prose-quantified forbidden rules remain outside machine verification and are disclosed as such by an assertion, not silently assumed covered. |
| **Environment** | Node v22.22.2, `--experimental-strip-types`, zero dependencies |
| **Commit** | written against `8f540e1` |

---

## V-2026-08-15-005 · V1 + V4 · Identity and economics

| | |
| --- | --- |
| **Target** | `src/identity/ids.ts`, `src/economics/break-even.ts` |
| **Observed** | 39/39 pass. Mutations M5–M10 all caught: unknown cost coerced to 0; fixed-cost amortisation removed; largest instead of smallest profitable tier; MOQ ignored above break-even; customer id made sequential; ULID timestamp removed. |
| **Result** | **PASS** |
| **Defect found** | 2 test failures on first run. Attribution: `VERIFICATION` — the expected break-even was asserted at 30 without being computed; tier 20 clears at +6,778. Corrected, and the assertion strengthened from a magic number to a boundary property. |
| **Limitation** | Break-even verified against synthetic tiers only. **No real supplier quotation exists, so no actual `minimumQuantity` has been computed and none is claimed.** |

---

## V-2026-08-15-004 · V1 + V4 · Order state machine

| | |
| --- | --- |
| **Target** | `src/order/state-machine.ts` — first executable verification in the project's history |
| **Observed** | 15/15 pass. Mutations M1–M4 all caught: cancellation after fabric is cut; CANCELLED made terminal; undersubscription boundary off by one; idempotency check disabled. |
| **Result** | **PASS** |
| **Finding** | Spec conflict discovered during transcription — §3.1 diagram marks CANCELLED terminal, §3.2 table gives it an outgoing edge. Resolved under P-01 and recorded as ADR-007. |
| **Limitation** | Idempotency verified against an in-memory key set, **not** a database unique constraint. That remains unverified. |

---

## V-2026-08-15-003 · V0 · Outerwear spec pack
13 measurement points × 3 sizes, 13 construction sections, 8-item dispatch checklist, 0 absolute figures asserted. **PASS.** Verifies structural completeness for dispatch; does not verify that a factory will accept it (that is V6, reachable only by sending).

## V-2026-08-15-002 · V0 · Category decision pack
4/4 categories across rule-execution, measurements, sketch checklists; 0 absolute currency figures; explicit no-recommendation. **PASS.** Narrows the decision; does not resolve it.

## V-2026-08-15-001 · V0 · Resume contract
9/9 resume questions, 18/18 persistence fields, 20/20 invariants, 20/20 governance rules, 10/10 Build Gate criteria evaluated. **PASS.** Verifies the resume contract is structurally satisfiable; verifies no system behaviour.

---

## Standing limitations across all entries

```
Never exercised:  payment · production boundary · power-loss durability (fsync)
Never verified:   that the specification is correct
                  that a factory accepts the spec pack
                  that a real payment succeeds
                  that state survives a process restart
                  screen-reader behaviour · colour contrast · Core Web Vitals
```

Any claim beyond these bounds is unsupported by anything recorded here.
