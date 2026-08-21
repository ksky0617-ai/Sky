/**
 * Route manifest and content mapping.
 *
 * Two rules govern this file, both from existing decisions:
 *
 *  1. docs/website/03_INFORMATION_ARCHITECTURE.md §1 — a route that cannot be
 *     filled with true content is not built. Journal and Contact are therefore
 *     absent: no article and no contact address exist yet. They appear on their
 *     own once their content does, because navigation is generated from this
 *     manifest (03_IA §4).
 *
 *  2. Page copy is READ from the source documents rather than retyped here. A
 *     second copy would drift from the document that governs it.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractSection, renderMarkdown } from './markdown.ts';
import { renderProductBody } from './product-page.ts';
import { Catalog, type ProductRevision } from '../catalog/catalog.ts';

export interface Route {
  /** URL path. */
  readonly path: string;
  /** Output file, relative to the build directory. */
  readonly file: string;
  /** <title> content, without the site suffix. */
  readonly title: string;
  /** Meta description. */
  readonly description: string;
  /** Rendered <main> content. */
  readonly body: string;
  /** Shown in primary navigation when set. */
  readonly nav?: { readonly label: string; readonly order: number };
  /** Excluded from the sitemap (error pages). */
  readonly indexable?: boolean;
}

const ROOT = resolve(import.meta.dirname, '../..');
const doc = (relativePath: string): string => readFileSync(resolve(ROOT, relativePath), 'utf8');

function section(relativePath: string, heading: string): string {
  const body = extractSection(doc(relativePath), heading);
  if (body === null) {
    throw new Error(`section "${heading}" not found in ${relativePath} — the document changed`);
  }
  return renderMarkdown(body);
}

/**
 * An Atlas data log holds a header, a separator, and placeholder rows until
 * field measurement happens. Returns the number of REAL rows.
 * Zero rows means the section is omitted entirely: an empty measurements table
 * would imply work that has not been done.
 */
export function countAtlasDataRows(markdown: string): number {
  const log = extractSection(markdown, 'Data Log');
  if (log === null) return 0;
  return log
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .filter((line) => !/^\s*\|[\s:|-]+\|\s*$/.test(line))
    .slice(1) // drop the header row
    .filter((line) => line.split('|').slice(1, -1).some((cell) => cell.trim() !== ''))
    .length;
}

interface AtlasSpec {
  readonly slug: string;
  readonly file: string;
  readonly title: string;
  readonly description: string;
}

const ATLASES: readonly AtlasSpec[] = [
  { slug: 'river', file: 'River_Atlas.md', title: 'River Atlas', description: 'Flow, curvature and reflection — what is studied, how it is measured, and what it yields.' },
  { slug: 'stone', file: 'Stone_Atlas.md', title: 'Stone Atlas', description: 'Fracture, strata and edge geometry — the surface grammar of Olibana.' },
  { slug: 'forest', file: 'Forest_Atlas.md', title: 'Forest Atlas', description: 'Branching, bark and canopy — hierarchical proportion drawn from growth.' },
  { slug: 'light', file: 'Light_Atlas.md', title: 'Light Atlas', description: 'Time of day, season, shadow and atmosphere — the source of colour and material choice.' },
];

function atlasPage(atlas: AtlasSpec): Route {
  const source = doc(atlas.file);
  const rows = countAtlasDataRows(source);

  const parts = [
    `<h1>${atlas.title}</h1>`,
    `<div class="lede">${section(atlas.file, 'Focus of Study')}</div>`,
    '<h2>Observations</h2>',
    section(atlas.file, 'Observations'),
    '<h2>Design Translation</h2>',
    section(atlas.file, 'Design Translation'),
  ];

  // Measurements appear only when measurements exist.
  parts.push(
    rows > 0
      ? `<h2>Measurements</h2>${renderMarkdown(extractSection(source, 'Data Log') ?? '')}`
      : `<div class="state"><p>No field measurements have been recorded for this Atlas yet. ` +
        `The method above is the work; the readings follow it.</p></div>`,
  );

  return {
    path: `/nature/${atlas.slug}`,
    file: `nature/${atlas.slug}/index.html`,
    title: atlas.title,
    description: atlas.description,
    body: parts.join('\n'),
  };
}

