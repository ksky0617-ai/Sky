/**
 * The states a page enters when something is not there.
 *
 * ## Why two kinds, not one
 *
 * Five blocks on this site used the same `.state` box for two different
 * meanings: "no field measurements have been recorded" (a fact about the world)
 * and "this is a pre-order, payment is taken when you order" (an explanation of
 * how something works). A reader cannot tell those apart when they look
 * identical, which means the site's gaps are indistinguishable from its
 * footnotes — and this site has a lot of gaps, deliberately.
 *
 * So an **absence** and a **note** are different components with different
 * shapes, and the absence one is the constrained one.
 *
 * ## An absence must say what is missing and why
 *
 * `awaiting()` takes both, and takes them separately, because "no measurements
 * yet" tells a reader nothing they could act on or trust. What makes an empty
 * state honest rather than apologetic is naming the thing that has to happen —
 * and this project's gaps all have real, nameable causes: no garment has been
 * made, no river has been measured, no legal entity exists.
 *
 * ## What it must never do
 *
 * Estimate. There is no `when` parameter and no way to add one without editing
 * this file, because "coming soon" and "expected in spring" are the two most
 * common lies on an unfinished site and both would violate 02 §7's honesty
 * block. When something is genuinely scheduled it will have a date from a real
 * commitment, and that is a different component nobody has needed yet.
 */

import { escapeHtml } from './markdown.ts';
import { renderReservedSlot } from './media.ts';

/**
 * Something that does not exist yet, with the reason it does not.
 *
 * @param subject what is absent, as a noun phrase — "field measurements"
 * @param because why, in the site's own voice — never an estimate of when
 */
export function awaiting(subject: string, because: string): string {
  return (
    '<div class="state state-awaiting" role="note">' +
    `<p><strong>${escapeHtml(subject)}</strong> ${escapeHtml(because)}</p>` +
    '</div>'
  );
}

/**
 * An explanation. Not an absence — this is how something works, and it is
 * true now.
 */
export function note(html: string): string {
  return `<div class="state state-note">${html}</div>`;
}

/**
 * Where a product photograph would go.
 *
 * GATE-005. The container is real and reserves its space, so the layout is the
 * layout the photograph will land in rather than one that shifts when it
 * arrives — but it holds no picture, because no garment has been made and a
 * generated or stock stand-in would be a depiction of a product that does not
 * exist (02 §7).
 *
 * The ratio is 4:5, which is the portrait crop a garment is shot in. That is a
 * layout decision, not a claim about a photograph.
 */
export function absentPhotography(subject: string): string {
  // Delegates to the media contract rather than assembling its own markup.
  // This block is the ONE place on the site that stands in for a photograph,
  // and while it built its own figure here it was the one figure outside the
  // photography rules entirely — it shipped with no provenance at all until a
  // browser check read `data-provenance` off every figure and found this one
  // unlabelled. A rule that does not reach the space held for the thing it
  // governs is not a rule.
  return renderReservedSlot({
    subject,
    // The portrait crop a garment is shot in. A layout decision, not a claim
    // about a photograph.
    ratio: [4, 5],
    disclosure: `No photograph of ${subject} exists yet.`,
    note: 'It will be taken when the garment is made — nothing here stands in for it.',
  });
}
