/**
 * Where you are, and what is beside you.
 *
 * 03_INFORMATION_ARCHITECTURE.md §4 lists four navigation rules, and one of
 * them — **"Current location always indicated"** — was only half met. The
 * primary navigation carries `aria-current="page"`, so a reader on `/en/nature`
 * knows it. A reader on `/en/nature/river` gets nothing: the nav highlights
 * nothing (River is not a nav item), the page has a title, and there is no
 * indication that this document sits inside anything at all. Every nested route
 * on the site had that gap.
 *
 * ## Both are derived, neither is written
 *
 * The trail comes from the path, and the siblings come from the route manifest.
 * A hand-written breadcrumb is a third copy of the hierarchy — after the URL
 * and the manifest — and it is the copy that goes stale, because nothing breaks
 * when it does.
 */

import { escapeHtml } from './markdown.ts';
import { localePath } from './locales.ts';

/** One step in the trail. */
export interface Step {
  readonly path: string;
  readonly label: string;
}

/**
 * The ancestors of a path, nearest last, excluding the page itself.
 *
 * `/nature/river` yields `[/, /nature]`. A path whose parent is not a real
 * route contributes nothing — `/legal/accessibility` has no `/legal` page, and
 * a breadcrumb linking to one would be a dead link with a plausible name, which
 * is worse than no breadcrumb.
 */
export function trail(
  basePath: string,
  known: ReadonlyMap<string, string>,
): readonly Step[] {
  if (basePath === '/') return [];

  const steps: Step[] = [{ path: '/', label: 'Olibana' }];
  const segments = basePath.split('/').filter((s) => s !== '');

  // Every prefix except the last, which is the page itself.
  for (let depth = 1; depth < segments.length; depth += 1) {
    const path = '/' + segments.slice(0, depth).join('/');
    const label = known.get(path);
    // Skipped rather than invented. `/legal` is a URL segment, not a page.
    if (label !== undefined) steps.push({ path, label });
  }
  return steps;
}

/**
 * Renders the trail for a locale.
 *
 * `aria-label` names it, the current page is NOT a link (it is where you are,
 * and a link to here is a control that does nothing), and the separator is a
 * CSS `::before` rather than a character in the markup so a screen reader
 * announces four items rather than "Olibana slash Nature slash".
 */
export function renderTrail(steps: readonly Step[], current: string, locale: string): string {
  if (steps.length === 0) return '';

  const crumbs = steps
    .map((step) => `<li><a href="${localePath(locale, step.path)}">${escapeHtml(step.label)}</a></li>`)
    .join('');

  return (
    '<nav class="trail" aria-label="Breadcrumb"><ol>' +
    crumbs +
    `<li><span aria-current="page">${escapeHtml(current)}</span></li>` +
    '</ol></nav>'
  );
}

/**
 * The routes either side of this one within its section.
 *
 * A reader who finishes the River Atlas currently has to go back to `/nature`
 * to reach Stone. The four Atlases are an ordered set in the manifest, so the
 * order is read from there rather than restated.
 */
export function siblings<T extends { readonly basePath: string; readonly title: string }>(
  section: readonly T[],
  basePath: string,
): { previous: T | null; next: T | null } {
  const at = section.findIndex((route) => route.basePath === basePath);
  if (at === -1) return { previous: null, next: null };
  return {
    previous: section[at - 1] ?? null,
    next: section[at + 1] ?? null,
  };
}

/**
 * Renders sibling navigation.
 *
 * Deliberately NOT `.index` markup. That class carries the forest reveal on
 * layers 1 and 2, and reusing it here would add two animations to every Atlas
 * page — raising the Layer 1 motion budget for a control that is navigation
 * furniture rather than content arriving. 04 §5's "one primary motion at a
 * time" is the reason, and the budget measurement is what would have caught it.
 */
export function renderSiblings(
  previous: { basePath: string; title: string } | null,
  next: { basePath: string; title: string } | null,
  locale: string,
): string {
  if (previous === null && next === null) return '';

  const link = (route: { basePath: string; title: string }, rel: string, prefix: string): string =>
    `<a class="sibling sibling-${rel}" rel="${rel}" href="${localePath(locale, route.basePath)}">` +
    `<span class="sibling-role">${prefix}</span>` +
    `<span class="sibling-title">${escapeHtml(route.title)}</span></a>`;

  return (
    '<nav class="siblings" aria-label="Within this section">' +
    (previous === null ? '<span></span>' : link(previous, 'prev', 'Previous')) +
    (next === null ? '<span></span>' : link(next, 'next', 'Next')) +
    '</nav>'
  );
}
