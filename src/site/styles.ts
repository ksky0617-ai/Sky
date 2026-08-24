/**
 * Design tokens and stylesheet.
 *
 * Every value here is transcribed from an existing decision. Nothing is
 * invented:
 *   docs/website/05_VISUAL_SYSTEM.md  — construction palette, spacing scale,
 *                                       breakpoints, radius, z-index, roles,
 *                                       light-state architecture
 *   docs/website/04_MOTION_LANGUAGE.md — five motion tokens with durations,
 *                                       easings, and reduced-motion mapping
 *   docs/website/02_BRAND_EXPERIENCE_SYSTEM.md — silence budget
 *
 * NOTE FOR EDITORS: the stylesheet below is a template literal. A backtick
 * anywhere inside it — including inside a CSS comment, which is where it keeps
 * happening — terminates the string and the build fails to parse. Quote code
 * in these comments with "double quotes". The failure is loud and immediate,
 * so nothing broken can ship; it just costs a rebuild each time.
 *
 * The palette is the CONSTRUCTION palette: pure neutrals, no hue. The brand
 * palette is deliberately undetermined pending field measurement, and a hued
 * placeholder would become a decision by familiarity. Every such value carries
 * the `--construct-` prefix so a production build can refuse to ship it.
 */

/**
 * The type scale, as CSS custom properties.
 *
 * Exported because the router renders its own pages — the confirmation, the
 * sandbox, every refusal — with inline styles and deliberately no link to the
 * built stylesheet, so they render even if the build never ran. That
 * independence had a cost nobody had measured: those pages were using
 * `1.4rem`, which is 22.4px and is on no scale and reachable by no token. 02
 * §2 makes Precision a lint rule, not a preference.
 *
 * Emitting the same declarations into both keeps one source. Restating the
 * numbers in the router would be a second scale that agrees today.
 */
export const TYPE_SCALE = `
  --text-sm: 0.8rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.563rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;`;

/** Marks values that must not reach production. See assertNoConstructionPalette. */
export const CONSTRUCTION_PREFIX = '--construct-';

