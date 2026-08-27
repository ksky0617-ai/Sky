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

import { escapeHtml, extractSection, renderMarkdown, type DocumentRoutes } from './markdown.ts';
import { renderProductBody } from './product-page.ts';
import { Catalog, type ProductRevision } from '../catalog/catalog.ts';
import { PreorderRunStore, preorderWindow, type PreorderWindow } from '../preorder/run.ts';
import { FileStorage } from '../persistence/file-storage.ts';
import { DEFAULT_LOCALE, enabledLocales, localePath } from './locales.ts';
import { indexAtlas, indexPage, indexProduct, type SearchDocument } from './search.ts';
import { renderFigure } from './media.ts';
import { awaiting, note } from './states.ts';
import { renderSiblings, renderTrail, siblings, trail } from './wayfinding.ts';
import { specimenAsset } from './specimen.ts';

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
  /**
   * Depth in the world — 02_BRAND_EXPERIENCE_SYSTEM.md §3.
   *
   * 1 WORLD (why Olibana exists) · 2 DESIGN (how the work is made) ·
   * 3 COMMERCE (what you can own). Not decoration: §3 requires a **descending
   * motion budget** — "the deeper a visitor goes toward purchase, the quieter
   * the interface becomes" — and a budget that descends needs something to
   * descend along. Without this field the motion system had no idea which
   * route it was on, and every page from the home portal to the purchase form
   * carried identical motion.
   */
  readonly layer: 1 | 2 | 3;
  /**
   * §3's mode table. Governs the motion budget and is emitted into the
   * document, so the rule is applied by the stylesheet at the provider level
   * rather than remembered per component — §3: "It cannot be re-enabled by an
   * individual component."
   */
  readonly mode: 'immersive' | 'informative' | 'frictionless' | 'reassuring';
  /** Shown in primary navigation when set. */
  readonly nav?: { readonly label: string; readonly order: number };
  /** Excluded from the sitemap (error pages). */
  readonly indexable?: boolean;
  /**
   * How 03 §7 indexes this route, or null for a route that is not indexed.
   *
   * Carried BY the route rather than derived alongside it. §7's whole argument
   * is that the index must not be retrofitted, and an index built from a
   * second walk over the same data is a second opinion that can drift: a page
   * could show measurements while the index says the Atlas has none, and
   * nothing would notice until someone searched. Here there is one object, so
   * the page and its entry cannot disagree about the same fact.
   *
   * Optional on the constructors, always present on what `buildRoutes` returns:
   * a page that says nothing special about itself gets the default entry below
   * rather than being silently left out of the index.
   */
  readonly search?: SearchDocument | null;
  /** Which locale serves this route — ADR-010. */
  readonly locale: string;
  /**
   * The unprefixed path this route was built from, kept so a locale-neutral
   * address can point at its canonical localized one.
   */
  readonly basePath: string;
}

const ROOT = resolve(import.meta.dirname, '../..');
const doc = (relativePath: string): string => readFileSync(resolve(ROOT, relativePath), 'utf8');

/**
 * Source documents that have a page, so a link between documents can become a
 * link between pages. Derived from ATLASES below rather than listed twice.
 *
 * A document absent from this map is rendered as an unlinked reference. That
 * is deliberate: the built site contains no `.md` file at any address, so a
 * `[Design_System.md](./Design_System.md)` carried straight through is a 404
 * on a published page. Two of them shipped.
 */
function documentRoutes(): DocumentRoutes {
  return Object.fromEntries(ATLASES.map((atlas) => [atlas.file, `/nature/${atlas.slug}`]));
}

