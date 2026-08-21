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
 * The palette is the CONSTRUCTION palette: pure neutrals, no hue. The brand
 * palette is deliberately undetermined pending field measurement, and a hued
 * placeholder would become a decision by familiarity. Every such value carries
 * the `--construct-` prefix so a production build can refuse to ship it.
 */

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
  ${CONSTRUCTION_PREFIX}500: #8A8A8A;
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
     measured Forest Atlas branching ratio that does not yet exist. */
  --text-sm: 0.8rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.563rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;

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
  --content-tertiary: var(${CONSTRUCTION_PREFIX}500);
  --line-hairline: var(${CONSTRUCTION_PREFIX}700);
  --line-rule: var(${CONSTRUCTION_PREFIX}300);
  --state-focus: var(${CONSTRUCTION_PREFIX}000);
}
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
nav.primary ul { display: flex; flex-wrap: wrap; gap: var(--space-5); list-style: none; margin: 0; padding: 0; }
nav.primary a {
  font-size: var(--text-sm); letter-spacing: 0.14em; text-transform: uppercase;
  text-decoration: none; color: var(--content-secondary);
  padding-bottom: 2px; border-bottom: 1px solid transparent;
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
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
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
.index-title { font-size: var(--text-lg); border-bottom: 1px solid transparent; display: inline-block; }
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

footer.site {
  border-top: 1px solid var(--line-hairline);
  padding: var(--space-7) 0 var(--space-9);
  color: var(--content-tertiary); font-size: var(--text-sm);
}
footer.site ul { display: flex; flex-wrap: wrap; gap: var(--space-5); list-style: none; margin: 0 0 var(--space-4); padding: 0; }
footer.site a { color: var(--content-secondary); }

/* Motion — 04_MOTION_LANGUAGE.md.

   Content is NOT animated in. An earlier build staggered main's children with
   animation-fill-mode: both, which holds each element at opacity 0 through
   its delay; a browser screenshot showed a near-blank page. That gates
   comprehension behind motion, which ADR-001's C1 resolution forbids and which
   the motion gate rejects at question 6: no motion may be load-bearing.

   What remains is motion.light on the page ground only — the body's own
   background and colour, never the text on it. It cannot hide content because
   it does not stage content. */

/* 04_MOTION_LANGUAGE.md §6 — reduced motion removes movement without removing
   information. Since nothing is staged behind animation, there is nothing here
   whose removal could hide content. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
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