export const stylesheet = `
/* ---------------------------------------------------------------------------
   Construction palette — 05_VISUAL_SYSTEM.md §2
   Hueless on purpose. Grey cannot be mistaken for a brand decision.
   --------------------------------------------------------------------------- */
:root {
  ${CONSTRUCTION_PREFIX}000: #FFFFFF;
  ${CONSTRUCTION_PREFIX}100: #F2F2F2;
  ${CONSTRUCTION_PREFIX}300: #C9C9C9;
  /* #8A8A8A until a browser measured it: 3.45:1 on 000, which is below WCAG
     1.4.3 AA and was carrying the footer, every .index-note and every form
     hint on every page since the site was built. Nothing looked, because the
     only contrast measurement in this project was the purchase button.
     #767676 is 4.54:1 on white — the darkest step that still reads as a third
     level of hierarchy rather than collapsing into --content-secondary. */
  ${CONSTRUCTION_PREFIX}500: #767676;
  ${CONSTRUCTION_PREFIX}700: #4A4A4A;
  ${CONSTRUCTION_PREFIX}900: #1A1A1A;

  /* Semantic roles — 05_VISUAL_SYSTEM.md §3.
     Components reference roles only, never raw values, so the palette swap
     touches this block alone. Daylight is fully defined on bare :root so a
     missing state degrades to a complete palette. */
  --surface-base: var(${CONSTRUCTION_PREFIX}000);
  --surface-raised: var(${CONSTRUCTION_PREFIX}100);
  --surface-inverse: var(${CONSTRUCTION_PREFIX}900);
  --content-primary: var(${CONSTRUCTION_PREFIX}900);
  --content-secondary: var(${CONSTRUCTION_PREFIX}700);
  --content-tertiary: var(${CONSTRUCTION_PREFIX}500);
  --content-inverse: var(${CONSTRUCTION_PREFIX}000);
  --line-hairline: var(${CONSTRUCTION_PREFIX}300);
  --line-default: var(${CONSTRUCTION_PREFIX}500);
  --line-rule: var(${CONSTRUCTION_PREFIX}700);
  --state-focus: var(${CONSTRUCTION_PREFIX}900);

  /* Spacing — 8px base with a 4px half step. Arbitrary values are not used. */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 24px;  --space-6: 32px;  --space-7: 40px;  --space-8: 56px;
  --space-9: 72px;  --space-10: 96px; --space-11: 128px; --space-12: 160px;
  --space-13: 224px; --space-14: 320px;

  /* Type scale. Ratio is provisional (1.25); the intended ratio derives from a
     measured Forest Atlas branching ratio that does not yet exist.
     Defined in TYPE_SCALE above, so the router's own pages use the same one.

     WRITTEN EXCEPTION — 02_BRAND_EXPERIENCE_SYSTEM.md §5, "distinct type sizes
     per viewport <= 3". Measured, not estimated: home renders 6 distinct sizes
     at desktop, philosophy 5, product 4, the commerce and confirmation
     surfaces 2. §5 says exceeding a threshold "requires a written reason in
     the pull request — which is the point: it makes density a deliberate act
     rather than an accumulation", so this is the reason.

     Home carries a page title, a hero statement, section headings, body copy
     and captions. Collapsing those to three sizes would not produce hierarchy
     through space; it would produce five roles sharing three sizes, and the
     distinctions would have to be recovered with weight or colour — both of
     which §5 constrains harder than scale. One reduction WAS made on the
     evidence: the Atlas index title dropped to the body size and now takes its
     hierarchy from the rule above it and the space around it, which is §5's
     own stated rationale.

     What is enforced instead, and enforced as a hard failure, is 02 §2's
     Precision rule: every rendered size must be ON this scale. That caught two
     values this threshold never would have — "code" at 0.9em resolving to
     14.4px, and the router's own pages at 1.4rem resolving to 22.4px, neither
     reachable by any custom property in this system. The count is reported by
     scripts/visual-check.mjs on every run so the exception stays visible. */
${TYPE_SCALE}

  /* Radius — 05_VISUAL_SYSTEM.md §6. Sharp by default: Olibana's edges are
     carved, not softened (Stone_Atlas.md). */
  --radius-none: 0;
  --radius-sm: 2px;

  --z-base: 0; --z-sticky: 100; --z-overlay: 300; --z-modal: 500; --z-focus: 9999;

  --measure: 68ch;
  --container: 1280px;

  /* Motion — 04_MOTION_LANGUAGE.md §3. Values are provisional: derived from
     qualitative Atlas observation, not from field measurement. */
  --motion-river-duration: 1100ms;
  --motion-river-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  --motion-stone-duration: 1600ms;
  --motion-stone-ease: cubic-bezier(0.65, 0, 0.35, 1);
  --motion-forest-duration: 400ms;
  --motion-forest-stagger: 100ms;
  --motion-forest-ease: cubic-bezier(0.33, 1, 0.68, 1);
  --motion-light-duration: 2000ms;
  --motion-light-ease: ease-in-out;
  --motion-wind-duration: 5000ms;
  --motion-wind-ease: ease-in-out;
  /* §3.5 caps wind at 8px: above that it is decoration, and decoration that
     never stops is the opposite of silence. */
  --motion-wind-distance: 8px;
  /* §3.3 caps the forest reveal at 12px. */
  --motion-forest-distance: 12px;
  /* Stone travels further because it carries more weight (§3.2). Still a
     transform: it moves the element, it never hides it. */
  --motion-stone-distance: 16px;
}

/* Light state — 05_VISUAL_SYSTEM.md §4. Only role values are redefined.
   Media elements are excluded at stylesheet level: altering a garment's
   apparent colour would corrupt a purchase decision. */
:root[data-light="dawn"] {
  --surface-base: var(${CONSTRUCTION_PREFIX}100);
  --content-primary: var(${CONSTRUCTION_PREFIX}700);
  --line-hairline: var(${CONSTRUCTION_PREFIX}300);
}
:root[data-light="dusk"] {
  --surface-base: var(${CONSTRUCTION_PREFIX}900);
  --surface-raised: var(${CONSTRUCTION_PREFIX}700);
  --content-primary: var(${CONSTRUCTION_PREFIX}000);
  --content-secondary: var(${CONSTRUCTION_PREFIX}300);
  /* 500 on 900 is 3.9:1 — below AA. Tertiary rises to 300 on a dark ground,
     the same choice the prefers-color-scheme block makes. §4 constraint 3:
     a state that fails is corrected, not shipped with an exception. */
  --content-tertiary: var(${CONSTRUCTION_PREFIX}300);
  --line-hairline: var(${CONSTRUCTION_PREFIX}700);
  --line-rule: var(${CONSTRUCTION_PREFIX}300);
  --state-focus: var(${CONSTRUCTION_PREFIX}000);
}
/* The state was defined and never entered. Nothing in this system set
   data-light — no page, no build step, no script (there is none) — so every
   visitor got daylight and the dusk palette was unreachable code that had
   never been rendered, let alone contrast-checked.

   §4's own code sketch gives the activation: prefers-color-scheme, unless a
   reader has explicitly chosen daylight. That is the honest trigger. A
   time-of-day default would mean guessing at a clock the server does not have
   and the page cannot read without JavaScript, and §4.2's "dawn/daylight/dusk"
   is a description of the palettes, not a licence to invent the reader's local
   time.

   Constraint 4 — "manual override persists" — is NOT implemented, and cannot
   be while the site ships no JavaScript: persisting a choice needs somewhere to
   put it. The [data-light] hooks above are the seam, so an override is one
   attribute away the day a runtime exists. Recorded rather than quietly
   dropped. */
@media (prefers-color-scheme: dark) {
  :root:not([data-light="daylight"]) {
    --surface-base: var(${CONSTRUCTION_PREFIX}900);
    --surface-raised: var(${CONSTRUCTION_PREFIX}700);
    --content-primary: var(${CONSTRUCTION_PREFIX}000);
    --content-secondary: var(${CONSTRUCTION_PREFIX}300);
    --content-tertiary: var(${CONSTRUCTION_PREFIX}300);
    --content-inverse: var(${CONSTRUCTION_PREFIX}900);
    --surface-inverse: var(${CONSTRUCTION_PREFIX}000);
    --line-hairline: var(${CONSTRUCTION_PREFIX}700);
    --line-default: var(${CONSTRUCTION_PREFIX}500);
    --line-rule: var(${CONSTRUCTION_PREFIX}300);
    --state-focus: var(${CONSTRUCTION_PREFIX}000);
  }
}

/* §4 constraint 2 — product photography is never affected, excluded at the
   stylesheet level rather than by convention. Altering a garment's apparent
   colour would corrupt a purchase decision. */
img, video, picture, figure { --surface-base: initial; }

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--surface-base);
  color: var(--content-primary);
  font-family: ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: var(--text-base);
  line-height: 1.65;
  transition: background-color var(--motion-light-duration) var(--motion-light-ease),
              color var(--motion-light-duration) var(--motion-light-ease);
}

/* Focus is never removed and never subtle. */
:focus-visible {
  outline: 2px solid var(--state-focus);
  outline-offset: 3px;
  z-index: var(--z-focus);
}

.skip-link {
  position: absolute; left: var(--space-4); top: calc(-1 * var(--space-12));
  background: var(--surface-base); color: var(--content-primary);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line-default);
  z-index: var(--z-focus);
}
.skip-link:focus { top: var(--space-4); }

.shell { max-width: var(--container); margin: 0 auto; padding: 0 var(--space-5); }

header.site {
  display: flex; flex-wrap: wrap; gap: var(--space-5);
  align-items: baseline; justify-content: space-between;
  padding: var(--space-5) 0;
  border-bottom: 1px solid var(--line-hairline);
}
header.site a.wordmark {
  font-size: var(--text-lg); letter-spacing: 0.22em;
  text-transform: uppercase; text-decoration: none; color: var(--content-primary);
}
/* The negative vertical margin cancels the padding below, so the links grow a
   hit area without the header growing a gap. Measured, not assumed: see the
   target-size note on the anchors themselves. */
nav.primary ul {
  display: flex; flex-wrap: wrap; gap: var(--space-5);
  list-style: none; margin: -6px 0; padding: 0;
}
nav.primary a {
  font-size: var(--text-sm); letter-spacing: 0.14em; text-transform: uppercase;
  text-decoration: none; color: var(--content-secondary);
  /* WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA: 24x24 CSS px. These are list
     links, not links inside a sentence, so the inline exception does not apply
     to them. At the type size the brand uses they render 18px tall, which a
     browser measurement caught and no unit test could have — nothing in the
     suite looked at geometry. The padding buys the height; the border sits at
     the text, not at the edge of the hit area. */
  display: inline-block; padding: 6px 0 4px;
  border-bottom: 1px solid transparent;
}
nav.primary a:hover, nav.primary a[aria-current="page"] {
  color: var(--content-primary); border-bottom-color: var(--line-rule);
}

main { display: block; padding: var(--space-9) 0 var(--space-12); }

/* Silence budget — 02_BRAND_EXPERIENCE_SYSTEM.md §5.
   Generous negative space is the medium, not the leftover. */
.lede { max-width: var(--measure); }
.statement {
  max-width: 34ch; font-size: var(--text-2xl); line-height: 1.3;
  margin: var(--space-11) 0; text-wrap: balance;
}
h1 { font-size: var(--text-3xl); line-height: 1.15; margin: 0 0 var(--space-6); font-weight: 500; text-wrap: balance; }
h2 { font-size: var(--text-xl); margin: var(--space-10) 0 var(--space-4); font-weight: 500; }
h3 { font-size: var(--text-lg); margin: var(--space-8) 0 var(--space-3); font-weight: 500; }
p, ul, ol { max-width: var(--measure); }
p { margin: 0 0 var(--space-4); }
a { color: var(--content-primary); text-underline-offset: 0.2em; }
hr { border: 0; border-top: 1px solid var(--line-hairline); margin: var(--space-9) 0; }
blockquote {
  margin: var(--space-6) 0; padding-left: var(--space-5);
  border-left: 1px solid var(--line-rule); color: var(--content-secondary);
}
/* 0.9em until it was measured: it produced 14.4px, a size on no scale and
   reachable by no token. 02 §2 makes Precision enforceable — "No arbitrary
   values. Spacing, duration, and type sizes come from the scale or they do not
   ship" — and a relative value that resolves off the scale is an arbitrary
   value wearing a ratio. */
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--text-sm); }
pre {
  background: var(--surface-raised); padding: var(--space-4);
  overflow-x: auto; border-radius: var(--radius-none);
}
.table-scroll { overflow-x: auto; margin: var(--space-5) 0; }
table { border-collapse: collapse; width: 100%; font-size: var(--text-sm); }
th, td { text-align: left; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--line-hairline); vertical-align: top; }
th { font-weight: 500; color: var(--content-secondary); }

.index { list-style: none; padding: 0; max-width: none; }
.index li { border-top: 1px solid var(--line-hairline); }
.index a { display: block; padding: var(--space-5) 0; text-decoration: none; }
.index a:hover .index-title { border-bottom-color: var(--line-rule); }
/* §5: "Distinct type sizes per viewport <= 3 — hierarchy through space, not
   through scale variety." Measured, one page was using all six steps of the
   scale at once. This title drops to the body size and lets the rule above it,
   the padding around it and the underline carry the hierarchy, which is what
   §5's rationale actually asks for. The remaining count is recorded as a
   written exception rather than hidden — see the note below. */
.index-title { font-size: var(--text-base); border-bottom: 1px solid transparent; display: inline-block; }
.index-note { display: block; color: var(--content-secondary); font-size: var(--text-sm); margin-top: var(--space-2); max-width: var(--measure); }

dl.facts {
  display: grid; grid-template-columns: max-content 1fr;
  gap: var(--space-3) var(--space-6);
  max-width: var(--measure); margin: var(--space-6) 0;
}
dl.facts dt { color: var(--content-secondary); font-size: var(--text-sm); }
dl.facts dd { margin: 0; }
@media (max-width: 640px) {
  dl.facts { grid-template-columns: 1fr; gap: var(--space-1) 0; }
  dl.facts dd { margin-bottom: var(--space-3); }
}

.state {
  border: 1px solid var(--line-hairline); padding: var(--space-6);
  margin: var(--space-6) 0; max-width: var(--measure); color: var(--content-secondary);
}
.state p:last-child { margin-bottom: 0; }

/* Purchase form — 02_BRAND_EXPERIENCE_SYSTEM.md: the decision layer.

   No JavaScript. It is an HTML form, so it works before any script would have
   loaded and keeps working if none ever does. The controls inherit the page's
   type and rules rather than the browser's defaults, because a native select
   next to this typography reads as a different site.

   Touch targets are 44px minimum (WCAG 2.5.8), which is a floor ADR-001 places
   outside the tradeable set, not a preference. */
form.order { max-width: var(--measure); margin: var(--space-6) 0; }
form.order .field { margin-bottom: var(--space-5); }
form.order label {
  display: block; margin-bottom: var(--space-2);
  color: var(--content-secondary); font-size: var(--text-sm);
  letter-spacing: 0.08em; text-transform: uppercase;
}
form.order select,
form.order input {
  width: 100%; min-height: 44px; box-sizing: border-box;
  padding: var(--space-3);
  font: inherit; font-size: var(--text-base); color: var(--content-primary);
  background: transparent; border: 1px solid var(--line-hairline); border-radius: 0;
}
form.order .hint {
  display: block; margin-top: var(--space-2);
  color: var(--content-tertiary); font-size: var(--text-sm);
}
form.order button {
  min-height: 48px; width: 100%; padding: var(--space-3) var(--space-6);
  font: inherit; font-size: var(--text-sm);
  letter-spacing: 0.14em; text-transform: uppercase;
  /* content-inverse against surface-inverse. An earlier version of this rule
     said var(--surface-page), which is not a token in this system: the
     undefined variable fell back to the inherited colour, and the label
     rendered #1A1A1A on #1A1A1A — a 1:1 contrast ratio on the one control that
     completes a purchase. Every unit test passed. A screenshot caught it. */
  color: var(--content-inverse); background: var(--surface-inverse);
  border: 1px solid var(--surface-inverse); border-radius: 0; cursor: pointer;
}
form.order button:hover { background: var(--content-secondary); border-color: var(--content-secondary); }
@media (min-width: 641px) {
  /* Wide enough to sit inline: the field row reads as one decision. */
  form.order .row { display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-5); }
  form.order .row .field { margin-bottom: var(--space-5); }
  form.order button { width: auto; min-width: 16rem; }
}

footer.site {
  border-top: 1px solid var(--line-hairline);
  padding: var(--space-7) 0 var(--space-9);
  color: var(--content-tertiary); font-size: var(--text-sm);
}
footer.site ul {
  display: flex; flex-wrap: wrap; gap: var(--space-5);
  list-style: none; margin: -5px 0 calc(var(--space-4) - 5px); padding: 0;
}
/* Same floor as the primary navigation, for the same reason: these render 15px
   tall at the footer's type size. */
footer.site a { color: var(--content-secondary); display: inline-block; padding: 5px 0; }

/* ---------------------------------------------------------------------------
   Motion — 04_MOTION_LANGUAGE.md §3 (tokens), §6 (reduced motion), §9 (layers)

   ## The rule that makes this safe

   An earlier build staggered main's children with animation-delay and
   animation-fill-mode: both. Fill-mode "both" holds an element at the FIRST
   keyframe throughout its delay, so a browser screenshot showed a near-blank
   page. Motion had become load-bearing, which the motion gate rejects at
   question 6. The reaction then was to remove all reveal motion, which
   answered question 6 by having no motion at all.

   Neither is the specification. §8 is: Tier 1 is CSS scroll-driven animation,
   compositor-run, 0 KB JS, and "unsupported -> static final state, site fully
   functional". That is achievable under one invariant, held by every rule
   below:

     The RESTING style of every element is its FINAL style. Reveal motion moves
     FROM a hidden state TO the resting state, and exists only inside the
     @supports block. If the animation never runs — old browser, reduced
     motion, inactive timeline — the page is already correct.

   The second half of the old defect is gone for a structural reason, not a
   careful one: **there is no animation-delay anywhere here.** With a "view()"
   timeline the stagger is POSITIONAL — each element's progress is its own
   position in the viewport — so §3.3's stagger emerges from the layout that
   already encodes the hierarchy, rather than from a timer that can strand an
   element at opacity 0. That is closer to what §3.3 actually asks for ("the
   stagger IS the meaning — it renders hierarchy visible") than a fixed 100ms
   ever was.

   "findLoadBearingMotion" below enforces both halves mechanically, and
   "scripts/visual-check.mjs" measures the resting opacity of every text
   element in a real browser, because a static check cannot see an inactive
   timeline and a screenshot can.
   --------------------------------------------------------------------------- */

/* motion.forest — §3.3. Hierarchical, sequential, opacity + <=12px translateY.
   Used for list and grid entry, and for nested content. */
@keyframes forest-enter {
  from { transform: translateY(var(--motion-forest-distance)); }
  to   { transform: translateY(0); }
}

/* motion.stone — §3.2. Heavy to start, mass-bearing, deliberate.

   §3.2 names clip-path as the axis. It is NOT used, and the reason is measured
   rather than preferred: a clip-path reveal hides the clipped part of the
   element, and a browser run showed exactly that — headings and list items
   below the fold sitting at opacity 0 and clipped to nothing until scrolled
   to. §7 Q6 and §10 both reject that outright ("No content is revealed only by
   animation"), and the gate outranks the axis suggestion. What carries stone's
   character is its easing — the slow onset, §3.2's own "stone resists before
   it moves" — not the property being animated. So the axis is translate and
   scale, which move an element without ever hiding it. */
@keyframes stone-enter {
  from { transform: translateY(var(--motion-stone-distance)) scale(0.985); }
  to   { transform: translateY(0) scale(1); }
}

/* motion.river — §3.1. Continuous, inertial. Scroll-linked rather than
   triggered: the rule is drawn by the scroll itself, so the movement decays
   with the gesture instead of being cut. */
@keyframes river-draw {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* motion.wind — §3.5. The ONLY looping motion permitted anywhere, capped at
   8px, hero surface only, removed entirely under reduced motion. */
@keyframes wind-drift {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(calc(-1 * var(--motion-wind-distance))); }
  100% { transform: translateY(0); }
}

/* Every reveal is gated twice: on support for the scroll-driven timeline, and
   on the reader not having asked for less motion. Longhands only — the
   "animation" shorthand resets animation-timeline, which would silently turn
   these into time-based animations and reintroduce the exact defect above. */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {

    /* §9 section entry: stone.
       "main > h2" only — direct children, so a heading inside a lede is not
       caught. The lede itself is deliberately absent from every rule here:
       §8 makes the first painted frame static and non-negotiable, and the lede
       is the top-of-page content and the likely LCP element. Nothing above the
       fold moves. */
    [data-layer="1"] main > h2,
    [data-layer="2"] main > h2 {
      /* Scaling from the centre moves a full-width block's left edge inward,
         so a heading drifts off the text column while it settles and lands
         back on it. A full-page screenshot caught it mid-flight. The left edge
         is the one a reader measures alignment against, so it is the one that
         stays still. */
      transform-origin: left center;
      animation-name: stone-enter;
      animation-fill-mode: both;
      animation-duration: var(--motion-stone-duration);
      animation-timing-function: var(--motion-stone-ease);
      animation-timeline: view();
      animation-range: entry 0% cover 20%;
    }

    /* §9 list and grid entry: forest. The stagger is the vertical offset
       between siblings, not a delay. */
    [data-layer="1"] .index li,
    [data-layer="2"] .index li,
    /* Layer 3 reveals the detail list as ONE block, not one animation per row.
       04 §9 gives Product "forest (detail reveal) only — Minimal"; per-row it
       measured 10 concurrent animations against Layer 1's 9, so the budget rose
       toward the purchase instead of falling. A measurements table with more
       rows would have raised it further. */
    [data-layer="3"] dl.facts,
    [data-layer="1"] .state,
    [data-layer="2"] .state {
      animation-name: forest-enter;
      animation-fill-mode: both;
      animation-duration: var(--motion-forest-duration);
      animation-timing-function: var(--motion-forest-ease);
      animation-timeline: view();
      animation-range: entry 0% cover 15%;
    }

    /* §9 river, scroll-linked. A rule is a section division; drawing it with
       the scroll makes the division felt rather than announced. transform-origin
       left so it draws in the reading direction. */
    [data-layer="1"] hr,
    [data-layer="2"] hr {
      transform-origin: left center;
      animation-name: river-draw;
      animation-fill-mode: both;
      animation-duration: var(--motion-river-duration);
      animation-timing-function: var(--motion-river-ease);
      animation-timeline: view();
      animation-range: entry 20% cover 35%;
    }

    /* §3.5 wind — hero micro-movement only. Time-based by definition (it is a
       loop, not a reveal), which is safe because it animates a resting element
       that is already visible: the keyframes start and end at translateY(0). */
    [data-layer="1"] main > .statement {
      animation-name: stone-enter, wind-drift;
      animation-fill-mode: both, none;
      animation-duration: var(--motion-stone-duration), var(--motion-wind-duration);
      animation-timing-function: var(--motion-stone-ease), var(--motion-wind-ease);
      animation-timeline: view(), auto;
      animation-range: entry 0% cover 20%, normal;
      animation-iteration-count: 1, infinite;
    }
  }
}

/* ---------------------------------------------------------------------------
   The descending motion budget — 02_BRAND_EXPERIENCE_SYSTEM.md §3

   "Brand experience must never obstruct the user, and the purchase experience
   must never destroy the brand experience", implemented as a budget that falls
   as the visitor approaches a purchase. §3 calls this the persona rather than a
   compromise: a confident brand stops performing once the visitor has decided
   to buy.

   Every rule above is scoped to the layers §3 permits it on, so the budget is a
   property of the selectors rather than a convention someone maintains:

     Layer 1  WORLD      stone on headings · forest on lists · river on rules ·
                         wind on the statement                        — full
     Layer 2  DESIGN     stone · forest · river, no wind          — moderate
     Layer 3  COMMERCE   forest on the product's own detail list only — minimal

   §3's Frictionless mode is "effectively zero", and the checkout, sandbox and
   confirmation pages reach it structurally: the router renders them with their
   own inline styles and never links this file, so there is no rule to disable.
   The declaration below is the belt to that braces — if those pages ever adopt
   the site shell, the budget is already enforced rather than newly forgotten.

   The reveal rules DO NOT cascade down: a Layer 3 page carries fewer selectors,
   not the same selectors with smaller values. "scripts/visual-check.mjs" counts
   the animations actually running per route and fails unless the count is
   non-increasing from Layer 1 to Layer 3 — which is what §8's "motion budget
   provably decreases" asks for, made literal. */
[data-mode="frictionless"] *,
[data-mode="frictionless"] *::before,
[data-mode="frictionless"] *::after {
  animation-name: none !important;
}

/* §6 — reduced motion removes movement without removing information. Nothing
   above is staged behind motion, so removal hides nothing; the reveal rules do
   not apply at all under "reduce", and this clears the light transition and
   any residue. motion.light is retained per §6 but shortened to 300ms, because
   opacity and colour carry no vestibular trigger. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
  body { transition-duration: 300ms; }
}

@media (max-width: 640px) {
  :root { --text-3xl: 1.953rem; --text-2xl: 1.563rem; }
  .shell { padding: 0 var(--space-4); }
  header.site { flex-direction: column; align-items: flex-start; gap: var(--space-4); }
  main { padding: var(--space-7) 0 var(--space-10); }
}
`.trim();