function homePage(): Route {
  // The opening may not gate comprehension (ADR-001, collision C1): the
  // wordmark, statement and navigation are in the document from the first
  // byte. Motion layers over an already-readable page.
  const body = [
    '<h1>Olibana</h1>',
    // Statement text is taken from Brand_Bible.md's brand promise rather than
    // written here. An earlier version restated the opening line of Core
    // Philosophy, which appears immediately below it — the same sentence twice.
    '<p class="statement">A garment should feel inevitable, as if it emerged from the landscape rather than from human whimsy.</p>',
    '<div class="lede">',
    section('README.md', 'Core Philosophy'),
    '</div>',
    '<h2>The Atlases</h2>',
    '<div class="lede"><p>Four studies feed every design decision. Each records what is observed, how it is measured, and what form it yields.</p></div>',
    '<ul class="index">',
    ATLASES.map(
      (a) =>
        `<li><a href="/nature/${a.slug}"><span class="index-title">${a.title}</span>` +
        `<span class="index-note">${a.description}</span></a></li>`,
    ).join(''),
    '</ul>',
    '<h2>The collection</h2>',
    '<div class="state"><p>No garment is offered for sale yet. The first is an outerwear piece, ' +
      'and it will be offered as a pre-order with its production window stated before payment.</p></div>',
  ].join('\n');

  return {
    path: '/',
    file: 'index.html',
    title: 'Olibana',
    description: 'A design practice deriving form from the measured structure of nature.',
    body,
    nav: { label: 'Olibana', order: 1 },
  };
}

function naturePage(): Route {
  const body = [
    '<h1>Nature</h1>',
    '<div class="lede"><p>Each Atlas studies one category of natural phenomena and extracts design rules from it. ' +
      'The method is the asset: what to measure, how to measure it, and what the measurement yields in form.</p></div>',
    '<ul class="index">',
    ATLASES.map(
      (a) =>
        `<li><a href="/nature/${a.slug}"><span class="index-title">${a.title}</span>` +
        `<span class="index-note">${a.description}</span></a></li>`,
    ).join(''),
    '</ul>',
  ].join('\n');

  return {
    path: '/nature',
    file: 'nature/index.html',
    title: 'Nature',
    description: 'Four Atlases — river, stone, forest and light — and the design rules drawn from them.',
    body,
    nav: { label: 'Nature', order: 3 },
  };
}

function philosophyPage(): Route {
  const body = [
    '<h1>Philosophy</h1>',
    `<div class="lede">${section('README.md', 'Project Vision')}</div>`,
    '<h2>Nature as a design system</h2>',
    section('README.md', 'Core Philosophy'),
    '<h2>Design principles</h2>',
    section('README.md', 'Design Principles'),
  ].join('\n');

  return {
    path: '/olibana/philosophy',
    file: 'olibana/philosophy/index.html',
    title: 'Philosophy',
    description: 'Why Olibana derives form from measured natural structure rather than from reference.',
    body,
    nav: { label: 'Philosophy', order: 4 },
  };
}

function designLanguagePage(): Route {
  const body = [
    '<h1>Design Language</h1>',
    '<div class="lede"><p>Design rules are applied, then checked. These are the checks a piece has to pass ' +
      'before it is made.</p></div>',
    '<h2>The language</h2>',
    section('Design_System.md', 'Unified Design Language'),
    '<h2>Evaluation criteria</h2>',
    section('Design_System.md', 'Evaluation Criteria'),
  ].join('\n');

  return {
    path: '/olibana/design-language',
    file: 'olibana/design-language/index.html',
    title: 'Design Language',
    description: 'The rules Olibana designs by, and the criteria every piece is evaluated against.',
    body,
    nav: { label: 'Design Language', order: 5 },
  };
}

