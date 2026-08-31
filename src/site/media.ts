/**
 * The media contract.
 *
 * Everything an image on this site must carry, enforced by the type rather than
 * by review: an image without `alt` is inaccessible, and an image without
 * intrinsic dimensions moves the page under the reader while it loads. Neither
 * is optional here, so neither can be forgotten.
 *
 * ## What is deliberately absent
 *
 * **There is no product photography, and none is invented.** No garment has
 * been made, so no garment has been photographed. 02_BRAND_EXPERIENCE_SYSTEM.md
 * §7 puts it in the automatic-rejection list — "No production process depicted
 * that does not occur" — and a generated or stock image standing in for a coat
 * that does not exist is the same class of claim as an invented measurement.
 * Recorded as GATE-005: it needs a garment and a camera, not code.
 *
 * So this module exists with exactly one real caller, not as a system waiting
 * for one. That distinction is not pedantic: motion tokens sat defined and
 * unused for fifteen cycles, and a search index existed that nothing called,
 * and in both cases the gap was invisible precisely because the code looked
 * finished.
 */

import { escapeHtml } from './markdown.ts';

/**
 * What an image IS.
 *
 * The contract below enforced two things — alt text and intrinsic dimensions —
 * and was silent on the one property this brand's honesty actually rests on.
 * An AI-generated garment render and a photograph of a finished coat were the
 * same type, rendered by the same function, into the same markup. Nothing in
 * the system could tell them apart, and nothing could stop the first being
 * published as the second.
 *
 * That is not a hypothetical: 02 §7 puts "any production process depicted that
 * does not occur" in the automatic-rejection list, and the entire reason this
 * site has no product photography is that a stand-in would be a claim about a
 * garment nobody has made. The rule existed in prose and had no representation
 * in the type system, which is exactly the shape of every other gap this
 * repository has found.
 *
 * There is deliberately no default. The most dangerous value is the one that
 * would be assumed when nobody thought about it, so every asset states what it
 * is or it does not render.
 */
export const PROVENANCE = [
  /** A photograph of a real object, taken with a camera. The only kind that may depict a garment as it is. */
  'ACTUAL_PHOTOGRAPH',
  /** A visualization of a design that has not been made. Depicts an intention, not an object. */
  'CONCEPT_RENDER',
  /** Produced by a generative model. Depicts nothing that was observed. */
  'AI_GENERATED',
  /** A diagram, specimen or study of the design system itself. Depicts values, not things. */
  'DESIGN_REFERENCE',
  /** Space held for an asset that does not exist yet. */
  'PLACEHOLDER',
] as const;

export type Provenance = (typeof PROVENANCE)[number];

/** The one kind that depicts something real. Everything else must say so, visibly. */
export const REAL: Provenance = 'ACTUAL_PHOTOGRAPH';

export interface MediaAsset {
  /** Site-absolute path. The build must emit a file at exactly this address. */
  readonly src: string;
  /** What this image is. Required — see PROVENANCE. */
  readonly provenance: Provenance;
  /**
   * The sentence shown to the reader saying what they are looking at.
   *
   * Required for everything that is not a photograph, and forbidden for a
   * photograph — the two states are structurally different rather than
   * differing by whether someone remembered. A caption is not a substitute:
   * a caption says what the image shows, and this says whether it happened.
   */
  readonly disclosure: string | null;
  /**
   * What the image conveys, for a reader who cannot see it.
   *
   * Required, and required to be non-empty. WCAG 1.1.1 permits `alt=""` for a
   * decorative image — this site has none, because an image that conveys
   * nothing is weight with no reason to be downloaded.
   */
  readonly alt: string;
  /** Intrinsic width in CSS pixels. */
  readonly width: number;
  /** Intrinsic height in CSS pixels. */
  readonly height: number;
  /** A caption rendered beneath the image, or null for none. */
  readonly caption: string | null;
}

export class MediaContractViolation extends Error {}

/**
 * Checks an asset before it can be rendered.
 *
 * Throws rather than degrading. A missing `alt` that renders as `alt=""` is
 * worse than a build failure: it ships, it passes an automated scan that only
 * checks the attribute exists, and it reaches a screen-reader user as silence.
 */