/**
 * Production guard — 05_VISUAL_SYSTEM.md §2.
 * The construction palette must never ship. Returns the offending token names.
 */
export function findConstructionTokens(css: string): string[] {
  const matches = css.matchAll(/--construct-\d{3}/g);
  return [...new Set([...matches].map((m) => m[0]))].sort();
}

/** WCAG 2.1 relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (linear[0] as number) + 0.7152 * (linear[1] as number) + 0.0722 * (linear[2] as number);
}

/**
 * WCAG 2.1 contrast ratio between two `#rrggbb` colours.
 *
 * Here rather than only in the browser check because 05_VISUAL_SYSTEM.md §4
 * constraint 3 requires all three light states to be validated *per state*, and
 * two of the three were unreachable from a browser for the whole life of the
 * project: nothing ever set `data-light`, so dusk had never been rendered. A
 * palette that fails only in a state no test can reach is a palette nobody has
 * checked.
 */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Resolves the semantic roles to concrete `#rrggbb` values for one light state.
 *
 * `state` is a selector fragment: `''` for daylight (bare `:root`), or
 * `[data-light="dusk"]`, or `prefers-color-scheme: dark` for the media block.
 * Roles not redefined by a state fall through to daylight, which is what §4
 * constraint 1 requires — "a missing state must degrade to a complete palette".
 */