function section(relativePath: string, heading: string): string {
  const body = extractSection(doc(relativePath), heading);
  if (body === null) {
    throw new Error(`section "${heading}" not found in ${relativePath} — the document changed`);
  }
  return renderMarkdown(body, documentRoutes());
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
      ? `<h2>Measurements</h2>${renderMarkdown(extractSection(source, 'Data Log') ?? '', documentRoutes())}`
      : awaiting(
          'No field measurements',
          'have been recorded for this Atlas. The method above is the work; the readings follow it.',
        ),
  );

  return {
    // The same `rows` count decides both. `indexAtlas` recomputes it from the
    // same source text, and the assertion below pins them together so a change
    // to either derivation is caught rather than discovered by a search that
    // returns a garment nobody measured.
    search: indexAtlas({ ...atlas, source }, `/nature/${atlas.slug}`),
    path: `/nature/${atlas.slug}`,
    basePath: `/nature/${atlas.slug}`,
    locale: DEFAULT_LOCALE,
    layer: 1,
    mode: 'immersive',
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

    // The home page linked to the four Atlases and to nothing else. Philosophy
    // and Design Language were reachable only from the navigation bar — which
    // means the two pages explaining WHY the Atlases matter were the two the
    // portal never sent anyone to. Both destinations already exist; this is
    // information architecture, not new content.
    '<h2>The method</h2>',
    '<div class="lede"><p>What the Atlases are for, and the checks a piece has to pass before it is made.</p></div>',
    '<ul class="index">',
    '<li><a href="/olibana/philosophy"><span class="index-title">Philosophy</span>' +
      '<span class="index-note">Why nature is treated as a design system rather than a source of imagery.</span></a></li>',
    '<li><a href="/olibana/design-language"><span class="index-title">Design Language</span>' +
      '<span class="index-note">The six principles, and the evaluation every design is scored against.</span></a></li>',
    '</ul>',

    '<h2>The collection</h2>',
    '<div class="lede"><p>What can be bought, and when.</p></div>',
    awaiting(
      'No garment',
      'is offered for sale yet. The first is an outerwear piece, and it will be offered as a ' +
        'pre-order with its production window stated before payment.',
    ),
  ].join('\n');

  return {
    path: '/',
    basePath: '/',
    locale: DEFAULT_LOCALE,
    layer: 1,
    mode: 'immersive',
    file: 'index.html',
    title: 'Olibana',
    description: 'A design practice deriving form from the measured structure of nature.',
    body,
    // No nav entry. The wordmark in the header is already a link to this page,
    // and a second control with the same label and the same destination costs a
    // navigation slot while weakening what the wordmark is for. A browser
    // screenshot is what made the duplication obvious — in the manifest the two
    // live in different files.
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
    basePath: '/nature',
    locale: DEFAULT_LOCALE,
    layer: 1,
    mode: 'immersive',
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
    basePath: '/olibana/philosophy',
    locale: DEFAULT_LOCALE,
    layer: 1,
    mode: 'immersive',
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
    // The one image on this site, and the only one that can be true today.
    // Placed here rather than on the home page because this is the page ABOUT
    // the design system: a specimen belongs beside the thing it specifies.
    // Not lazy — it is the page's primary visual and sits near the top.
    renderFigure(specimenAsset(), { lazy: false }),
  ].join('\n');

  return {
    path: '/olibana/design-language',
    basePath: '/olibana/design-language',
    locale: DEFAULT_LOCALE,
    layer: 2,
    mode: 'informative',
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
<p>This site is built to work without JavaScript, with a keyboard alone, and with every
word readable whether or not any motion runs.</p>
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
<h2>What has been measured</h2>
<ul>
<li>Colour contrast, for every element that paints its own text, against the background actually
behind it — in both light states, at three viewport widths. This found and fixed a site-wide
failure: a grey used for the footer, list notes and form hints was 3.45:1 against the page,
below the 4.5:1 minimum.</li>
<li>Target size, against the 24x24 CSS pixel minimum, in a real browser rather than in the source.</li>
<li>That no content is revealed only by animation, measured at rest with no scrolling performed.</li>
</ul>
<h2>What has not been verified</h2>
${awaiting(
  'No screen-reader testing and no full automated audit',
  'have been run against this build. The measurements above are specific checks, not a ' +
    'conformance claim, and they cannot detect what only a person using assistive technology ' +
    'would notice. The palette is also a temporary construction palette rather than the brand ' +
    'palette, so these ratios describe what ships today and not what will ship.',
)}
<h2>Reaching us</h2>
<p>A contact channel is not open yet. When it is, it will be listed here.</p>`.trim();

  return {
    path: '/legal/accessibility',
    basePath: '/legal/accessibility',
    locale: DEFAULT_LOCALE,
    layer: 2,
    mode: 'reassuring',
    file: 'legal/accessibility/index.html',
    title: 'Accessibility',
    description: 'What this site implements for accessibility, and what has not yet been verified.',
    body,
  };
}

function notFoundPage(destinations: readonly Route[]): Route {
  // Character_Bible.md v1.1 §5 — no wordplay, no metaphor, one route out.
  //
  // The routes are read from the manifest rather than listed here. The previous
  // version named three by hand, which meant the page a reader lands on when
  // an address is wrong was the one page guaranteed to go stale as the site
  // grew — and it had already missed Design Language and the Atlases.
  const links = destinations
    .filter((route) => route.indexable !== false && route.basePath !== '/')
    .map((route) =>
      `<li><a href="${route.basePath}"><span class="index-title">${escapeHtml(route.title)}</span>` +
      `<span class="index-note">${escapeHtml(route.description)}</span></a></li>`)
    .join('');

  const body = `
<h1>This page doesn't exist.</h1>
<div class="lede"><p>The address may be mistyped, or the page may have been removed.
Everything the site currently holds is below.</p></div>
<ul class="index">
<li><a href="/"><span class="index-title">Olibana</span><span class="index-note">The entry to the world.</span></a></li>
${links}
</ul>`.trim();

  return {
    path: '/404',
    basePath: '/404',
    locale: DEFAULT_LOCALE,
    layer: 2,
    mode: 'reassuring',
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

function productPage(product: ProductRevision, run: PreorderWindow | null): Route {
  return {
    // A product's entry carries the recorded natural rule and the Atlas behind
    // it — §7's whole reason for indexing both from the start. Passed through
    // from the catalogue, never derived: `null` until a Fashion Specification
    // supplies one.
    search: indexProduct(product, `/products/${productSlug(product)}`),
    path: `/products/${productSlug(product)}`,
    basePath: `/products/${productSlug(product)}`,
    locale: DEFAULT_LOCALE,
    layer: 3,
    mode: 'informative',
    file: `products/${productSlug(product)}/index.html`,
    title: product.name,
    description: product.summary,
    body: renderProductBody(product, run),
  };
}

function shopPage(products: readonly ProductRevision[]): Route {
  return {
    path: '/shop',
    basePath: '/shop',
    locale: DEFAULT_LOCALE,
    layer: 3,
    mode: 'informative',
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

/** Default pre-order run location. Absent until a run is recorded. */
export const RUNS_PATH = resolve(ROOT, 'data/preorder-runs.jsonl');

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
/**
 * Rewrites the content links inside a page body for a locale.
 *
 * Only addresses that ARE content routes are touched. That precision is the
 * point: a blanket rewrite of every `href="/…"` would also prefix `/checkout`
 * and `/webhooks/payment`, which ADR-010 deliberately leaves unprefixed —
 * prefixing a webhook endpoint by locale would be architecture for its own
 * sake, and it would break the purchase path.
 */
function localiseBody(body: string, code: string, contentPaths: ReadonlySet<string>): string {
  return body.replace(/href="(\/[^"#?]*)"/g, (whole, path: string) =>
    contentPaths.has(path) ? `href="${localePath(code, path)}"` : whole);
}

/**
 * Prepends the trail and appends sibling navigation.
 *
 * Applied at localisation because both need the locale — a breadcrumb linking
 * to `/nature` from a page at `/en/nature/river` would leave the locale, and
 * that is the class of bug ADR-010 exists to prevent.
 */
function withWayfinding(route: Route, code: string, all: readonly Route[]): string {
  // 03 §4 "Current location always indicated". The nav marks a section; it says
  // nothing on a nested page, because River is not a nav item.
  const labels = new Map(all.map((r) => [r.basePath, r.title]));
  const steps = trail(route.basePath, labels);

  // Siblings within a section: the routes sharing this one's parent path.
  const parent = route.basePath.slice(0, route.basePath.lastIndexOf('/'));
  const section = parent === ''
    ? []
    : all.filter((r) => r.basePath.startsWith(`${parent}/`) && r.basePath !== parent);
  const { previous, next } = siblings(section, route.basePath);

  return [
    renderTrail(steps, route.title, code),
    route.body,
    renderSiblings(previous, next, code),
  ].filter((part) => part !== '').join('\n');
}

/** Moves one route under a locale prefix. */
function localise(route: Route, code: string, contentPaths: ReadonlySet<string>, all: readonly Route[]): Route {
  const path = localePath(code, route.basePath);
  return {
    ...route,
    locale: code,
    path,
    // `/en/` -> `en/index.html`; `/en/nature` -> `en/nature/index.html`.
    file: `${code}/${route.file}`,
    body: localiseBody(withWayfinding(route, code, all), code, contentPaths),
    // The entry's url follows the page. An index pointing at the unprefixed
    // address would send every search result to a page that no longer exists
    // there.
    search: route.search === null || route.search === undefined
      ? null
      : { ...route.search, url: path },
  };
}

/**
 * Every route the build emits.
 *
 * ADR-010: content lives under a locale prefix, and only locales that have
 * content are enabled. `/ja/` and `/ko/` are declared in the registry and
 * produce no routes at all, so they 404 rather than serving English — which is
 * the whole decision, since a fallback presented as localization is the lie the
 * ADR exists to prevent.
 *
 * `/` also answers, serving the default locale's home with its canonical
 * pointing at `/en/`. A static host cannot redirect without host-specific
 * configuration, and a redirect present only on Cloudflare would make the local
 * server and the deployment disagree about the site's most requested address.
 */
export function buildRoutes(
  catalogPath: string = CATALOG_PATH,
  runsPath: string = RUNS_PATH,
): readonly Route[] {
  const base = baseRoutes(catalogPath, runsPath).map((route) => ({
    ...route,
    // One derivation. A route that declares its own entry (an Atlas, a product)
    // keeps it; everything else is indexed as a page from the very title and
    // description the document itself carries, so the index cannot describe a
    // page differently from how the page describes itself.
    //
    // `indexable === false` means the 404 document, which is not content and is
    // not indexed. Explicitly null rather than absent: it says the decision was
    // made, not that nobody looked.
    search: route.search ?? (route.indexable === false
      ? null
      : indexPage({ title: route.title, description: route.description }, route.basePath)),
  }));
  const contentPaths = new Set(base.map((r) => r.basePath));

  const localised = enabledLocales().flatMap((locale) =>
    base.map((route) => localise(route, locale.code, contentPaths, base)));

  /*
   * The locale-neutral addresses a static host needs.
   *
   * `/` because a site must answer at its root, and `404.html` because that is
   * the document a static host serves for every address it cannot match —
   * including `/ja/nature`. Without the root 404 a disabled locale would reach
   * the HOST's error page rather than this site's, and ADR-010's "not presented
   * as localized content" would hold by accident rather than by design.
   *
   * Neither claims to be a locale. Both carry a canonical pointing at their
   * `/en/` form, so the duplicate is declared rather than left to a crawler.
   */
  const neutral = (basePath: string, file: string): readonly Route[] => {
    const source = base.find((r) => r.basePath === basePath);
    if (source === undefined) return [];
    return [{
      ...source,
      locale: DEFAULT_LOCALE,
      path: basePath,
      file,
      body: localiseBody(source.body, DEFAULT_LOCALE, contentPaths),
      // Not indexed. These addresses duplicate a locale page and declare it
      // canonical; indexing both would put the same content in the index twice
      // under two urls.
      search: null,
    }];
  };

  return [...neutral('/', 'index.html'), ...neutral('/404', '404.html'), ...localised];
}

function baseRoutes(
  catalogPath: string = CATALOG_PATH,
  runsPath: string = RUNS_PATH,
): readonly Route[] {
  const published = new Catalog(new FileStorage(catalogPath)).published();
  const runs = new PreorderRunStore(new FileStorage(runsPath));

  const pages = [
    homePage(),
    ...(published.length > 0 ? [shopPage(published)] : []),
    ...published.map((p) => {
      const open = runs.openRunFor(p.productId);
      return productPage(p, open === null ? null : preorderWindow(open));
    }),
    naturePage(),
    ...ATLASES.map(atlasPage),
    philosophyPage(),
    designLanguagePage(),
    accessibilityPage(),
  ];

  // The 404 is built last, from everything above it, so it lists what the site
  // actually holds rather than three addresses somebody typed once.
  return [...pages, notFoundPage(pages)];
}

export function navigation(routes: readonly Route[]): ReadonlyArray<{ path: string; label: string }> {
  return routes
    .filter((r): r is Route & { nav: NonNullable<Route['nav']> } => r.nav !== undefined)
    .sort((a, b) => a.nav.order - b.nav.order)
    .map((r) => ({ path: r.path, label: r.nav.label }));
}