export function assertMediaAsset(asset: MediaAsset): void {
  if (!asset.src.startsWith('/')) {
    throw new MediaContractViolation(
      `"${asset.src}" is relative, so where it resolves depends on the page's directory`,
    );
  }
  if (asset.alt.trim() === '') {
    throw new MediaContractViolation(`${asset.src} has no alt text`);
  }
  if (!Number.isInteger(asset.width) || asset.width <= 0 ||
      !Number.isInteger(asset.height) || asset.height <= 0) {
    throw new MediaContractViolation(
      `${asset.src} has no intrinsic dimensions (${asset.width}x${asset.height}) — ` +
        'the page would reflow around it as it loads',
    );
  }

  // Checked at runtime as well as in the type, because an asset can arrive from
  // a record rather than from a literal, and a string that TypeScript never saw
  // is exactly how an unlabelled image would get in.
  if (!(PROVENANCE as readonly string[]).includes(asset.provenance)) {
    throw new MediaContractViolation(
      `${asset.src} declares provenance "${asset.provenance}", which is not one of ` +
        `${PROVENANCE.join(', ')} — an image whose kind is unknown cannot be published`,
    );
  }

  // The asymmetry is the point. A photograph has nothing to disclose; anything
  // else has one thing to disclose and must say it in the page, not in a
  // comment or a data attribute a reader never sees.
  // The one machine-checkable half of "is this really a photograph".
  //
  // A camera does not produce an SVG. It is a drawing format, so a file that
  // claims to be a photograph and is one is a contradiction the build can see,
  // and this site's only image today is exactly that: a generated specimen.
  // A mutation proved the need — flipping the specimen to ACTUAL_PHOTOGRAPH
  // was caught by a unit test and passed the browser check completely, because
  // a declared photograph is exempt from the disclosure rule and nothing looked
  // at whether the claim could be true.
  //
  // KNOWN LIMIT, stated rather than implied: this catches a vector file
  // claiming to be a photograph. A generated RASTER image labelled
  // ACTUAL_PHOTOGRAPH is indistinguishable from a real one to any check in this
  // repository. That boundary is human review, and it is recorded as such
  // rather than covered by a check that would only appear to hold it.
  if (asset.provenance === REAL && /\.svgz?$/i.test(asset.src)) {
    throw new MediaContractViolation(
      `${asset.src} is declared ACTUAL_PHOTOGRAPH and is an SVG — a camera does not produce a ` +
        'vector drawing, so this claim cannot be true',
    );
  }

  if (asset.provenance === REAL) {
    if (asset.disclosure !== null) {
      throw new MediaContractViolation(
        `${asset.src} is a photograph and carries a disclosure — a photograph of a real ` +
          'object has nothing to disclose, and saying otherwise makes the disclosure meaningless ' +
          'where it matters',
      );
    }
  } else if (asset.disclosure === null || asset.disclosure.trim() === '') {
    throw new MediaContractViolation(
      `${asset.src} is ${asset.provenance} and carries no disclosure — an image that is not a ` +
        'photograph must say so where the reader can read it (02 §7)',
    );
  }
}

/**
 * Renders a figure.
 *
 * `width` and `height` are emitted as attributes AND as an `aspect-ratio` in
 * the stylesheet's `figure img` rule, which is what actually reserves the box:
 * the attributes give the browser the ratio before any CSS arrives, and the
 * CSS keeps the ratio while the width is fluid. Together they are why this
 * site's CLS is 0.00 rather than approximately zero.
 *
 * `loading="lazy"` on everything below the first screen and `decoding="async"`
 * everywhere. There is no `fetchpriority="high"` hero image because there is no
 * hero image — see the note at the top.
 */
export function renderFigure(asset: MediaAsset, options: { readonly lazy?: boolean } = {}): string {
  assertMediaAsset(asset);
  const lazy = options.lazy !== false;
  // The disclosure leads the caption, and it is marked so it can be found in
  // the rendered page rather than only in the source. A browser check reads
  // data-provenance off the figure and requires the disclosure to be painted:
  // an honesty rule that lives in a type and not on the screen protects the
  // codebase and not the reader.
  const disclosure = asset.disclosure === null
    ? ''
    : `<strong class="provenance">${escapeHtml(asset.disclosure)}</strong> `;
  const caption = asset.caption === null && asset.disclosure === null
    ? ''
    : `<figcaption>${disclosure}${asset.caption === null ? '' : escapeHtml(asset.caption)}</figcaption>`;

  return (
    `<figure class="media" data-provenance="${asset.provenance}">` +
    `<img src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.alt)}" ` +
    `width="${asset.width}" height="${asset.height}" ` +
    `loading="${lazy ? 'lazy' : 'eager'}" decoding="async">` +
    `${caption}</figure>`
  );
}