export function resolveRoles(css: string, state = ''): Record<string, string> {
  const palette: Record<string, string> = {};
  const roles: Record<string, string> = {};

  for (const { property, value, selector, atRules } of declarations(css)) {
    if (!property.startsWith('--')) continue;
    const inMedia = atRules.some((rule) => rule.includes('prefers-color-scheme: dark'));
    const applies = state === 'prefers-color-scheme: dark'
      ? (selector === ':root' && !inMedia) || inMedia
      : selector === `:root${state}` && !inMedia;
    if (!applies) continue;

    if (/^#[0-9A-Fa-f]{6}$/.test(value)) palette[property] = value;
    else roles[property] = value;
  }

  const resolved: Record<string, string> = {};
  for (const [role, value] of Object.entries(roles)) {
    const reference = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(value)?.[1];
    const colour = reference === undefined ? undefined : palette[reference];
    if (colour !== undefined) resolved[role] = colour;
  }
  return resolved;
}

/** One declaration, with the blocks it sits inside. */
export interface CssDeclaration {
  readonly property: string;
  readonly value: string;
  /** The style rule's selector, or the keyframe offset inside `@keyframes`. */
  readonly selector: string;
  /** Enclosing at-rule preludes, outermost first. */
  readonly atRules: readonly string[];
}

/**
 * Every declaration in a stylesheet, with its enclosing context.
 *
 * A regex over the whole file cannot answer "is this rule inside an @supports
 * block", and that question is the entire safety argument for the motion
 * system. So the source is walked with a brace stack instead. Comments and
 * strings are removed first — an earlier checker in this repository counted a
 * brace inside a regex literal and reported a defect that did not exist, and a
 * checker that cannot parse is worse than none because its output gets
 * trusted.
 */
export function declarations(css: string): CssDeclaration[] {
  // Comments are removed outright. Strings are NOT: only the three characters
  // that drive this parser are masked inside them, so a brace in a string
  // cannot shift the block stack while `[data-layer="1"]` keeps its value.
  // Blanking whole strings — the first version — turned every attribute
  // selector into `[data-layer=""]`, which silently collapsed four
  // layer-scoped rules into one indistinguishable selector. A parser that
  // destroys the thing being checked reports agreement it has not verified.
  const source = css
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/"[^"]*"|'[^']*'/g, (text) => text.replace(/[{};]/g, '_'));
  const found: CssDeclaration[] = [];
  const stack: string[] = [];
  let buffer = '';

  const context = (): { selector: string; atRules: string[] } => {
    const atRules = stack.filter((p) => p.startsWith('@'));
    const selectors = stack.filter((p) => !p.startsWith('@'));
    return { selector: selectors[selectors.length - 1] ?? '', atRules };
  };

  for (const character of source) {
    if (character === '{') {
      stack.push(buffer.trim().replace(/\s+/g, ' '));
      buffer = '';
    } else if (character === '}') {
      // A final declaration needs no trailing semicolon.
      const tail = buffer.trim();
      if (tail.includes(':')) {
        const at = tail.indexOf(':');
        found.push({ property: tail.slice(0, at).trim(), value: tail.slice(at + 1).trim(), ...context() });
      }
      stack.pop();
      buffer = '';
    } else if (character === ';') {
      const declaration = buffer.trim();
      const at = declaration.indexOf(':');
      if (at > 0) {
        found.push({
          property: declaration.slice(0, at).trim(),
          value: declaration.slice(at + 1).trim(),
          ...context(),
        });
      }
      buffer = '';
    } else {
      buffer += character;
    }
  }
  return found;
}