function accessibilityPage(): Route {
  // Factual, self-authored, and honest about what has not been tested.
  const body = `
<h1>Accessibility</h1>
<div class="lede">
<p>This site is built to work without JavaScript, without animation, and with a keyboard alone.</p>
</div>
<h2>What is implemented</h2>
<ul>
<li>Semantic HTML with a single main landmark per page and one level-one heading.</li>
<li>A skip link to the main content as the first focusable element.</li>
<li>Visible focus indication that is never removed.</li>
<li><code>prefers-reduced-motion</code> is respected: animation is removed, and no content is revealed only by animation.</li>
<li>Full function with JavaScript disabled — the site ships no JavaScript at all.</li>
<li>Wide tables scroll within their own container so the page never scrolls sideways.</li>
</ul>
<h2>What has not been verified</h2>
<div class="state">
<p>No screen-reader testing, no automated accessibility audit, and no colour-contrast validation
has been run against this build. The palette shown here is a temporary construction palette,
not the brand palette, and its contrast has not been validated.</p>
</div>
<h2>Reaching us</h2>
<p>A contact channel is not open yet. When it is, it will be listed here.</p>`.trim();

  return {
    path: '/legal/accessibility',
    file: 'legal/accessibility/index.html',
    title: 'Accessibility',
    description: 'What this site implements for accessibility, and what has not yet been verified.',
    body,
  };
}

function notFoundPage(): Route {
  // Character_Bible.md v1.1 §5 — no wordplay, no metaphor, one route out.
  const body = `
<h1>This page doesn't exist.</h1>
<div class="lede"><p>The address may be mistyped, or the page may have been removed.</p></div>
<ul class="index">
<li><a href="/"><span class="index-title">Home</span></a></li>
<li><a href="/nature"><span class="index-title">Nature</span><span class="index-note">The four Atlases.</span></a></li>
<li><a href="/olibana/philosophy"><span class="index-title">Philosophy</span></a></li>
</ul>`.trim();

  return {
    path: '/404',
    file: '404.html',
    title: 'Page not found',
    description: 'This page does not exist.',
    body,
    indexable: false,
  };
}

function productSlug(product: ProductRevision): string {
  return product.code.toLowerCase();
}

function productPage(product: ProductRevision): Route {
  return {
    path: `/products/${productSlug(product)}`,
    file: `products/${productSlug(product)}/index.html`,
    title: product.name,
    description: product.summary,
    body: renderProductBody(product),
  };
}

function shopPage(products: readonly ProductRevision[]): Route {
  return {
    path: '/shop',
    file: 'shop/index.html',
    title: 'Shop',
    description: 'Garments currently offered by Olibana.',
    body: [
      '<h1>Shop</h1>',
      '<ul class="index">',
      products
        .map(
          (p) =>
            `<li><a href="/products/${productSlug(p)}"><span class="index-title">${p.name}</span>` +
            `<span class="index-note">${p.summary}</span></a></li>`,
        )
        .join(''),
      '</ul>',
    ].join('\n'),
    nav: { label: 'Shop', order: 2 },
  };
}

/** Default catalogue location. Absent until a product is recorded. */
export const CATALOG_PATH = resolve(ROOT, 'data/catalog.jsonl');

/**
 * Routes that exist because their content exists.
 *
 * Commerce routes are generated from the catalogue, not hand-listed. With an
 * empty catalogue no /shop and no /products/* are emitted — which is the
 * current state, and the reason the mechanism is verified against a temporary
 * catalogue in tests rather than by publishing a product that does not exist.
 *
 * Also absent: /journal (no article written), /contact (no address).
 */
export function buildRoutes(catalogPath: string = CATALOG_PATH): readonly Route[] {
  const published = new Catalog(catalogPath).published();

  return [
    homePage(),
    ...(published.length > 0 ? [shopPage(published)] : []),
    ...published.map(productPage),
    naturePage(),
    ...ATLASES.map(atlasPage),
    philosophyPage(),
    designLanguagePage(),
    accessibilityPage(),
    notFoundPage(),
  ];
}

export function navigation(routes: readonly Route[]): ReadonlyArray<{ path: string; label: string }> {
  return routes
    .filter((r): r is Route & { nav: NonNullable<Route['nav']> } => r.nav !== undefined)
    .sort((a, b) => a.nav.order - b.nav.order)
    .map((r) => ({ path: r.path, label: r.nav.label }));
}
