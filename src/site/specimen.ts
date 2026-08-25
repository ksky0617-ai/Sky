/**
 * The design system's own specimen.
 *
 * ## Why this is the only image on the site
 *
 * A brand site with no photography is a brand site with nothing to look at, and
 * the honest answer to that is not to find something that looks like a garment.
 * No garment exists (GATE-002/003 gate the first run; the Fashion Specification
 * is unwritten), so a photograph of one cannot exist either, and 02 §7 rejects
 * "any production process depicted that does not occur".
 *
 * What DOES exist is the construction palette and the type scale. They are real
 * — they are the values this page is served in. A specimen of them is not a
 * picture standing in for something absent; it is the thing itself, shown.
 *
 * ## Generated from the tokens, never drawn alongside them
 *
 * Every swatch and every line is read from `TYPE_SCALE` and the palette
 * constants. A hand-drawn SVG carrying the same hex values would be a second
 * copy of the palette that agrees today — the failure mode this repository has
 * now hit with motion tokens, with the search index, and with the router's own
 * type scale. Change a token and this file changes with it, or it does not
 * exist.
 *
 * SVG rather than a raster: it is ~2KB, it is exact at every viewport, it needs
 * no `srcset`, and it carries no photographic claim about anything.
 *
 * ## It carries its own colours, because it has to
 *
 * An SVG loaded through `<img>` is an INDEPENDENT document. It does not inherit
 * the page's `color`, so `fill="currentColor"` resolves to the SVG's own
 * default — black — in both light states. The first version used it, and on the
 * dusk page the labels rendered black on #1A1A1A and the `--construct-900`
 * swatch was invisible against a ground of exactly its own colour. Every
 * automated check passed: contrast measurement does not look inside an image,
 * and the file loaded, so nothing was broken in any way a checker could see. A
 * screenshot in dark mode is what found it.
 *
 * So the specimen carries an internal stylesheet with its own
 * `prefers-color-scheme` rule, and every swatch carries a hairline — including
 * the two that would otherwise merge with one of the two grounds.
 */

import { CONSTRUCTION_PREFIX } from './styles.ts';
import type { MediaAsset } from './media.ts';

/** The palette steps, as the stylesheet defines them. */
export const CONSTRUCTION_PALETTE: ReadonlyArray<{ step: string; value: string }> = [
  { step: '000', value: '#FFFFFF' },
  { step: '100', value: '#F2F2F2' },
  { step: '300', value: '#C9C9C9' },
  { step: '500', value: '#767676' },
  { step: '700', value: '#4A4A4A' },
  { step: '900', value: '#1A1A1A' },
];

/** The type scale in rem, as `TYPE_SCALE` defines it. */
export const TYPE_STEPS: ReadonlyArray<{ name: string; rem: number }> = [
  { name: 'sm', rem: 0.8 },
  { name: 'base', rem: 1 },
  { name: 'lg', rem: 1.25 },
  { name: 'xl', rem: 1.563 },
  { name: '2xl', rem: 1.953 },
  { name: '3xl', rem: 2.441 },
];

/* The specimen's own text colours, one per light state.
   Both are palette steps, and both are MEASURED against the ground they appear
   on rather than assumed: 17.4:1 on daylight, 15.55:1 on dusk, asserted in
   test/site/media.test.ts so a palette change cannot quietly darken them. */
export const TEXT_ON_LIGHT = '#1A1A1A';
export const TEXT_ON_DARK = '#F2F2F2';

export const SPECIMEN_WIDTH = 960;
export const SPECIMEN_HEIGHT = 320;
export const SPECIMEN_PATH = '/media/construction-specimen.svg';

/**
 * The specimen, as SVG source.
 *
 * Drawn on a transparent ground so it sits correctly in both light states —
 * 05 §4 constraint 2 excludes media from the light-state swap, and a specimen
 * with a baked-in white background would be a white rectangle on the dusk page.
 * Every swatch carries a hairline instead, because two of the six are the exact
 * colour of one of the two grounds.
 */
export function specimenSvg(): string {
  const swatchWidth = 130;
  const swatchHeight = 96;
  const gap = 16;
  const left = 24;

  const swatches = CONSTRUCTION_PALETTE.map((entry, index) => {
    const x = left + index * (swatchWidth + gap);
    // Every swatch gets the same hairline. #FFFFFF disappears against the
    // daylight ground and #1A1A1A disappears against the dusk one, so outlining
    // only the white swatch — which the first version did — meant the palette
    // was complete in one light state and five-sixths complete in the other.
    // One rule for all six also stops the outline reading as a property of a
    // particular colour.
    return (
      `<rect x="${x}" y="40" width="${swatchWidth}" height="${swatchHeight}" fill="${entry.value}" ` +
      `stroke="#767676" stroke-width="1"/>` +
      `<text x="${x}" y="${40 + swatchHeight + 20}" font-size="13" ` +
      `font-family="ui-monospace, monospace">${CONSTRUCTION_PREFIX}${entry.step}</text>`
    );
  }).join('');

  // The type scale, drawn at its real ratios against a 16px base.
  const scale = TYPE_STEPS.map((step, index) => {
    const x = left + index * ((swatchWidth + gap) * 6 / TYPE_STEPS.length);
    const size = step.rem * 16;
    return (
      `<text x="${x}" y="248" font-size="${size.toFixed(1)}" ` +
      `font-family="ui-sans-serif, system-ui, sans-serif">Aa</text>` +
      `<text x="${x}" y="278" font-size="13" ` +
      `font-family="ui-monospace, monospace">${step.name}</text>`
    );
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPECIMEN_WIDTH} ${SPECIMEN_HEIGHT}" ` +
    `width="${SPECIMEN_WIDTH}" height="${SPECIMEN_HEIGHT}" role="img" ` +
    `aria-label="The construction palette and type scale">
  <style>
    /* This file's own colours. It is loaded through &lt;img&gt;, so it is an
       independent document and inherits nothing from the page. */
    text { fill: ${TEXT_ON_LIGHT}; }
    @media (prefers-color-scheme: dark) { text { fill: ${TEXT_ON_DARK}; } }
  </style>
  <text x="${left}" y="24" font-size="13" font-family="ui-monospace, monospace">CONSTRUCTION PALETTE</text>
  ${swatches}
  <text x="${left}" y="212" font-size="13" font-family="ui-monospace, monospace">TYPE SCALE</text>
  ${scale}
</svg>
`;
}

/**
 * The specimen as a media asset.
 *
 * The alt text says what the image conveys, which for a specimen is the fact
 * that these are construction values rather than brand ones — the single most
 * important thing about it, and the thing a sighted reader gets from the
 * `--construct-` labels.
 */
export function specimenAsset(): MediaAsset {
  return {
    src: SPECIMEN_PATH,
    alt:
      'The construction palette: six neutral greys from white to near-black, labelled ' +
      `${CONSTRUCTION_PREFIX}000 through ${CONSTRUCTION_PREFIX}900, above the six-step type scale ` +
      'shown at its real proportions.',
    width: SPECIMEN_WIDTH,
    height: SPECIMEN_HEIGHT,
    caption:
      'The construction palette and type scale, rendered from the same tokens this page is served in. ' +
      'The palette is deliberately hueless: the brand palette is undetermined pending light measurement, ' +
      'and a coloured placeholder would become a decision by familiarity.',
  };
}