/**
 * Motion that a reader could be stranded behind — 04_MOTION_LANGUAGE.md §7 Q6.
 *
 * This is the check that would have caught the defect that actually shipped: a
 * staggered reveal using `animation-delay` with `animation-fill-mode: both`
 * holds every element at its first keyframe throughout the delay, and the
 * first keyframe of a reveal is invisible. The page rendered nearly blank and
 * every unit test passed.
 *
 * Three offences, each of which makes motion load-bearing:
 *
 *   1. A reveal declared outside `@supports (animation-timeline: ...)`. Without
 *      the guard it runs on time in browsers that support neither, and content
 *      is staged behind a timer.
 *   2. `animation-delay` anywhere. With a positional timeline it is never
 *      needed; with a time-based one it is the defect.
 *   3. A resting rule that hides content (`opacity: 0`, `visibility: hidden`,
 *      or a `clip-path` that clips it away) outside `@keyframes`. The
 *      invariant is that the resting style is the FINAL style.
 */
export function findLoadBearingMotion(css: string): string[] {
  const offences: string[] = [];
  const guarded = (atRules: readonly string[]): boolean =>
    atRules.some((rule) => /^@supports\b.*animation-timeline/.test(rule));
  const inKeyframes = (atRules: readonly string[]): boolean =>
    atRules.some((rule) => /^@(-\w+-)?keyframes\b/.test(rule));

  for (const { property, value, selector, atRules } of declarations(css)) {
    if (property === 'animation-delay') {
      offences.push(`${selector}: animation-delay is never needed and can strand an element`);
      continue;
    }
    if (property === 'animation-name' && !guarded(atRules)) {
      // `none` REMOVES motion. Requiring the support guard on it would demand
      // that a rule which disables animation be conditional on animation being
      // supported, which inverts the rule it enforces — and 02 §3's
      // frictionless kill-switch is exactly such a rule.
      if (value.replace(/!important/, '').trim() !== 'none') {
        offences.push(`${selector}: animation-name "${value}" is not inside @supports (animation-timeline)`);
      }
      continue;
    }
    if (inKeyframes(atRules)) {
      // A keyframe is not exempt, which is the correction a browser run forced.
      // The first version of this check treated @keyframes as "the only place a
      // hidden state belongs", and a real browser then showed headings and list
      // items below the fold held at opacity 0 by the scroll timeline's fill.
      // A reveal that fades or clips content in IS content revealed only by
      // animation, whatever guards surround it. Motion may move an element; it
      // may not hide one.
      //
      // `wind` is exempt from nothing here: it animates transform only.
      const keyframeName = atRules.find((rule) => /^@(-\w+-)?keyframes\b/.test(rule)) ?? '@keyframes';
      if (property === 'opacity' && Number(value) < 1) {
        offences.push(`${keyframeName} ${selector}: opacity ${value} in a keyframe hides content`);
      }
      if (property === 'clip-path' && !/inset\(0(px)?( 0(px)?){0,3}\)/.test(value)) {
        offences.push(`${keyframeName} ${selector}: clip-path "${value}" in a keyframe hides content`);
      }
      if (property === 'visibility' && value === 'hidden') {
        offences.push(`${keyframeName} ${selector}: visibility hidden in a keyframe hides content`);
      }
      continue;
    }
    if (property === 'opacity' && Number(value) === 0) {
      offences.push(`${selector}: opacity 0 in a resting rule hides content`);
    }
    if (property === 'visibility' && value === 'hidden') {
      offences.push(`${selector}: visibility hidden in a resting rule hides content`);
    }
    if (property === 'clip-path' && /\b100%/.test(value)) {
      offences.push(`${selector}: clip-path "${value}" in a resting rule clips content away`);
    }
  }
  return offences;
}

