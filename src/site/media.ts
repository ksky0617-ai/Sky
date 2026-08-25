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

export interface MediaAsset {
  /** Site-absolute path. The build must emit a file at exactly this address. */
  readonly src: string;
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
  const caption = asset.caption === null
    ? ''
    : `<figcaption>${escapeHtml(asset.caption)}</figcaption>`;

  return (
    `<figure class="media">` +
    `<img src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.alt)}" ` +
    `width="${asset.width}" height="${asset.height}" ` +
    `loading="${lazy ? 'lazy' : 'eager'}" decoding="async">` +
    `${caption}</figure>`
  );
}