/**
 * The prohibitions in 04_MOTION_LANGUAGE.md §5, made checkable as §5 requires
 * ("Lint the curve set", "Lint").
 *
 * Overshoot is the one worth stating plainly: a cubic-bezier whose control
 * points leave [0,1] on the output axis makes the value pass its target and
 * come back. §1 puts it exactly — "Olibana does not bounce. Overshoot is the
 * motion equivalent of an exclamation mark."
 */
export function findMotionProhibitions(css: string): string[] {
  const offences: string[] = [];

  for (const [, y1, y2] of css.matchAll(/cubic-bezier\(\s*[\d.-]+\s*,\s*([\d.-]+)\s*,\s*[\d.-]+\s*,\s*([\d.-]+)\s*\)/g)) {
    for (const output of [Number(y1), Number(y2)]) {
      if (output > 1 || output < 0) offences.push(`easing overshoots: output control point ${output}`);
    }
  }

  for (const { property, value, selector, atRules } of declarations(css)) {
    // §5: no duration below 300ms. The reduced-motion reset is the one
    // exception and is mandated by §6 — it removes motion rather than hurrying
    // it, which is the thing the floor exists to prevent.
    const reducedMotion = atRules.some((rule) => /prefers-reduced-motion\s*:\s*reduce/.test(rule));
    if ((property === 'animation-duration' || property === 'transition-duration') && !reducedMotion) {
      for (const [, amount, unit] of value.matchAll(/([\d.]+)(ms|s)\b/g)) {
        const ms = unit === 's' ? Number(amount) * 1000 : Number(amount);
        if (ms < 300) offences.push(`${selector}: ${property} ${amount}${unit} is below the 300ms floor`);
      }
    }
    // §5: infinite loops are permitted for motion.wind alone.
    if (property === 'animation-iteration-count' && value.includes('infinite') && !/wind/.test(selector + atRules.join(' '))) {
      const names = declarations(css).find((d) => d.selector === selector && d.property === 'animation-name');
      if (names === undefined || !names.value.includes('wind')) {
        offences.push(`${selector}: infinite iteration outside motion.wind`);
      }
    }
  }

  // §5: no particles, glassmorphism or animated gradients.
  if (/backdrop-filter/.test(css)) offences.push('backdrop-filter: glassmorphism is prohibited');
  for (const { property, value, atRules } of declarations(css)) {
    // An animated gradient is a gradient INSIDE a keyframe — that is what makes
    // it animated. Looking for "gradient" on an `animation-*` property, which
    // was the first version of this check, finds nothing, because that is not
    // how anyone writes one.
    const keyframe = atRules.some((rule) => /^@(-\w+-)?keyframes\b/.test(rule));
    if (keyframe && /gradient\(/.test(value)) {
      offences.push(`animated gradient is prohibited: ${property}`);
    }
  }
  return offences;
}

/**
 * §10: "All motion values come from tokens; no inline durations or easings."
 *
 * Returns every duration or easing written as a literal outside the token
 * block. Without this the tokens are documentation rather than a system: the
 * whole point of §2 marking values `provisional` is that a later measurement
 * changes one line, and it cannot if durations are scattered through the file.
 */
export function findInlineMotionValues(css: string): string[] {
  const offences: string[] = [];
  for (const { property, value, selector, atRules } of declarations(css)) {
    if (!/^(animation|transition)(-(duration|timing-function))?$/.test(property)) continue;
    if (selector === ':root' || property.startsWith('--')) continue;
    // The reduced-motion reset is written as a literal on purpose: it is a
    // removal, not a motion value, and tokenising it would let a token change
    // silently re-enable motion for a reader who asked for none.
    if (atRules.some((rule) => /prefers-reduced-motion\s*:\s*reduce/.test(rule))) continue;
    // Token REFERENCES are removed before the value is examined. Every motion
    // token is named for what it is — `--motion-stone-ease` — so a checker that
    // reads the reference as a literal reports the correctly tokenised code and
    // nothing else. That false positive was the first thing this check
    // produced, which is why it is removed here rather than tolerated.
    const literal = value.replace(/var\(\s*--[a-z0-9-]+\s*\)/g, ' ');
    if (/\d+\s*m?s\b/.test(literal) || /cubic-bezier|\bease(-in|-out|-in-out)?\b|\blinear\b/.test(literal)) {
      offences.push(`${selector}: ${property} "${value}" is a literal, not a token`);
    }
  }
  return offences;
}

/**
 * Every custom property that is *used* but never *defined*.
 *
 * An undefined `var(--x)` does not fail loudly. It falls back to the inherited
 * value, which for a colour is usually the surrounding text colour — so a
 * button whose label was meant to be inverse renders the label in the same
 * colour as its own background. That happened: `var(--surface-page)`, a token
 * that does not exist in this system, put the purchase button's text at a 1:1
 * contrast ratio while every test passed.
 *
 * Fallbacks (`var(--x, black)`) are legitimate and are not reported: the point
 * is a reference with nothing behind it at all.
 */
export function findUndefinedTokens(css: string): string[] {
  // Comments are stripped first: this file explains the bug that motivated the
  // check, and quoting the broken token in prose must not read as using it.
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const defined = new Set([...rules.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = [...rules.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/g)]
    .filter((m) => m[2] === ')')
    .map((m) => m[1]);
  return [...new Set(used.filter((name) => !defined.has(name)))].sort();
}
